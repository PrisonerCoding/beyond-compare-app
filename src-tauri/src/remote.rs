use serde::{Deserialize, Serialize};
use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::PathBuf;
use ssh2::Session;
use suppaftp::FtpError;

/// Remote connection configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteConfig {
    pub protocol: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: Option<String>,
    pub private_key: Option<String>,
    pub private_key_passphrase: Option<String>,
}

/// Remote file info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteFile {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: Option<String>,
    pub permissions: Option<String>,
}

/// Connection result
#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionResult {
    pub success: bool,
    pub message: String,
    pub fingerprint: Option<String>,
}

/// SFTP client wrapper
pub struct SftpClient {
    session: Session,
    sftp: ssh2::Sftp,
}

impl SftpClient {
    /// Connect to SFTP server
    pub fn connect(config: &RemoteConfig) -> Result<Self, String> {
        let host = config.host.as_str();
        let port = config.port;

        // Connect TCP
        let tcp = TcpStream::connect((host, port))
            .map_err(|e| format!("Failed to connect to {}: {}", host, e))?;

        // Initialize SSH session
        let mut session = Session::new()
            .map_err(|e| format!("Failed to create SSH session: {}", e))?;

        session.set_tcp_stream(tcp);
        session.handshake()
            .map_err(|e| format!("SSH handshake failed: {}", e))?;

        // Authenticate - use password only for now
        if let Some(password) = &config.password {
            session.userauth_password(&config.username, password)
                .map_err(|e| format!("Password authentication failed: {}", e))?;
        } else {
            return Err("Password required for authentication".to_string());
        }

        // Verify authentication
        if !session.authenticated() {
            return Err("Authentication failed".to_string());
        }

        // Initialize SFTP
        let sftp = session.sftp()
            .map_err(|e| format!("Failed to initialize SFTP: {}", e))?;

        Ok(SftpClient { session, sftp })
    }

    /// Get host key fingerprint
    pub fn get_fingerprint(&self) -> Option<String> {
        self.session.host_key_hash(ssh2::HashType::Sha256)
            .map(|hash| {
                hash.iter()
                    .map(|b| format!("{:02x}", b))
                    .collect::<Vec<_>>()
                    .join(":")
            })
    }

    /// List directory contents using readdir
    pub fn list_dir(&self, path: &str) -> Result<Vec<RemoteFile>, String> {
        let dir_path = PathBuf::from(path);

        // Open directory and use readdir to iterate
        let mut dir = self.sftp.opendir(&dir_path)
            .map_err(|e| format!("Failed to open directory {}: {}", path, e))?;

        let mut files: Vec<RemoteFile> = Vec::new();

        // Use readdir in a loop to get entries one by one
        // readdir returns a single (PathBuf, FileStat) entry each call
        // When no more entries, it returns an error we should break on
        loop {
            match dir.readdir() {
                Ok((entry_path, stat)) => {
                    let name = entry_path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("")
                        .to_string();

                    // Skip . and .. entries
                    if name == "." || name == ".." {
                        continue;
                    }

                    files.push(RemoteFile {
                        path: entry_path.to_string_lossy().to_string(),
                        name,
                        is_dir: stat.is_dir(),
                        size: stat.size.unwrap_or(0),
                        modified: None,
                        permissions: None,
                    });
                }
                Err(_) => break, // No more entries
            }
        }

        Ok(files)
    }

    /// Download file content
    pub fn download_file(&self, path: &str) -> Result<Vec<u8>, String> {
        let file_path = PathBuf::from(path);

        let mut file = self.sftp.open(&file_path)
            .map_err(|e| format!("Failed to open file {}: {}", path, e))?;

        let mut content = Vec::new();
        file.read_to_end(&mut content)
            .map_err(|e| format!("Failed to read file {}: {}", path, e))?;

        Ok(content)
    }

    /// Upload file
    pub fn upload_file(&self, path: &str, content: &[u8]) -> Result<(), String> {
        let file_path = PathBuf::from(path);

        let mut file = self.sftp.create(&file_path)
            .map_err(|e| format!("Failed to create file {}: {}", path, e))?;

        file.write_all(content)
            .map_err(|e| format!("Failed to write to file {}: {}", path, e))?;

        Ok(())
    }

    /// Delete file
    pub fn delete_file(&self, path: &str) -> Result<(), String> {
        let file_path = PathBuf::from(path);
        self.sftp.unlink(&file_path)
            .map_err(|e| format!("Failed to delete file {}: {}", path, e))?;
        Ok(())
    }
}

