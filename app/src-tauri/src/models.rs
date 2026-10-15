// 첫 실행 모델 다운로드 (설계안 §12): GitHub 릴리스의 분할 GGUF를 이어받기로 받고 체크섬을 확인한다.
// 받을 파일 목록과 체크섬은 models.json에 있고 앱에 같이 들어간다.
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Deserialize)]
struct FileSpec {
  name: String,
  size: u64,
  sha256: String,
}

#[derive(Deserialize)]
struct ModelSpec {
  id: String,
  files: Vec<FileSpec>,
}

#[derive(Deserialize)]
struct Manifest {
  release: String,
  models: Vec<ModelSpec>,
}

fn manifest() -> Manifest {
  serde_json::from_str(include_str!("../models.json")).expect("models.json 형식")
}

fn models_dir(app: &AppHandle) -> Result<PathBuf, String> {
  Ok(app.path().app_data_dir().map_err(|e| e.to_string())?.join("models"))
}

fn len_of(path: &Path) -> u64 {
  fs::metadata(path).map(|m| m.len()).unwrap_or(0)
}

/// 다 받은 모델의 첫 조각 경로 (llama-server는 첫 조각만 주면 나머지를 찾는다)
pub fn first_file(app: &AppHandle, id: &str) -> Result<PathBuf, String> {
  let m = manifest();
  let spec = m.models.iter().find(|s| s.id == id).ok_or(format!("모르는 모델: {id}"))?;
  let dir = models_dir(app)?;
  if spec.files.iter().any(|f| len_of(&dir.join(&f.name)) != f.size) {
    return Err(format!("모델을 아직 받지 않음: {id}"));
  }
  Ok(dir.join(&spec.files[0].name))
}

#[derive(Serialize)]
pub struct ModelStatus {
  id: String,
  size: u64,
  have: u64,
  ready: bool,
}

#[tauri::command]
pub fn model_status(app: AppHandle) -> Result<Vec<ModelStatus>, String> {
  let dir = models_dir(&app)?;
  Ok(manifest()
    .models
    .iter()
    .map(|m| {
      let mut have = 0;
      let mut ready = true;
      for f in &m.files {
        if len_of(&dir.join(&f.name)) == f.size {
          have += f.size;
        } else {
          ready = false;
          have += part_have(&dir.join(format!("{}.part", f.name)), f.size);
        }
      }
      ModelStatus { id: m.id.clone(), size: m.files.iter().map(|f| f.size).sum(), have, ready }
    })
    .collect())
}

static CANCEL: AtomicBool = AtomicBool::new(false);
static RUNNING: AtomicBool = AtomicBool::new(false);

#[derive(Clone, Serialize)]
struct Progress<'a> {
  id: &'a str,
  done: u64,
  total: u64,
  /// download · verify
  phase: &'a str,
}

#[tauri::command]
pub fn cancel_download() {
  CANCEL.store(true, Ordering::SeqCst);
}

/// 모델 하나를 받는다. 끝나거나 실패할 때까지 돌아오지 않고, 진행은 model-progress 이벤트로 알린다
#[tauri::command]
pub async fn download_model(app: AppHandle, id: String) -> Result<(), String> {
  if RUNNING.swap(true, Ordering::SeqCst) {
    return Err("이미 받는 중".into());
  }
  CANCEL.store(false, Ordering::SeqCst);
  let result = tauri::async_runtime::spawn_blocking(move || download_blocking(&app, &id))
    .await
    .map_err(|e| e.to_string())
    .and_then(|r| r);
  RUNNING.store(false, Ordering::SeqCst);
  result
}

fn sha256_of(path: &Path) -> Result<String, String> {
  let mut hasher = Sha256::new();
  let mut file = File::open(path).map_err(|e| e.to_string())?;
  let mut buf = vec![0u8; 1 << 20];
  loop {
    let n = file.read(&mut buf).map_err(|e| e.to_string())?;
    if n == 0 {
      break;
    }
    hasher.update(&buf[..n]);
  }
  Ok(hasher.finalize().iter().map(|b| format!("{b:02x}")).collect())
}

