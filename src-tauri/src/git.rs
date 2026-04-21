use serde::{Deserialize, Serialize};
use std::process::Command;
use std::path::Path;

/// Git commit info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitCommit {
    pub hash: String,
    pub short_hash: String,
    pub author: String,
    pub author_email: String,
    pub date: String,
    pub message: String,
    pub parent_hashes: Vec<String>,
}

/// Git file status in commit
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitFileStatus {
    pub path: String,
    pub status: String,  // A, M, D, R, C
    pub old_path: Option<String>,  // For renamed files
}

/// Git blame line info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitBlameLine {
    pub line_number: usize,
    pub hash: String,
    pub author: String,
    pub author_email: String,
    pub date: String,
    pub content: String,
}

/// Git branch info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitBranch {
    pub name: String,
    pub is_current: bool,
    pub is_remote: bool,
    pub upstream: Option<String>,
}

/// Git diff result
#[derive(Debug, Serialize, Deserialize)]
pub struct GitDiffResult {
    pub diff: String,
    pub stats: GitDiffStats,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitDiffStats {
    pub files_changed: usize,
    pub insertions: usize,
    pub deletions: usize,
}

// Tauri commands for Git operations

#[tauri::command]
pub fn git_is_repo(path: String) -> Result<bool, String> {
    let repo_path = Path::new(&path);
    let git_dir = repo_path.join(".git");
    Ok(git_dir.exists())
}

#[tauri::command]
pub fn git_log(path: String, limit: usize) -> Result<Vec<GitCommit>, String> {
    let output = Command::new("git")
        .args(["log", "--pretty=format:%H|%h|%an|%ae|%ad|%s|%P", "--date=iso", "-n"])
        .arg(limit.to_string())
        .current_dir(&path)
        .output()
        .map_err(|e| format!("Failed to run git log: {}", e))?;

    if !output.status.success() {
        return Err(format!("git log failed: {}", String::from_utf8_lossy(&output.stderr)));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let commits: Vec<GitCommit> = stdout.lines().map(|line| {
        let parts: Vec<&str> = line.split('|').collect();
        let parents: Vec<String> = if parts.len() > 6 {
            parts[6].split_whitespace().map(|s| s.to_string()).collect()
        } else {
            vec![]
        };

        GitCommit {
            hash: parts.get(0).copied().unwrap_or("").to_string(),
            short_hash: parts.get(1).copied().unwrap_or("").to_string(),
            author: parts.get(2).copied().unwrap_or("").to_string(),
            author_email: parts.get(3).copied().unwrap_or("").to_string(),
            date: parts.get(4).copied().unwrap_or("").to_string(),
            message: parts.get(5).copied().unwrap_or("").to_string(),
            parent_hashes: parents,
        }
    }).collect();

    Ok(commits)
}

#[tauri::command]
pub fn git_show_files(path: String, commit_hash: String) -> Result<Vec<GitFileStatus>, String> {
    let output = Command::new("git")
        .args(["show", "--pretty=format:", "--name-status"])
        .arg(&commit_hash)
        .current_dir(&path)
        .output()
        .map_err(|e| format!("Failed to run git show: {}", e))?;

    if !output.status.success() {
        return Err(format!("git show failed: {}", String::from_utf8_lossy(&output.stderr)));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let files: Vec<GitFileStatus> = stdout.lines().filter(|line| !line.is_empty()).map(|line| {
        let parts: Vec<&str> = line.split_whitespace().collect();
        let status = parts.get(0).copied().unwrap_or("").to_string();
        let path_str = parts.get(1).copied().unwrap_or("").to_string();
        let old_path = if status == "R" && parts.len() > 2 {
            Some(parts.get(2).copied().unwrap_or("").to_string())
        } else {
            None
        };

        GitFileStatus {
            path: path_str,
            status,
            old_path,
        }
    }).collect();

    Ok(files)
}

#[tauri::command]
pub fn git_diff_commits(
    path: String,
    commit1: String,
    commit2: String,
) -> Result<GitDiffResult, String> {
    let output = Command::new("git")
        .args(["diff", "--stat"])
        .arg(&commit1)
        .arg(&commit2)
        .current_dir(&path)
        .output()
        .map_err(|e| format!("Failed to run git diff: {}", e))?;

    let stat_output = String::from_utf8_lossy(&output.stdout);

    // Parse stats from last line
    let stats_line = stat_output.lines().last().unwrap_or("");
    let stats_parts: Vec<&str> = stats_line.split_whitespace().collect();

    let stats = GitDiffStats {
        files_changed: stats_parts.get(0).and_then(|s| s.parse().ok()).unwrap_or(0),
        insertions: stats_parts.get(3).and_then(|s| s.replace('+', "").parse().ok()).unwrap_or(0),
        deletions: stats_parts.get(4).and_then(|s| s.replace('-', "").parse().ok()).unwrap_or(0),
    };

    // Get full diff
    let diff_output = Command::new("git")
        .args(["diff"])
        .arg(&commit1)
        .arg(&commit2)
        .current_dir(&path)
        .output()
        .map_err(|e| format!("Failed to run git diff: {}", e))?;

    let diff = String::from_utf8_lossy(&diff_output.stdout).to_string();

    Ok(GitDiffResult { diff, stats })
}

#[tauri::command]
pub fn git_diff_file(
    path: String,
    commit1: String,
    commit2: String,
    file_path: String,
) -> Result<String, String> {
    let output = Command::new("git")
        .args(["diff"])
        .arg(&commit1)
        .arg(&commit2)
        .arg("--")
        .arg(&file_path)
        .current_dir(&path)
        .output()
        .map_err(|e| format!("Failed to run git diff: {}", e))?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
pub fn git_blame(path: String, file_path: String) -> Result<Vec<GitBlameLine>, String> {
    let output = Command::new("git")
        .args(["blame", "--line-porcelain"])
        .arg(&file_path)
        .current_dir(&path)
        .output()
        .map_err(|e| format!("Failed to run git blame: {}", e))?;

    if !output.status.success() {
        return Err(format!("git blame failed: {}", String::from_utf8_lossy(&output.stderr)));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let blame_lines: Vec<GitBlameLine> = stdout.lines().enumerate().map(|(idx, line)| {
        // Parse porcelain format: hash author author-mail author-time ...
        let parts: Vec<&str> = line.split_whitespace().collect();

        // Extract info from line format: hash (author author-mail author-time #line) content
        let hash = parts.get(0).copied().unwrap_or("").to_string();

        // Find author info between parentheses
        let mut author = "Unknown".to_string();
        let mut author_email = "".to_string();
        let mut date = "".to_string();

        // The format is: hash (author author-mail author-time num) content
        // Parse by finding the parentheses
        if let Some(start) = line.find('(') {
            if let Some(end) = line.find(')') {
                let info_part = &line[start + 1..end];
                let info_parts: Vec<&str> = info_part.split_whitespace().collect();
                author = info_parts.get(0).copied().unwrap_or("Unknown").to_string();
                author_email = info_parts.get(1).copied().unwrap_or("").to_string();
                date = info_parts.get(2).copied().unwrap_or("").to_string();
            }
        }

        // Content is after the closing parenthesis
        let content = if let Some(pos) = line.find(')') {
            line[pos + 2..].to_string()
        } else {
            line.to_string()
        };

        GitBlameLine {
            line_number: idx + 1,
            hash,
            author,
            author_email,
            date,
            content,
        }
    }).collect();

    Ok(blame_lines)
}

#[tauri::command]
pub fn git_branches(path: String) -> Result<Vec<GitBranch>, String> {
    let output = Command::new("git")
        .args(["branch", "-a", "--verbose"])
        .current_dir(&path)
        .output()
        .map_err(|e| format!("Failed to run git branch: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let branches: Vec<GitBranch> = stdout.lines().map(|line| {
        let is_current = line.starts_with('*');
        let line_trimmed = line.trim_start_matches('*').trim_start();

        let parts: Vec<&str> = line_trimmed.split_whitespace().collect();
        let name = parts.get(0).copied().unwrap_or("").to_string();
        let is_remote = name.starts_with("remotes/");
        let upstream = parts.get(2).map(|s| s.to_string());

        GitBranch {
            name,
            is_current,
            is_remote,
            upstream,
        }
    }).collect();

    Ok(branches)
}

#[tauri::command]
pub fn git_get_current_branch(path: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["branch", "--show-current"])
        .current_dir(&path)
        .output()
        .map_err(|e| format!("Failed to run git branch: {}", e))?;

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

#[tauri::command]
pub fn git_get_file_at_commit(
    path: String,
    commit_hash: String,
    file_path: String,
) -> Result<String, String> {
    let output = Command::new("git")
        .args(["show", &format!("{}:{}", commit_hash, file_path)])
        .current_dir(&path)
        .output()
        .map_err(|e| format!("Failed to run git show: {}", e))?;

    if !output.status.success() {
        return Err(format!("File not found at commit: {}", String::from_utf8_lossy(&output.stderr)));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}