/// FTP client wrapper using suppaftp
pub struct FtpClient {
    ftp: suppaftp::FtpStream,
}

impl FtpClient {
    /// Connect to FTP server
    pub fn connect(config: &RemoteConfig) -> Result<Self, String> {
        let host = config.host.as_str();
        let port = config.port;

        // Connect to FTP server
        let mut ftp = suppaftp::FtpStream::connect((host, port))
            .map_err(|e| format!("Failed to connect to FTP {}: {}", host, e))?;

        // Login
        let password = config.password.clone().unwrap_or_default();
        ftp.login(&config.username, &password)
            .map_err(|e| format!("FTP login failed: {}", e))?;

        Ok(FtpClient { ftp })
    }

    /// List directory contents
    pub fn list_dir(&mut self, path: &str) -> Result<Vec<RemoteFile>, String> {
        // Get list of file names using nlst for simple names
        let names = self.ftp.nlst(Some(path))
            .map_err(|e| format!("Failed to list directory {}: {}", path, e))?;

        let files: Vec<RemoteFile> = names.iter().filter_map(|name| {
            if name.is_empty() || name == "." || name == ".." {
                return None;
            }

            Some(RemoteFile {
                path: format!("{}/{}", path, name),
                name: name.clone(),
                is_dir: false, // nlst doesn't provide type info
                size: 0,
                modified: None,
                permissions: None,
            })
        }).collect();

        Ok(files)
    }

    /// Download file content
    pub fn download_file(&mut self, path: &str) -> Result<Vec<u8>, String> {
        // Use retr with a callback that returns Result
        let content = self.ftp.retr(path, |reader| {
            let mut data = Vec::new();
            match reader.read_to_end(&mut data) {
                Ok(_) => Ok(data),
                Err(e) => Err(FtpError::ConnectionError(e)),
            }
        }).map_err(|e| format!("Failed to download file {}: {}", path, e))?;

        Ok(content)
    }

    /// Upload file using put method
    pub fn upload_file(&mut self, path: &str, content: &[u8]) -> Result<(), String> {
        // Use put_file method from suppaftp
        self.ftp.put_file(path, &mut std::io::Cursor::new(content))
            .map_err(|e| format!("Failed to upload file {}: {}", path, e))?;
        Ok(())
    }

    /// Delete file
    pub fn delete_file(&mut self, path: &str) -> Result<(), String> {
        self.ftp.rm(path)
            .map_err(|e| format!("Failed to delete file {}: {}", path, e))?;
        Ok(())
    }
}

// Tauri commands for remote operations

#[tauri::command]
pub async fn connect_remote(config: RemoteConfig) -> Result<ConnectionResult, String> {
    match config.protocol.as_str() {
        "sftp" => {
            let client = SftpClient::connect(&config)?;
            let fingerprint = client.get_fingerprint();
            Ok(ConnectionResult {
                success: true,
                message: "Connected successfully".to_string(),
                fingerprint,
            })
        }
        "ftp" => {
            FtpClient::connect(&config)?;
            Ok(ConnectionResult {
                success: true,
                message: "Connected successfully".to_string(),
                fingerprint: None,
            })
        }
        _ => Err("Unsupported protocol".to_string()),
    }
}

#[tauri::command]
pub async fn list_remote_dir(config: RemoteConfig, path: String) -> Result<Vec<RemoteFile>, String> {
    match config.protocol.as_str() {
        "sftp" => {
            let client = SftpClient::connect(&config)?;
            client.list_dir(&path)
        }
        "ftp" => {
            let mut client = FtpClient::connect(&config)?;
            client.list_dir(&path)
        }
        _ => Err("Unsupported protocol".to_string()),
    }
}

#[tauri::command]
pub async fn download_remote_file(config: RemoteConfig, path: String) -> Result<Vec<u8>, String> {
    match config.protocol.as_str() {
        "sftp" => {
            let client = SftpClient::connect(&config)?;
            client.download_file(&path)
        }
        "ftp" => {
            let mut client = FtpClient::connect(&config)?;
            client.download_file(&path)
        }
        _ => Err("Unsupported protocol".to_string()),
    }
}

#[tauri::command]
pub async fn upload_remote_file(config: RemoteConfig, path: String, content: Vec<u8>) -> Result<(), String> {
    match config.protocol.as_str() {
        "sftp" => {
            let client = SftpClient::connect(&config)?;
            client.upload_file(&path, &content)
        }
        "ftp" => {
            let mut client = FtpClient::connect(&config)?;
            client.upload_file(&path, &content)
        }
        _ => Err("Unsupported protocol".to_string()),
    }
}