// Tests for git module

use beyond_compare_lib::git::{GitCommit, GitFileStatus, GitBlameLine, GitBranch, GitDiffResult, GitDiffStats};

#[test]
fn test_git_commit_structure() {
    let commit = GitCommit {
        hash: "abc123def456".to_string(),
        short_hash: "abc123d".to_string(),
        author: "John Doe".to_string(),
        author_email: "john@example.com".to_string(),
        date: "2024-01-15 10:30:00".to_string(),
        message: "Initial commit".to_string(),
        parent_hashes: vec!["parent1".to_string()],
    };

    assert_eq!(commit.hash, "abc123def456");
    assert_eq!(commit.short_hash, "abc123d");
    assert_eq!(commit.author, "John Doe");
    assert_eq!(commit.message, "Initial commit");
    assert_eq!(commit.parent_hashes.len(), 1);
}

#[test]
fn test_git_commit_no_parents() {
    let commit = GitCommit {
        hash: "initial".to_string(),
        short_hash: "init".to_string(),
        author: "Alice".to_string(),
        author_email: "alice@example.com".to_string(),
        date: "2024-01-01".to_string(),
        message: "Root commit".to_string(),
        parent_hashes: vec![],
    };

    assert_eq!(commit.parent_hashes.len(), 0);
}

#[test]
fn test_git_file_status_added() {
    let status = GitFileStatus {
        path: "new_file.txt".to_string(),
        status: "A".to_string(),
        old_path: None,
    };

    assert_eq!(status.status, "A");
    assert!(status.old_path.is_none());
}

#[test]
fn test_git_file_status_modified() {
    let status = GitFileStatus {
        path: "modified_file.txt".to_string(),
        status: "M".to_string(),
        old_path: None,
    };

    assert_eq!(status.status, "M");
}

#[test]
fn test_git_file_status_deleted() {
    let status = GitFileStatus {
        path: "deleted_file.txt".to_string(),
        status: "D".to_string(),
        old_path: None,
    };

    assert_eq!(status.status, "D");
}

#[test]
fn test_git_file_status_renamed() {
    let status = GitFileStatus {
        path: "new_name.txt".to_string(),
        status: "R".to_string(),
        old_path: Some("old_name.txt".to_string()),
    };

    assert_eq!(status.status, "R");
    assert_eq!(status.old_path.unwrap(), "old_name.txt");
}

#[test]
fn test_git_blame_line() {
    let blame = GitBlameLine {
        line_number: 1,
        hash: "abc123".to_string(),
        author: "John Doe".to_string(),
        author_email: "john@example.com".to_string(),
        date: "2024-01-15".to_string(),
        content: "fn main() {".to_string(),
    };

    assert_eq!(blame.line_number, 1);
    assert_eq!(blame.hash, "abc123");
    assert_eq!(blame.content, "fn main() {");
}

#[test]
fn test_git_branch() {
    let branch = GitBranch {
        name: "main".to_string(),
        is_current: true,
        is_remote: false,
        upstream: Some("origin/main".to_string()),
    };

    assert_eq!(branch.name, "main");
    assert_eq!(branch.is_current, true);
    assert_eq!(branch.is_remote, false);
    assert_eq!(branch.upstream.unwrap(), "origin/main");
}

#[test]
fn test_git_branch_remote() {
    let branch = GitBranch {
        name: "remotes/origin/feature".to_string(),
        is_current: false,
        is_remote: true,
        upstream: None,
    };

    assert_eq!(branch.is_remote, true);
    assert!(branch.upstream.is_none());
}

#[test]
fn test_git_diff_stats() {
    let stats = GitDiffStats {
        files_changed: 5,
        insertions: 100,
        deletions: 50,
    };

    assert_eq!(stats.files_changed, 5);
    assert_eq!(stats.insertions, 100);
    assert_eq!(stats.deletions, 50);
}

#[test]
fn test_git_diff_result() {
    let diff = GitDiffResult {
        diff: "--- a/file.txt\n+++ b/file.txt\n@@ -1 +1 @@".to_string(),
        stats: GitDiffStats {
            files_changed: 1,
            insertions: 1,
            deletions: 1,
        },
    };

    assert!(diff.diff.contains("--- a/file.txt"));
    assert_eq!(diff.stats.files_changed, 1);
}