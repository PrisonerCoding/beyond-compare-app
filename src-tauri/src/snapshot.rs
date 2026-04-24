use std::fs;
use std::path::Path;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapshotEntry {
    pub path: String,
    pub name: String,
    #[serde(rename = "type")]
    pub entry_type: String,  // "file" or "folder"
    pub size: u64,
    pub modified_time: Option<String>,
    pub hash: Option<String>,
    pub children: Option<Vec<SnapshotEntry>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderSnapshot {
    pub name: String,
    pub path: String,
    pub created_at: String,
    pub entries: Vec<SnapshotEntry>,
    pub total_files: u64,
    pub total_folders: u64,
    pub total_size: u64,
}

#[tauri::command]
pub fn save_folder_snapshot(folder_path: String, output_path: String) -> Result<String, String> {
    let path = Path::new(&folder_path);

    if !path.exists() {
        return Err(format!("Folder does not exist: {}", folder_path));
    }

    if !path.is_dir() {
        return Err(format!("Path is not a folder: {}", folder_path));
    }

    let snapshot = scan_folder_for_snapshot(path)?;
    let json = serde_json::to_string_pretty(&snapshot)
        .map_err(|e| format!("Failed to serialize snapshot: {}", e))?;

    fs::write(&output_path, json)
        .map_err(|e| format!("Failed to write snapshot file: {}", e))?;

    Ok(output_path)
}

#[tauri::command]
pub fn load_folder_snapshot(snapshot_path: String) -> Result<FolderSnapshot, String> {
    let content = fs::read_to_string(&snapshot_path)
        .map_err(|e| format!("Failed to read snapshot file: {}", e))?;

    let snapshot: FolderSnapshot = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse snapshot: {}", e))?;

    Ok(snapshot)
}

fn scan_folder_for_snapshot(path: &Path) -> Result<FolderSnapshot, String> {
    let name = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let entries = scan_directory_entries(path)?;

    let mut total_files = 0;
    let mut total_folders = 0;
    let mut total_size = 0;

    count_entries(&entries, &mut total_files, &mut total_folders, &mut total_size);

    let created_at = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    Ok(FolderSnapshot {
        name,
        path: path.to_string_lossy().to_string(),
        created_at,
        entries,
        total_files,
        total_folders,
        total_size,
    })
}

fn scan_directory_entries(path: &Path) -> Result<Vec<SnapshotEntry>, String> {
    let mut entries = Vec::new();

    let dir_entries = fs::read_dir(path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in dir_entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let entry_path = entry.path();

        let name = entry_path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let metadata = entry.metadata()
            .map_err(|e| format!("Failed to read metadata: {}", e))?;

        let is_dir = entry_path.is_dir();
        let size = metadata.len();

        let modified_time = metadata.modified()
            .ok()
            .map(|t| format_system_time(t));

        // For files, we could compute a hash, but skip for performance
        let hash = None;

        let relative_path = entry_path.to_string_lossy().to_string();

        let children = if is_dir {
            Some(scan_directory_entries(&entry_path)?)
        } else {
            None
        };

        entries.push(SnapshotEntry {
            path: relative_path,
            name,
            entry_type: if is_dir { "folder".to_string() } else { "file".to_string() },
            size,
            modified_time,
            hash,
            children,
        });
    }

    // Sort entries: folders first, then files, alphabetically
    entries.sort_by(|a, b| {
        if a.entry_type != b.entry_type {
            if a.entry_type == "folder" {
                std::cmp::Ordering::Less
            } else {
                std::cmp::Ordering::Greater
            }
        } else {
            a.name.cmp(&b.name)
        }
    });

    Ok(entries)
}

fn count_entries(entries: &[SnapshotEntry], files: &mut u64, folders: &mut u64, size: &mut u64) {
    for entry in entries {
        if entry.entry_type == "file" {
            *files += 1;
            *size += entry.size;
        } else {
            *folders += 1;
        }

        if let Some(children) = &entry.children {
            count_entries(children, files, folders, size);
        }
    }
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