/// 개발·QA용: SE_MODEL_RELEASE로 받을 곳을 바꿀 수 있다 (예: 로컬 서버)
fn release_url(m: &Manifest) -> String {
  std::env::var("SE_MODEL_RELEASE").unwrap_or_else(|_| m.release.clone())
}

fn download_blocking(app: &AppHandle, id: &str) -> Result<(), String> {
  let m = manifest();
  let spec = m.models.iter().find(|s| s.id == id).ok_or(format!("모르는 모델: {id}"))?;
  let total: u64 = spec.files.iter().map(|f| f.size).sum();
  fetch_model(spec, &release_url(&m), &models_dir(app)?, &CANCEL, |done, phase| {
    let _ = app.emit("model-progress", Progress { id, done, total, phase });
  })
}

/// 한 조각을 몇 구간으로 나눠 동시에 받나. GitHub는 연결 하나의 속도를 묶어 두므로 여러 연결로 받는다
const CONNS: usize = 4;
const BUF: usize = 1 << 20;
/// 구간별 진행을 이만큼마다 상태 파일에 남긴다 (이어받기용)
const SAVE_EVERY: u64 = 16 << 20;

fn ranges(size: u64) -> Vec<(u64, u64)> {
  let chunk = size.div_ceil(CONNS as u64);
  (0..CONNS as u64).map(|i| (i * chunk, ((i + 1) * chunk).min(size))).collect()
}

fn state_path(part: &Path) -> PathBuf {
  part.with_extension("part.state")
}

/// 받다 만 조각의 구간별 받은 양. 상태 파일이 없거나 맞지 않으면 처음부터
fn read_state(part: &Path, size: u64) -> Vec<u64> {
  let fresh = vec![0; CONNS];
  if len_of(part) != size {
    return fresh;
  }
  let Ok(text) = fs::read_to_string(state_path(part)) else { return fresh };
  let done: Vec<u64> = text.lines().filter_map(|l| l.trim().parse().ok()).collect();
  let rs = ranges(size);
  if done.len() != CONNS || done.iter().zip(&rs).any(|(d, (a, b))| *d > b - a) {
    return fresh;
  }
  done
}

fn write_state(part: &Path, done: &[u64]) {
  let text: String = done.iter().map(|d| format!("{d}\n")).collect();
  let _ = fs::write(state_path(part), text);
}

/// 받다 만 조각에서 이미 받은 양 (진행 표시용)
fn part_have(part: &Path, size: u64) -> u64 {
  read_state(part, size).iter().sum()
}

