use std::fs;
use std::path::Path;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct FileMetadata {
    pub path: String,
    pub size: u64,
    pub created: Option<String>,
    pub modified: Option<String>,
    pub accessed: Option<String>,
    pub is_readonly: bool,
    pub is_hidden: bool,
    #[cfg(windows)]
    pub permissions: Option<String>,
    #[cfg(not(windows))]
    pub mode: Option<u32>,
}

#[tauri::command]
pub fn get_extended_file_metadata(path: String) -> Result<FileMetadata, String> {
    let file_path = Path::new(&path);

    if !file_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }

    let metadata = fs::metadata(file_path)
        .map_err(|e| format!("Failed to read metadata: {}", e))?;

    let size = metadata.len();
    let is_readonly = metadata.permissions().readonly();

    // Get file times
    let created = metadata.created()
        .ok()
        .map(|t| format_system_time(t));

    let modified = metadata.modified()
        .ok()
        .map(|t| format_system_time(t));

    let accessed = metadata.accessed()
        .ok()
        .map(|t| format_system_time(t));

    // Check if file is hidden
    #[cfg(windows)]
    let is_hidden = {
        use std::os::windows::fs::MetadataExt;
        const FILE_ATTRIBUTE_HIDDEN: u32 = 0x2;
        (metadata.file_attributes() & FILE_ATTRIBUTE_HIDDEN) != 0
    };

    #[cfg(not(windows))]
    let is_hidden = {
        file_path.file_name()
            .and_then(|name| name.to_str())
            .map(|name| name.starts_with('.'))
            .unwrap_or(false)
    };

    #[cfg(windows)]
    let result = FileMetadata {
        path: path.clone(),
        size,
        created,
        modified,
        accessed,
        is_readonly,
        is_hidden,
        permissions: Some(get_windows_permissions(&metadata)),
    };

    #[cfg(not(windows))]
    let result = FileMetadata {
        path: path.clone(),
        size,
        created,
        modified,
        accessed,
        is_readonly,
        is_hidden,
        mode: Some(metadata.permissions().mode()),
    };

    Ok(result)
}

fn format_system_time(time: std::time::SystemTime) -> String {
    use std::time::UNIX_EPOCH;

    let duration = time.duration_since(UNIX_EPOCH)
        .unwrap_or_else(|_| std::time::Duration::from_secs(0));

    let secs = duration.as_secs();
    let datetime = chrono::DateTime::from_timestamp(secs as i64, 0)
        .unwrap_or_else(|| chrono::DateTime::from_timestamp(0, 0).unwrap());

    datetime.format("%Y-%m-%d %H:%M:%S").to_string()
}

#[cfg(windows)]
fn get_windows_permissions(metadata: &fs::Metadata) -> String {
    use std::os::windows::fs::MetadataExt;

    let attrs = metadata.file_attributes();
    let mut permissions = Vec::new();

    const FILE_ATTRIBUTE_READONLY: u32 = 0x1;
    const FILE_ATTRIBUTE_HIDDEN: u32 = 0x2;
    const FILE_ATTRIBUTE_SYSTEM: u32 = 0x4;
    const FILE_ATTRIBUTE_ARCHIVE: u32 = 0x20;
    const FILE_ATTRIBUTE_DIRECTORY: u32 = 0x10;

    if attrs & FILE_ATTRIBUTE_READONLY != 0 {
        permissions.push("R");
    }
    if attrs & FILE_ATTRIBUTE_HIDDEN != 0 {
        permissions.push("H");
    }
    if attrs & FILE_ATTRIBUTE_SYSTEM != 0 {
        permissions.push("S");
    }
    if attrs & FILE_ATTRIBUTE_ARCHIVE != 0 {
        permissions.push("A");
    }
    if attrs & FILE_ATTRIBUTE_DIRECTORY != 0 {
        permissions.push("D");
    }

    permissions.join(", ")
}