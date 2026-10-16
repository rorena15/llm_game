// llama-server 사이드카 (설계안 §4, §12). 배포본의 resources/llama/에 들어 있는 빌드를 띄운다
// (Windows는 Vulkan, macOS는 Metal). GPU가 없거나 GPU로 안 뜨면 화면 쪽이 cpu=true로 다시 띄운다.
use std::fs::File;
use std::net::TcpListener;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use crate::models::first_file;

/// 게임이 비정상으로 꺼져도 llama-server가 남아 VRAM을 잡고 있지 않게, 게임과 수명을 묶는다 (Windows Job Object)
#[cfg(windows)]
mod job {
  use std::os::windows::io::AsRawHandle;
  use std::process::Child;

  use windows_sys::Win32::Foundation::HANDLE;
  use windows_sys::Win32::System::JobObjects::{
    AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation, SetInformationJobObject,
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
  };

  /// 게임 프로세스가 끝나면 OS가 이 핸들을 닫고, 그때 Job 안의 프로세스도 함께 끝난다
  pub struct Job(HANDLE);
  unsafe impl Send for Job {}
  unsafe impl Sync for Job {}

  impl Job {
    pub fn new() -> Option<Job> {
      unsafe {
        let h = CreateJobObjectW(std::ptr::null(), std::ptr::null());
        if h.is_null() {
          return None;
        }
        let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = std::mem::zeroed();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        let ok = SetInformationJobObject(
          h,
          JobObjectExtendedLimitInformation,
          &info as *const _ as *const _,
          std::mem::size_of_val(&info) as u32,
        );
        (ok != 0).then_some(Job(h))
      }
    }

    pub fn assign(&self, child: &Child) {
      unsafe {
        AssignProcessToJobObject(self.0, child.as_raw_handle() as HANDLE);
      }
    }
  }
}

pub struct Server {
  child: Mutex<Option<Child>>,
  #[cfg(windows)]
  job: Option<job::Job>,
}

impl Default for Server {
  fn default() -> Self {
    Server {
      child: Mutex::new(None),
      #[cfg(windows)]
      job: job::Job::new(),
    }
  }
}

impl Server {
  pub fn stop(&self) {
    if let Some(mut child) = self.child.lock().unwrap().take() {
      let _ = child.kill();
      let _ = child.wait();
    }
  }
}

/// 서버마다 새로 만드는 API 키. 다른 프로그램이나 웹페이지가 이 포트로 모델을 쓰지 못하게 한다
fn new_key() -> String {
  use std::collections::hash_map::RandomState;
  use std::hash::{BuildHasher, Hasher};
  (0..2)
    .map(|_| {
      let mut h = RandomState::new().build_hasher();
      h.write_u128(std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos());
      format!("{:016x}", h.finish())
    })
    .collect()
}

#[derive(Serialize)]
pub struct Started {
  port: u16,
  key: String,
}

const EXE: &str = if cfg!(windows) { "llama-server.exe" } else { "llama-server" };

fn exe(app: &AppHandle) -> Result<PathBuf, String> {
  let path = app.path().resource_dir().map_err(|e| e.to_string())?.join("llama").join(EXE);
  if !path.exists() {
    return Err(format!("llama-server가 없음: {}", path.display()));
  }
  // 배포본 리소스로 옮겨지면서 실행 권한이 빠질 수 있다
  #[cfg(unix)]
  {
    use std::os::unix::fs::PermissionsExt;
    let _ = std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o755));
  }
  Ok(path)
}

/// macOS 등에는 Job Object가 없어, 게임이 비정상으로 꺼지면 llama-server가 남을 수 있다.
/// 띄운 서버의 pid를 적어 두고, 다음에 띄울 때 남아 있으면 끈다
#[cfg(unix)]
mod leftover {
  use std::path::Path;
  use std::process::Command;

  fn pid_file(dir: &Path) -> std::path::PathBuf {
    dir.join("llama-server.pid")
  }

  /// 지난번에 띄운 서버가 아직 돌고 있으면 끈다 (이름이 llama-server인 프로세스만)
  pub fn kill(dir: &Path) {
    let Ok(text) = std::fs::read_to_string(pid_file(dir)) else { return };
    let pid = text.trim();
    if pid.is_empty() || !pid.chars().all(|c| c.is_ascii_digit()) {
      return;
    }
    let name = Command::new("ps").args(["-p", pid, "-o", "comm="]).output();
    if matches!(&name, Ok(out) if String::from_utf8_lossy(&out.stdout).contains("llama-server")) {
      let _ = Command::new("kill").arg(pid).status();
    }
    let _ = std::fs::remove_file(pid_file(dir));
  }