/// 조각 하나를 구간 CONNS개로 나눠 동시에 받는다. progress에 새로 받은 양을 더해 간다 (이미 받은 양은 부르는 쪽이 넣어 둔다)
fn fetch_file(
  client: &reqwest::blocking::Client,
  url: &str,
  part: &Path,
  size: u64,
  cancel: &AtomicBool,
  progress: &AtomicU64,
) -> Result<(), String> {
  let done = read_state(part, size);
  if done.iter().all(|d| *d == 0) {
    let f = File::create(part).map_err(|e| e.to_string())?;
    f.set_len(size).map_err(|e| e.to_string())?;
    write_state(part, &done);
  }
  let shared = Mutex::new(done);
  let rs = ranges(size);

  std::thread::scope(|scope| {
    let jobs: Vec<_> = rs
      .iter()
      .enumerate()
      .map(|(i, &(start, end))| {
        let shared = &shared;
        scope.spawn(move || -> Result<(), String> {
          let mut have = shared.lock().unwrap()[i];
          if start + have >= end {
            return Ok(());
          }
          let mut res = client
            .get(url)
            .header(reqwest::header::RANGE, format!("bytes={}-{}", start + have, end - 1))
            .send()
            .map_err(|e| e.to_string())?;
          if res.status() != reqwest::StatusCode::PARTIAL_CONTENT {
            return Err(format!("다운로드 실패 ({})", res.status()));
          }
          let mut out = OpenOptions::new().write(true).open(part).map_err(|e| e.to_string())?;
          out.seek(SeekFrom::Start(start + have)).map_err(|e| e.to_string())?;
          let mut buf = vec![0u8; BUF];
          let mut unsaved = 0u64;
          let save = |have: u64| {
            let mut d = shared.lock().unwrap();
            d[i] = have;
            write_state(part, &d);
          };
          let result = loop {
            if cancel.load(Ordering::SeqCst) {
              break Err("cancelled".to_string());
            }
            let n = match res.read(&mut buf) {
              Ok(n) => n,
              Err(e) => break Err(e.to_string()),
            };
            if n == 0 {
              break if start + have == end { Ok(()) } else { Err("연결이 끊김".to_string()) };
            }
            if let Err(e) = out.write_all(&buf[..n]) {
              break Err(e.to_string());
            }
            have += n as u64;
            unsaved += n as u64;
            progress.fetch_add(n as u64, Ordering::SeqCst);
            if unsaved >= SAVE_EVERY {
              let _ = out.flush();
              save(have);
              unsaved = 0;
            }
          };
          let _ = out.flush();
          save(have);
          result
        })
      })
      .collect();
    // 하나라도 실패하면 나머지도 멈추게 한다 (취소와 같은 깃발)
    let mut first_err = None;
    for j in jobs {
      if let Err(e) = j.join().unwrap_or_else(|_| Err("받기 스레드 오류".into())) {
        cancel.store(true, Ordering::SeqCst);
        if first_err.is_none() || first_err.as_deref() == Some("cancelled") {
          first_err = Some(e);
        }
      }
    }
    first_err.map_or(Ok(()), Err)
  })
}

