// 첫 실행 모델 다운로드 (설계안 §12): GitHub 릴리스의 분할 GGUF를 이어받기로 받고 체크섬을 확인한다.
// 받을 파일 목록과 체크섬은 models.json에 있고 앱에 같이 들어간다.
use std::fs::{self, File, OpenOptions};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

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
          have += len_of(&dir.join(format!("{}.part", f.name))).min(f.size);
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

  let mut before = 0u64;
  for f in &spec.files {
    let path = dir.join(&f.name);
    if len_of(&path) == f.size {
      before += f.size;
      continue;
    }
    let part = dir.join(format!("{}.part", f.name));
    let mut have = len_of(&part);
    if have > f.size {
      have = 0;
    }
    if have < f.size {
      let url = format!("{}/{}", release, f.name);
      let mut req = client.get(&url);
      if have > 0 {
        req = req.header(reqwest::header::RANGE, format!("bytes={have}-"));
      }
      let mut res = req.send().map_err(|e| e.to_string())?;
      if !res.status().is_success() {
        return Err(format!("다운로드 실패 ({}): {}", res.status(), f.name));
      }
      // 서버가 이어받기를 받아 주지 않으면 처음부터
      if have > 0 && res.status() != reqwest::StatusCode::PARTIAL_CONTENT {
        have = 0;
      }
      let mut out = OpenOptions::new()
        .create(true)
        .write(true)
        .append(have > 0)
        .truncate(have == 0)
        .open(&part)
        .map_err(|e| e.to_string())?;
      let mut buf = vec![0u8; 1 << 16];
      let mut last = Instant::now();
      loop {
        if cancel.load(Ordering::SeqCst) {
          return Err("cancelled".into());
        }
        let n = res.read(&mut buf).map_err(|e| e.to_string())?;
        if n == 0 {
          break;
        }
        out.write_all(&buf[..n]).map_err(|e| e.to_string())?;
        have += n as u64;
        if last.elapsed() >= Duration::from_millis(250) {
          emit(before + have, "download");
          last = Instant::now();
        }
      }
      out.flush().map_err(|e| e.to_string())?;
      if have != f.size {
        return Err(format!("연결이 끊김: {} ({have}/{})", f.name, f.size));
      }
    }

    emit(before + have, "verify");
    if sha256_of(&part)? != f.sha256 {
      let _ = fs::remove_file(&part);
      return Err(format!("체크섬이 다름: {}", f.name));
    }
    fs::rename(&part, &path).map_err(|e| e.to_string())?;
    before += f.size;
  }
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
    let partial = len_of(&part);
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

    // 체크섬이 틀린 조각은 지운다
    fs::write(&part, vec![0u8; f.size as usize]).unwrap();
    fs::remove_file(dir.join(&f.name)).unwrap();
    let r = fetch_model(spec, &release, &dir, &cancel, |_, _| {});
    assert!(r.unwrap_err().starts_with("체크섬"));
    assert!(!part.exists());
    let _ = fs::remove_dir_all(&dir);
  }
}
