// Tests for archive module

use beyond_compare_lib::archive::{get_archive_type, ArchiveType, ArchiveEntry, list_archive_entries};

#[test]
fn test_detect_archive_type() {
    // Test ZIP detection
    assert_eq!(get_archive_type("test.zip".to_string()).unwrap(), "zip");
    assert_eq!(get_archive_type("TEST.ZIP".to_string()).unwrap(), "zip");
    assert_eq!(get_archive_type("path/to/file.zip".to_string()).unwrap(), "zip");

    // Test TAR detection
    assert_eq!(get_archive_type("test.tar".to_string()).unwrap(), "tar");
    assert_eq!(get_archive_type("TEST.TAR".to_string()).unwrap(), "tar");

    // Test TAR.GZ detection
    assert_eq!(get_archive_type("test.tar.gz".to_string()).unwrap(), "tar.gz");
    assert_eq!(get_archive_type("TEST.TAR.GZ".to_string()).unwrap(), "tar.gz");
    assert_eq!(get_archive_type("test.tgz".to_string()).unwrap(), "tar.gz");

    // Test TAR.BZ2 detection
    assert_eq!(get_archive_type("test.tar.bz2".to_string()).unwrap(), "tar.bz2");
    assert_eq!(get_archive_type("TEST.TAR.BZ2".to_string()).unwrap(), "tar.bz2");
    assert_eq!(get_archive_type("test.tbz2".to_string()).unwrap(), "tar.bz2");

    // Test unknown formats
    assert_eq!(get_archive_type("test.rar".to_string()).unwrap(), "unknown");
    assert_eq!(get_archive_type("test.7z".to_string()).unwrap(), "unknown");
    assert_eq!(get_archive_type("test.txt".to_string()).unwrap(), "unknown");
    assert_eq!(get_archive_type("noextension".to_string()).unwrap(), "unknown");
}

#[test]
fn test_archive_entry_structure() {
    // Verify ArchiveEntry structure is correctly defined
    let entry = ArchiveEntry {
        path: "folder/file.txt".to_string(),
        name: "file.txt".to_string(),
        is_dir: false,
        size: 1024,
        modified: Some("2024-01-01".to_string()),
        compressed_size: Some(512),
    };

    assert_eq!(entry.path, "folder/file.txt");
    assert_eq!(entry.name, "file.txt");
    assert_eq!(entry.is_dir, false);
    assert_eq!(entry.size, 1024);
    assert!(entry.compressed_size.is_some());
}

#[test]
fn test_archive_entry_directory() {
    let entry = ArchiveEntry {
        path: "folder/".to_string(),
        name: "folder".to_string(),
        is_dir: true,
        size: 0,
        modified: None,
        compressed_size: None,
    };

    assert_eq!(entry.is_dir, true);
    assert_eq!(entry.size, 0);
}

#[test]
fn test_archive_type_enum() {
    // Test ArchiveType enum values
    let zip_type = ArchiveType::Zip;
    let tar_type = ArchiveType::Tar;
    let targz_type = ArchiveType::TarGz;
    let tarbz_type = ArchiveType::TarBz2;
    let unknown_type = ArchiveType::Unknown;

    // Just verify the enum exists and can be instantiated
    assert!(matches!(zip_type, ArchiveType::Zip));
    assert!(matches!(tar_type, ArchiveType::Tar));
    assert!(matches!(targz_type, ArchiveType::TarGz));
    assert!(matches!(tarbz_type, ArchiveType::TarBz2));
    assert!(matches!(unknown_type, ArchiveType::Unknown));
}

#[test]
fn test_list_archive_entries_invalid() {
    // Test with non-existent file
    let result = list_archive_entries("non_existent.zip".to_string());
    assert!(result.is_err());
}

#[test]
fn test_list_archive_entries_unknown_format() {
    // Test with unsupported format
    let result = list_archive_entries("test.rar".to_string());
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Unsupported"));
}