/// 모델의 조각 파일들을 dir에 받는다. 다 받은 조각은 넘어가고, 받다 만 조각(.part)은 이어 받는다
fn fetch_model(
  spec: &ModelSpec,
  release: &str,
  dir: &Path,
  cancel: &AtomicBool,
  emit: impl Fn(u64, &str),
) -> Result<(), String> {
  fs::create_dir_all(dir).map_err(|e| e.to_string())?;
  let total: u64 = spec.files.iter().map(|f| f.size).sum();
  let client = reqwest::blocking::Client::builder()
    .connect_timeout(Duration::from_secs(30))
    .timeout(None)
    .build()
    .map_err(|e| e.to_string())?;

  // 받은 조각의 체크섬 확인은 다음 조각을 받는 동안 옆에서 돌린다 (확인하는 동안 받기가 멈추지 않게)
  std::thread::scope(|scope| {
    let mut checks = Vec::new();
    let mut before = 0u64;
    for f in &spec.files {
      let path = dir.join(&f.name);
      if len_of(&path) == f.size {
        before += f.size;
        continue;
      }
      let part = dir.join(format!("{}.part", f.name));
      let url = format!("{}/{}", release, f.name);
      let progress = AtomicU64::new(part_have(&part, f.size));
      std::thread::scope(|inner| {
        let job = inner.spawn(|| fetch_file(&client, &url, &part, f.size, cancel, &progress));
        while !job.is_finished() {
          emit(before + progress.load(Ordering::SeqCst), "download");
          std::thread::sleep(Duration::from_millis(250));
        }
        job.join().unwrap_or_else(|_| Err("받기 스레드 오류".into()))
      })?;
      let _ = fs::remove_file(state_path(&part));
      checks.push(scope.spawn(move || -> Result<(), String> {
        if sha256_of(&part)? != f.sha256 {
          let _ = fs::remove_file(&part);
          return Err(format!("체크섬이 다름: {}", f.name));
        }
        fs::rename(&part, &path).map_err(|e| e.to_string())
      }));
      before += f.size;
    }
    emit(total, "verify");
    for c in checks {
      c.join().unwrap_or_else(|_| Err("확인 스레드 오류".into()))?;
    }
    Ok::<(), String>(())
  })?;
  emit(total, "download");
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;

  /// 실제로 받아 보는 시험. 로컬 서버를 띄우고 돌린다 (Range를 지원하는 서버여야 이어받기가 시험된다):
  /// SE_TEST_RELEASE=http://127.0.0.1:8099 cargo test fetch_resume -- --ignored
  #[test]
  #[ignore]
  fn fetch_resume() {
    let release = std::env::var("SE_TEST_RELEASE").expect("SE_TEST_RELEASE");
    let m = manifest();
    let spec = m.models.iter().find(|s| s.id == "se-kanana-2.1b").unwrap();
    let f = &spec.files[0];
    let dir = std::env::temp_dir().join("se-fetch-test");
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).unwrap();

    // 처음 받다가 멈춤
    let cancel = AtomicBool::new(false);
    let r = fetch_model(spec, &release, &dir, &cancel, |done, _| {
      if done > 200 * 1024 * 1024 {
        cancel.store(true, Ordering::SeqCst);
      }
    });
    assert_eq!(r, Err("cancelled".into()));
    let part = dir.join(format!("{}.part", f.name));
    let partial = part_have(&part, f.size);
    assert!(partial > 0 && partial < f.size);

    // 이어 받기: 남은 만큼만 받는다
    let cancel = AtomicBool::new(false);
    let first = std::sync::Mutex::new(None);
    fetch_model(spec, &release, &dir, &cancel, |done, _| {
      first.lock().unwrap().get_or_insert(done);
    })
    .unwrap();
    assert!(first.lock().unwrap().unwrap() >= partial, "처음부터 다시 받음");
    assert_eq!(len_of(&dir.join(&f.name)), f.size);
    assert!(!part.exists());

    // 체크섬이 틀린 조각은 지운다 (다 받은 것으로 기록된 0으로 찬 조각)
    fs::write(&part, vec![0u8; f.size as usize]).unwrap();
    write_state(&part, &ranges(f.size).iter().map(|(a, b)| b - a).collect::<Vec<_>>());
    fs::remove_file(dir.join(&f.name)).unwrap();
    let r = fetch_model(spec, &release, &dir, &cancel, |_, _| {});
    assert!(r.unwrap_err().starts_with("체크섬"));
    assert!(!part.exists());
    let _ = fs::remove_dir_all(&dir);
  }

  /// 받기 속도 재기 (8B 전체, 받기와 확인 시간 따로):
  /// SE_TEST_RELEASE=<주소> cargo test --release fetch_speed -- --ignored --nocapture
  #[test]
  #[ignore]
  fn fetch_speed() {
    let release = std::env::var("SE_TEST_RELEASE").expect("SE_TEST_RELEASE");
    let m = manifest();
    let spec = m.models.iter().find(|s| s.id == "se-kanana-8b").unwrap();
    let dir = std::env::temp_dir().join("se-fetch-speed");
    let _ = fs::remove_dir_all(&dir);
    let t0 = std::time::Instant::now();
    let verify_at = Mutex::new(Vec::new());
    fetch_model(spec, &release, &dir, &AtomicBool::new(false), |_, phase| {
      if phase == "verify" {
        verify_at.lock().unwrap().push(t0.elapsed().as_secs_f64());
      }
    })
    .unwrap();
    let total: u64 = spec.files.iter().map(|f| f.size).sum();
    let secs = t0.elapsed().as_secs_f64();
    println!("8B {:.2} GB: 전체 {secs:.1}초 = {:.0} MB/s, verify 시작 시각 {:?}", total as f64 / 1e9, total as f64 / 1e6 / secs, verify_at.lock().unwrap());
    let _ = fs::remove_dir_all(&dir);
  }
}
