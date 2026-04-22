// Tests for remote module

use beyond_compare_lib::remote::{RemoteConfig, RemoteFile, ConnectionResult};

#[test]
fn test_remote_config_sftp() {
    let config = RemoteConfig {
        protocol: "sftp".to_string(),
        host: "example.com".to_string(),
        port: 22,
        username: "user".to_string(),
        password: Some("password".to_string()),
        private_key: None,
        private_key_passphrase: None,
    };

    assert_eq!(config.protocol, "sftp");
    assert_eq!(config.host, "example.com");
    assert_eq!(config.port, 22);
    assert_eq!(config.username, "user");
    assert!(config.password.is_some());
    assert!(config.private_key.is_none());
}

#[test]
fn test_remote_config_ftp() {
    let config = RemoteConfig {
        protocol: "ftp".to_string(),
        host: "ftp.example.com".to_string(),
        port: 21,
        username: "ftpuser".to_string(),
        password: Some("ftppass".to_string()),
        private_key: None,
        private_key_passphrase: None,
    };

    assert_eq!(config.protocol, "ftp");
    assert_eq!(config.port, 21);
}

#[test]
fn test_remote_config_with_private_key() {
    let config = RemoteConfig {
        protocol: "sftp".to_string(),
        host: "server.com".to_string(),
        port: 22,
        username: "keyuser".to_string(),
        password: None,
        private_key: Some("/path/to/key".to_string()),
        private_key_passphrase: Some("keypass".to_string()),
    };

    assert!(config.password.is_none());
    assert!(config.private_key.is_some());
    assert!(config.private_key_passphrase.is_some());
}

#[test]
fn test_remote_file() {
    let file = RemoteFile {
        path: "/home/user/document.txt".to_string(),
        name: "document.txt".to_string(),
        is_dir: false,
        size: 1024,
        modified: Some("2024-01-15".to_string()),
        permissions: Some("644".to_string()),
    };

    assert_eq!(file.path, "/home/user/document.txt");
    assert_eq!(file.name, "document.txt");
    assert_eq!(file.is_dir, false);
    assert_eq!(file.size, 1024);
    assert!(file.modified.is_some());
    assert!(file.permissions.is_some());
}

#[test]
fn test_remote_file_directory() {
    let file = RemoteFile {
        path: "/home/user/folder".to_string(),
        name: "folder".to_string(),
        is_dir: true,
        size: 0,
        modified: None,
        permissions: Some("755".to_string()),
    };

    assert_eq!(file.is_dir, true);
    assert_eq!(file.size, 0);
}

#[test]
fn test_connection_result_success() {
    let result = ConnectionResult {
        success: true,
        message: "Connected successfully".to_string(),
        fingerprint: Some("SHA256:abc123".to_string()),
    };

    assert_eq!(result.success, true);
    assert_eq!(result.message, "Connected successfully");
    assert!(result.fingerprint.is_some());
}

#[test]
fn test_connection_result_failure() {
    let result = ConnectionResult {
        success: false,
        message: "Authentication failed".to_string(),
        fingerprint: None,
    };

    assert_eq!(result.success, false);
    assert!(result.fingerprint.is_none());
}