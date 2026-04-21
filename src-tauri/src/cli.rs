use clap::{Parser, Subcommand};
use std::fs;
use std::path::Path;

/// DiffLens - Professional file and folder comparison tool
#[derive(Parser)]
#[command(name = "difflens")]
#[command(author = "DiffLens Team")]
#[command(version = "0.1.0")]
#[command(about = "Compare files and folders like a pro")]
pub struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Compare two files and show differences
    Compare {
        /// First file/folder path (left side)
        #[arg(required = true)]
        left: String,
        /// Second file/folder path (right side)
        #[arg(required = true)]
        right: String,
        /// Output format: text, json, html
        #[arg(short, long, default_value = "text")]
        output: String,
        /// Ignore whitespace differences
        #[arg(short = 'w', long)]
        ignore_whitespace: bool,
        /// Ignore case differences
        #[arg(short = 'i', long)]
        ignore_case: bool,
        /// Show line numbers
        #[arg(short = 'n', long)]
        line_numbers: bool,
    },
    /// Batch compare multiple files
    Batch {
        /// Pattern to match files (e.g., "*.txt")
        #[arg(short, long, default_value = "*")]
        pattern: String,
        /// Directory to search
        #[arg(short, long, default_value = ".")]
        directory: String,
        /// Compare with backup files (*.bak)
        #[arg(long)]
        compare_backup: bool,
    },
    /// Generate diff report
    Report {
        /// First file path
        #[arg(required = true)]
        left: String,
        /// Second file path
        #[arg(required = true)]
        right: String,
        /// Output file path (HTML format)
        #[arg(short, long)]
        output: Option<String>,
    },
}

/// Parse command line arguments
pub fn parse_args() -> Option<Cli> {
    let args = std::env::args().collect::<Vec<_>>();
    // If only one arg (the program name), no CLI args provided
    if args.len() <= 1 {
        return None;
    }
    Some(Cli::parse())
}

/// Execute CLI command
pub fn execute(cli: Cli) -> Result<(), String> {
    match cli.command {
        Some(Commands::Compare { left, right, output, ignore_whitespace, ignore_case, line_numbers }) => {
            compare_files(&left, &right, &output, ignore_whitespace, ignore_case, line_numbers)
        }
        Some(Commands::Batch { pattern, directory, compare_backup }) => {
            batch_compare(&pattern, &directory, compare_backup)
        }
        Some(Commands::Report { left, right, output }) => {
            generate_report(&left, &right, output)
        }
        None => {
            println!("No command specified. Use --help for usage information.");
            Ok(())
        }
    }
}

/// Compare two files
fn compare_files(
    left_path: &str,
    right_path: &str,
    output_format: &str,
    ignore_whitespace: bool,
    ignore_case: bool,
    show_line_numbers: bool,
) -> Result<(), String> {
    let left = Path::new(left_path);
    let right = Path::new(right_path);

    // Check if paths exist
    if !left.exists() {
        return Err(format!("Left path does not exist: {}", left_path));
    }
    if !right.exists() {
        return Err(format!("Right path does not exist: {}", right_path));
    }

    // Handle folder comparison
    if left.is_dir() && right.is_dir() {
        return compare_folders(left_path, right_path, output_format);
    }

    // Handle file comparison
    if left.is_file() && right.is_file() {
        return compare_text_files(left_path, right_path, output_format, ignore_whitespace, ignore_case, show_line_numbers);
    }

    // Mixed file/folder
    Err("Cannot compare file with folder. Both must be files or folders.".to_string())
}

