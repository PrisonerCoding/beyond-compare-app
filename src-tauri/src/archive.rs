use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Read;
use std::path::PathBuf;

/// Archive entry info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchiveEntry {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: Option<String>,
    pub compressed_size: Option<u64>,
}

/// Archive type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ArchiveType {
    Zip,
    Tar,
    TarGz,
    TarBz2,
    Unknown,
}

/// Detect archive type from path
pub fn detect_archive_type(path: &str) -> ArchiveType {
    let lower = path.to_lowercase();
    if lower.ends_with(".zip") {
        ArchiveType::Zip
    } else if lower.ends_with(".tar.gz") || lower.ends_with(".tgz") {
        ArchiveType::TarGz
    } else if lower.ends_with(".tar.bz2") || lower.ends_with(".tbz2") {
        ArchiveType::TarBz2
    } else if lower.ends_with(".tar") {
        ArchiveType::Tar
    } else {
        ArchiveType::Unknown
    }
}

/// List entries in a ZIP archive
fn list_zip_entries(path: &str) -> Result<Vec<ArchiveEntry>, String> {
    let file = File::open(path)
        .map_err(|e| format!("Failed to open ZIP file: {}", e))?;

    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("Failed to read ZIP archive: {}", e))?;

    let mut entries: Vec<ArchiveEntry> = Vec::new();

    for i in 0..archive.len() {
        let file = archive.by_index(i)
            .map_err(|e| format!("Failed to read ZIP entry {}: {}", i, e))?;

        let entry_path = file.name().to_string();
        let is_dir = file.is_dir();
        let name = entry_path.split('/').last().unwrap_or(&entry_path).to_string();
        let size = file.size();
        let compressed_size = file.compressed_size();

        entries.push(ArchiveEntry {
            path: entry_path,
            name,
            is_dir,
            size,
            modified: None,
            compressed_size: Some(compressed_size),
        });
    }

    Ok(entries)
}

/// List entries in a TAR archive (including .tar.gz, .tar.bz2)
fn list_tar_entries(path: &str) -> Result<Vec<ArchiveEntry>, String> {
    let file = File::open(path)
        .map_err(|e| format!("Failed to open TAR file: {}", e))?;

    let archive_type = detect_archive_type(path);

    let entries: Vec<ArchiveEntry> = match archive_type {
        ArchiveType::TarGz => {
            let decoder = flate2::read::GzDecoder::new(file);
            let mut archive = tar::Archive::new(decoder);
            archive.entries()
                .map_err(|e| format!("Failed to read TAR.GZ entries: {}", e))?
                .filter_map(|entry| entry.ok())
                .map(|entry| {
                    let path = entry.path().map(|p| p.to_string_lossy().to_string()).unwrap_or_default();
                    let name = path.split('/').last().unwrap_or(&path).to_string();
                    let is_dir = entry.header().entry_type().is_dir();
                    let size = entry.header().size().unwrap_or(0);
                    ArchiveEntry {
                        path,
                        name,
                        is_dir,
                        size,
                        modified: None,
                        compressed_size: None,
                    }
                })
                .collect()
        }
        ArchiveType::TarBz2 => {
            let decoder = bzip2::read::BzDecoder::new(file);
            let mut archive = tar::Archive::new(decoder);
            archive.entries()
                .map_err(|e| format!("Failed to read TAR.BZ2 entries: {}", e))?
                .filter_map(|entry| entry.ok())
                .map(|entry| {
                    let path = entry.path().map(|p| p.to_string_lossy().to_string()).unwrap_or_default();
                    let name = path.split('/').last().unwrap_or(&path).to_string();
                    let is_dir = entry.header().entry_type().is_dir();
                    let size = entry.header().size().unwrap_or(0);
                    ArchiveEntry {
                        path,
                        name,
                        is_dir,
                        size,
                        modified: None,
                        compressed_size: None,
                    }
                })
                .collect()
        }
        ArchiveType::Tar => {
            let mut archive = tar::Archive::new(file);
            archive.entries()
                .map_err(|e| format!("Failed to read TAR entries: {}", e))?
                .filter_map(|entry| entry.ok())
                .map(|entry| {
                    let path = entry.path().map(|p| p.to_string_lossy().to_string()).unwrap_or_default();
                    let name = path.split('/').last().unwrap_or(&path).to_string();
                    let is_dir = entry.header().entry_type().is_dir();
                    let size = entry.header().size().unwrap_or(0);
                    ArchiveEntry {
                        path,
                        name,
                        is_dir,
                        size,
                        modified: None,
                        compressed_size: None,
                    }
                })
                .collect()
        }
        _ => return Err("Unsupported archive type".to_string()),
    };

    Ok(entries)
}

