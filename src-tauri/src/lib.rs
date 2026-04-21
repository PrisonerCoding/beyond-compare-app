mod cli;
mod remote;
mod git;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // Check for CLI arguments first
  if let Some(cli_args) = cli::parse_args() {
    // Run CLI mode
    if let Err(e) = cli::execute(cli_args) {
      eprintln!("Error: {}", e);
      std::process::exit(1);
    }
    std::process::exit(0);
  }

  // No CLI args, run GUI mode
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      remote::connect_remote,
      remote::list_remote_dir,
      remote::download_remote_file,
      remote::upload_remote_file,
      git::git_is_repo,
      git::git_log,
      git::git_show_files,
      git::git_diff_commits,
      git::git_diff_file,
      git::git_blame,
      git::git_branches,
      git::git_get_current_branch,
      git::git_get_file_at_commit,
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}