/// Compare two text files
fn compare_text_files(
    left_path: &str,
    right_path: &str,
    output_format: &str,
    ignore_whitespace: bool,
    ignore_case: bool,
    show_line_numbers: bool,
) -> Result<(), String> {
    let left_content = fs::read_to_string(left_path)
        .map_err(|e| format!("Failed to read left file: {}", e))?;
    let right_content = fs::read_to_string(right_path)
        .map_err(|e| format!("Failed to read right file: {}", e))?;

    // Process content based on options
    let left_processed = process_content(&left_content, ignore_whitespace, ignore_case);
    let right_processed = process_content(&right_content, ignore_whitespace, ignore_case);

    let _left_lines: Vec<&str> = left_processed.lines().collect();
    let _right_lines: Vec<&str> = right_processed.lines().collect();

    // Calculate diff using the diff crate
    let diff_result = diff::lines(&left_processed, &right_processed);

    // Count statistics
    let mut added = 0;
    let mut removed = 0;
    let mut modified = 0;
    let mut left_line = 1;
    let mut right_line = 1;

    match output_format {
        "json" => {
            let mut json_output: Vec<String> = vec![
                "{".to_string(),
                format!("  \"left_file\": \"{}\",", left_path),
                format!("  \"right_file\": \"{}\",", right_path),
                "  \"diffs\": [".to_string(),
            ];

            for diff_item in diff_result {
                match diff_item {
                    diff::Result::Left(l) => {
                        removed += 1;
                        let line_num = if show_line_numbers { left_line.to_string() } else { "-".to_string() };
                        json_output.push(format!("    {{\"type\": \"removed\", \"left_line\": {}, \"content\": \"{}\"}},", line_num, escape_json(l)));
                        left_line += 1;
                    }
                    diff::Result::Right(r) => {
                        added += 1;
                        let line_num = if show_line_numbers { right_line.to_string() } else { "-".to_string() };
                        json_output.push(format!("    {{\"type\": \"added\", \"right_line\": {}, \"content\": \"{}\"}},", line_num, escape_json(r)));
                        right_line += 1;
                    }
                    diff::Result::Both(l, r) => {
                        if l != r {
                            modified += 1;
                        }
                        left_line += 1;
                        right_line += 1;
                    }
                }
            }

            // Remove trailing comma from last diff entry
            if json_output.last().unwrap().ends_with(',') {
                let last = json_output.pop().unwrap();
                json_output.push(last[..last.len()-1].to_string());
            }

            json_output.push("  ],".to_string());
            json_output.push(format!("  \"stats\": {{"));
            json_output.push(format!("    \"added\": {},", added));
            json_output.push(format!("    \"removed\": {},", removed));
            json_output.push(format!("    \"modified\": {}", modified));
            json_output.push(format!("  }}"));
            json_output.push("}".to_string());

            println!("{}", json_output.join("\n"));
        }
        "html" => {
            println!("<!DOCTYPE html>");
            println!("<html><head><title>Diff Report</title>");
            println!("<style>");
            println!("body {{ font-family: monospace; background: #1e1e2e; color: #f0f0f0; }}");
            println!(".added {{ color: #4ade80; }}");
            println!(".removed {{ color: #f43f5e; }}");
            println!(".modified {{ color: #fbbf24; }}");
            println!("pre {{ margin: 0; }}");
            println!("</style></head><body>");
            println!("<h1>Diff: {} vs {}</h1>", left_path, right_path);
            println!("<pre>");

            for diff_item in diff_result {
                match diff_item {
                    diff::Result::Left(l) => {
                        let line_prefix = if show_line_numbers { format!("{:4}      ", left_line) } else { "".to_string() };
                        println!("<span class=\"removed\">{} - {}</span>", line_prefix, html_escape(l));
                        left_line += 1;
                    }
                    diff::Result::Right(r) => {
                        let line_prefix = if show_line_numbers { format!("      {:4} ", right_line) } else { "".to_string() };
                        println!("<span class=\"added\">{} + {}</span>", line_prefix, html_escape(r));
                        right_line += 1;
                    }
                    diff::Result::Both(l, r) => {
                        if l != r {
                            let left_prefix = if show_line_numbers { format!("{:4}      ", left_line) } else { "".to_string() };
                            let right_prefix = if show_line_numbers { format!("      {:4} ", right_line) } else { "".to_string() };
                            println!("<span class=\"modified\">{} ~ {}</span>", left_prefix, html_escape(l));
                            println!("<span class=\"modified\">{} ~ {}</span>", right_prefix, html_escape(r));
                            modified += 1;
                        } else if show_line_numbers {
                            println!("{}  {}", left_line, html_escape(l));
                        }
                        left_line += 1;
                        right_line += 1;
                    }
                }
            }

            println!("</pre>");
            println!("<hr>");
            println!("<p>Stats: {} added, {} removed, {} modified</p>", added, removed, modified);
            println!("</body></html>");
        }
        _ => {
            // Default text output
            println!("Comparing: {} vs {}", left_path, right_path);
            println!("─");

            for diff_item in diff_result {
                match diff_item {
                    diff::Result::Left(l) => {
                        let line_prefix = if show_line_numbers { format!("{:4}      ", left_line) } else { "".to_string() };
                        println!("{}- {}", line_prefix, l);
                        left_line += 1;
                    }
                    diff::Result::Right(r) => {
                        let line_prefix = if show_line_numbers { format!("      {:4} ", right_line) } else { "".to_string() };
                        println!("{}+ {}", line_prefix, r);
                        right_line += 1;
                    }
                    diff::Result::Both(l, r) => {
                        if l != r {
                            let left_prefix = if show_line_numbers { format!("{:4}      ", left_line) } else { "".to_string() };
                            let right_prefix = if show_line_numbers { format!("      {:4} ", right_line) } else { "".to_string() };
                            println!("{}~ {}", left_prefix, l);
                            println!("{}~ {}", right_prefix, r);
                            modified += 1;
                        } else if show_line_numbers {
                            println!("{}  {}", left_line, l);
                        }
                        left_line += 1;
                        right_line += 1;
                    }
                }
            }

            println!("─");
            println!("Stats: {} added, {} removed, {} modified", added, removed, modified);
        }
    }

    Ok(())
}