/// Extract a single file from ZIP archive
fn extract_zip_file(archive_path: &str, entry_path: &str) -> Result<Vec<u8>, String> {
    let file = File::open(archive_path)
        .map_err(|e| format!("Failed to open ZIP file: {}", e))?;

    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("Failed to read ZIP archive: {}", e))?;

    // Find the entry by path
    for i in 0..archive.len() {
        let mut zip_file = archive.by_index(i)
            .map_err(|e| format!("Failed to read ZIP entry {}: {}", i, e))?;

        if zip_file.name() == entry_path {
            let mut content = Vec::new();
            zip_file.read_to_end(&mut content)
                .map_err(|e| format!("Failed to read ZIP entry content: {}", e))?;
            return Ok(content);
        }
    }

    Err(format!("Entry '{}' not found in archive", entry_path))
}

/// Extract a single file from TAR archive
fn extract_tar_file(archive_path: &str, entry_path: &str) -> Result<Vec<u8>, String> {
    let file = File::open(archive_path)
        .map_err(|e| format!("Failed to open TAR file: {}", e))?;

    let archive_type = detect_archive_type(archive_path);
    let target_path = PathBuf::from(entry_path);

    match archive_type {
        ArchiveType::TarGz => {
            let decoder = flate2::read::GzDecoder::new(file);
            let mut archive = tar::Archive::new(decoder);
            archive.entries()
                .map_err(|e| format!("Failed to read TAR.GZ entries: {}", e))?
                .filter_map(|entry| entry.ok())
                .find(|entry| entry.path().map(|p| p == target_path).unwrap_or(false))
                .and_then(|mut entry| {
                    let mut content = Vec::new();
                    entry.read_to_end(&mut content).ok()?;
                    Some(content)
                })
                .ok_or_else(|| format!("Entry '{}' not found in archive", entry_path))
        }
        ArchiveType::TarBz2 => {
            let decoder = bzip2::read::BzDecoder::new(file);
            let mut archive = tar::Archive::new(decoder);
            archive.entries()
                .map_err(|e| format!("Failed to read TAR.BZ2 entries: {}", e))?
                .filter_map(|entry| entry.ok())
                .find(|entry| entry.path().map(|p| p == target_path).unwrap_or(false))
                .and_then(|mut entry| {
                    let mut content = Vec::new();
                    entry.read_to_end(&mut content).ok()?;
                    Some(content)
                })
                .ok_or_else(|| format!("Entry '{}' not found in archive", entry_path))
        }
        ArchiveType::Tar => {
            let mut archive = tar::Archive::new(file);
            archive.entries()
                .map_err(|e| format!("Failed to read TAR entries: {}", e))?
                .filter_map(|entry| entry.ok())
                .find(|entry| entry.path().map(|p| p == target_path).unwrap_or(false))
                .and_then(|mut entry| {
                    let mut content = Vec::new();
                    entry.read_to_end(&mut content).ok()?;
                    Some(content)
                })
                .ok_or_else(|| format!("Entry '{}' not found in archive", entry_path))
        }
        _ => Err("Unsupported archive type".to_string()),
    }
}

// Tauri commands for archive operations

#[tauri::command]
pub fn list_archive_entries(path: String) -> Result<Vec<ArchiveEntry>, String> {
    let archive_type = detect_archive_type(&path);

    match archive_type {
        ArchiveType::Zip => list_zip_entries(&path),
        ArchiveType::Tar | ArchiveType::TarGz | ArchiveType::TarBz2 => list_tar_entries(&path),
        ArchiveType::Unknown => Err("Unsupported archive format. Supported: .zip, .tar, .tar.gz, .tar.bz2".to_string()),
    }
}

#[tauri::command]
pub fn extract_archive_file(archive_path: String, entry_path: String) -> Result<Vec<u8>, String> {
    let archive_type = detect_archive_type(&archive_path);

    match archive_type {
        ArchiveType::Zip => extract_zip_file(&archive_path, &entry_path),
        ArchiveType::Tar | ArchiveType::TarGz | ArchiveType::TarBz2 => extract_tar_file(&archive_path, &entry_path),
        ArchiveType::Unknown => Err("Unsupported archive format".to_string()),
    }
}

#[tauri::command]
pub fn get_archive_type(path: String) -> Result<String, String> {
    let archive_type = detect_archive_type(&path);
    Ok(match archive_type {
        ArchiveType::Zip => "zip".to_string(),
        ArchiveType::Tar => "tar".to_string(),
        ArchiveType::TarGz => "tar.gz".to_string(),
        ArchiveType::TarBz2 => "tar.bz2".to_string(),
        ArchiveType::Unknown => "unknown".to_string(),
    })
}