use crate::metadata::{self, MetadataResult};

#[tauri::command]
pub fn get_metadata(path: String) -> Result<MetadataResult, String> {
    metadata::read_metadata_from_file(&path)
}

#[tauri::command]
pub fn scrub_metadata(path: String, save_path: String) -> Result<(), String> {
    metadata::strip_metadata_from_file(&path, &save_path)
}