/// Compare two folders
fn compare_folders(left_path: &str, right_path: &str, _output_format: &str) -> Result<(), String> {
    let left_dir = fs::read_dir(left_path)
        .map_err(|e| format!("Failed to read left folder: {}", e))?;
    let right_dir = fs::read_dir(right_path)
        .map_err(|e| format!("Failed to read right folder: {}", e))?;

    let left_files: Vec<String> = left_dir
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_file())
        .map(|e| e.file_name().to_string_lossy().to_string())
        .collect();

    let right_files: Vec<String> = right_dir
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_file())
        .map(|e| e.file_name().to_string_lossy().to_string())
        .collect();

    println!("Comparing folders: {} vs {}", left_path, right_path);
    println!("─");

    let mut added_files: Vec<String> = Vec::new();
    let mut removed_files: Vec<String> = Vec::new();
    let mut common_files: Vec<String> = Vec::new();

    // Find added files (in right but not in left)
    for file in &right_files {
        if !left_files.contains(file) {
            added_files.push(file.clone());
        } else {
            common_files.push(file.clone());
        }
    }

    // Find removed files (in left but not in right)
    for file in &left_files {
        if !right_files.contains(file) {
            removed_files.push(file.clone());
        }
    }

    // Print results
    if !removed_files.is_empty() {
        println!("Removed files:");
        for file in &removed_files {
            println!("  - {}", file);
        }
    }

    if !added_files.is_empty() {
        println!("Added files:");
        for file in &added_files {
            println!("  + {}", file);
        }
    }

    println!("Common files: {}", common_files.len());
    println!("─");
    println!("Stats: {} added, {} removed, {} common", added_files.len(), removed_files.len(), common_files.len());

    Ok(())
}

/// Batch compare files matching a pattern
fn batch_compare(pattern: &str, directory: &str, _compare_backup: bool) -> Result<(), String> {
    println!("Batch comparing files matching '{}' in '{}'", pattern, directory);

    // TODO: Implement glob pattern matching
    println!("─");
    println!("Feature not yet fully implemented.");
    println!("Use 'compare' command for individual files.");

    Ok(())
}

/// Generate HTML diff report
fn generate_report(left_path: &str, right_path: &str, output_path: Option<String>) -> Result<(), String> {
    let default_output = format!("{}_{}_diff.html",
        Path::new(left_path).file_name().unwrap().to_string_lossy(),
        Path::new(right_path).file_name().unwrap().to_string_lossy()
    );
    let output = output_path.unwrap_or(default_output);

    // Generate report by calling compare with html output
    compare_text_files(left_path, right_path, "html", false, false, true)?;

    println!("─");
    println!("Report generated. To save, redirect output:");
    println!("  difflens report {} {} > {}", left_path, right_path, output);

    Ok(())
}

/// Process content based on comparison options
fn process_content(content: &str, ignore_whitespace: bool, ignore_case: bool) -> String {
    let mut result = content.to_string();

    if ignore_whitespace {
        // Remove trailing whitespace and normalize internal whitespace
        result = result.lines()
            .map(|line| line.trim_end())
            .collect::<Vec<_>>()
            .join("\n");
    }

    if ignore_case {
        result = result.to_lowercase();
    }

    result
}

/// Escape string for JSON output
fn escape_json(s: &str) -> String {
    s.replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
        .replace('\r', "\\r")
        .replace('\t', "\\t")
}

/// Escape string for HTML output
fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}