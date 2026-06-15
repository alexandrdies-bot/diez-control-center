use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
};

use tauri::{AppHandle, Manager};

fn sanitize_file_name(file_name: &str) -> String {
    let sanitized: String = file_name
        .chars()
        .map(|character| match character {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            character if character.is_control() => '_',
            character => character,
        })
        .collect();
    let trimmed = sanitized.trim().trim_matches('.').to_string();

    if trimmed.is_empty() {
        "attachment".to_string()
    } else {
        trimmed
    }
}

fn get_available_download_path(downloads_dir: &Path, file_name: &str) -> PathBuf {
    let file_path = downloads_dir.join(file_name);

    if !file_path.exists() {
        return file_path;
    }

    let path = Path::new(file_name);
    let stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .filter(|value| !value.is_empty())
        .unwrap_or("attachment");
    let extension = path.extension().and_then(|value| value.to_str());

    for index in 1..10_000 {
        let candidate_name = match extension {
            Some(extension) if !extension.is_empty() => {
                format!("{stem}-{index}.{extension}")
            }
            _ => format!("{stem}-{index}"),
        };
        let candidate_path = downloads_dir.join(candidate_name);

        if !candidate_path.exists() {
            return candidate_path;
        }
    }

    downloads_dir.join(format!("{stem}-copy"))
}

#[tauri::command]
fn save_file_to_downloads(
    app_handle: AppHandle,
    filename: String,
    bytes: Vec<u8>,
) -> Result<String, String> {
    let downloads_dir = app_handle
        .path()
        .download_dir()
        .map_err(|error| format!("DOWNLOADS_DIR_UNAVAILABLE: {error}"))?;
    let safe_file_name = sanitize_file_name(&filename);
    let file_path = get_available_download_path(&downloads_dir, &safe_file_name);

    fs::write(&file_path, bytes).map_err(|error| format!("DOWNLOADS_WRITE_FAILED: {error}"))?;

    Ok(file_path.to_string_lossy().into_owned())
}

#[tauri::command]
fn open_file_location(path: String) -> Result<(), String> {
    if path.trim().is_empty() {
        return Err("EMPTY_PATH".to_string());
    }

    let file_path = PathBuf::from(path);

    if !file_path.exists() {
        return Err("FILE_NOT_FOUND".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(format!("/select,{}", file_path.to_string_lossy()))
            .spawn()
            .map_err(|error| format!("OPEN_FILE_LOCATION_FAILED: {error}"))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-R")
            .arg(&file_path)
            .spawn()
            .map_err(|error| format!("OPEN_FILE_LOCATION_FAILED: {error}"))?;
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let folder_path = file_path
            .parent()
            .ok_or_else(|| "PARENT_DIR_UNAVAILABLE".to_string())?;

        Command::new("xdg-open")
            .arg(folder_path)
            .spawn()
            .map_err(|error| format!("OPEN_FILE_LOCATION_FAILED: {error}"))?;
    }

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            open_file_location,
            save_file_to_downloads
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