  pub fn remember(dir: &Path, pid: u32) {
    let _ = std::fs::write(pid_file(dir), pid.to_string());
  }
}

/// 콘솔 창을 띄우지 않는다
fn command(path: &Path) -> Command {
  #[allow(unused_mut)]
  let mut cmd = Command::new(path);
  #[cfg(windows)]
  {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    cmd.creation_flags(CREATE_NO_WINDOW);
  }
  cmd
}

#[derive(Serialize)]
pub struct Gpu {
  name: String,
  total_mib: u64,
  free_mib: u64,
}

/// "  Vulkan0: NVIDIA GeForce RTX 3060 (12329 MiB, 11560 MiB free)" 꼴의 줄을 읽는다
fn parse_device(line: &str) -> Option<Gpu> {
  let (_, rest) = line.trim().split_once(": ")?;
  let open = rest.rfind(" (")?;
  let name = rest[..open].trim().to_string();
  let nums: Vec<u64> = rest[open + 2..]
    .split(|c: char| !c.is_ascii_digit())
    .filter_map(|s| s.parse().ok())
    .collect();
  match nums.as_slice() {
    [total, free, ..] => Some(Gpu { name, total_mib: *total, free_mib: *free }),
    _ => None,
  }
}

/// 쓸 수 있는 GPU와 VRAM (모델 추천용). Vulkan이 안 되면 빈 목록
#[tauri::command]
pub fn gpu_info(app: AppHandle) -> Result<Vec<Gpu>, String> {
  let out = command(&exe(&app)?).arg("--list-devices").output().map_err(|e| e.to_string())?;
  let text = format!("{}\n{}", String::from_utf8_lossy(&out.stdout), String::from_utf8_lossy(&out.stderr));
  Ok(text.lines().filter(|l| l.contains(" MiB")).filter_map(parse_device).collect())
}

/// 서버를 (다시) 띄우고 포트와 API 키를 돌려준다. 준비됐는지는 화면 쪽이 /v1/models로 확인한다
#[tauri::command]
pub fn start_server(app: AppHandle, server: State<Server>, id: String, cpu: bool) -> Result<Started, String> {
  server.stop();
  let model = first_file(&app, &id)?;
  let port = TcpListener::bind("127.0.0.1:0").and_then(|l| l.local_addr()).map_err(|e| e.to_string())?.port();
  let log_dir = app.path().app_log_dir().map_err(|e| e.to_string())?;
  std::fs::create_dir_all(&log_dir).map_err(|e| e.to_string())?;
  let log = File::create(log_dir.join("llama-server.log")).map_err(|e| e.to_string())?;
  let err_log = log.try_clone().map_err(|e| e.to_string())?;

  let key = new_key();
  let mut cmd = command(&exe(&app)?);
  cmd.arg("-m")
    .arg(&model)
    .args(["--alias", &id, "--host", "127.0.0.1", "--port", &port.to_string(), "-c", "4096"])
    // 모델에 든 jinja 템플릿은 대사 끝에 <|eot_id|>를 남기고 JSON 모드를 깨뜨린다. 내장 llama3 템플릿을 쓴다
    .args(["--no-jinja", "--chat-template", "llama3", "--no-webui", "--api-key", &key])
    .stdin(Stdio::null())
    .stdout(Stdio::from(log))
    .stderr(Stdio::from(err_log));
  if cpu {
    cmd.args(["--device", "none"]);
  }
  #[cfg(unix)]
  leftover::kill(&log_dir);
  let child = cmd.spawn().map_err(|e| e.to_string())?;
  #[cfg(windows)]
  if let Some(job) = &server.job {
    job.assign(&child);
  }
  #[cfg(unix)]
  leftover::remember(&log_dir, child.id());
  *server.child.lock().unwrap() = Some(child);
  Ok(Started { port, key })
}

/// 서버 프로세스가 살아 있나 (띄운 직후 죽으면 Vulkan 실패로 보고 CPU로 다시 띄운다)
#[tauri::command]
pub fn server_alive(server: State<Server>) -> bool {
  match server.child.lock().unwrap().as_mut() {
    Some(child) => matches!(child.try_wait(), Ok(None)),
    None => false,
  }
}

#[cfg(test)]
mod tests {
  use super::parse_device;

  #[test]
  fn reads_device_line() {
    let g = parse_device("  Vulkan0: NVIDIA GeForce RTX 3060 (12329 MiB, 11560 MiB free)").unwrap();
    assert_eq!(g.name, "NVIDIA GeForce RTX 3060");
    assert_eq!((g.total_mib, g.free_mib), (12329, 11560));
    assert!(parse_device("Available devices:").is_none());
  }
}
