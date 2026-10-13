use std::fs;
use std::path::PathBuf;

use tauri::Manager;

/// 앱 데이터 폴더의 save.json (진행 저장, 설계안 §12)
fn save_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
  Ok(dir.join("save.json"))
}

#[tauri::command]
fn load_save(app: tauri::AppHandle) -> Result<Option<String>, String> {
  let path = save_path(&app)?;
  match fs::read_to_string(&path) {
    Ok(text) => Ok(Some(text)),
    Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
    Err(e) => Err(e.to_string()),
  }
}

/// 임시 파일에 쓴 뒤 바꿔치기해서, 쓰는 도중에 꺼져도 이전 저장이 남게 한다
#[tauri::command]
fn write_save(app: tauri::AppHandle, data: String) -> Result<(), String> {
  let path = save_path(&app)?;
  if let Some(dir) = path.parent() {
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
  }
  let tmp = path.with_extension("json.tmp");
  fs::write(&tmp, data).map_err(|e| e.to_string())?;
  fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![load_save, write_save])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
