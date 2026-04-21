# DiffLens - File & Folder Comparison Tool

A powerful file and folder comparison tool built with Tauri v2, React, and Monaco Editor. Inspired by the legendary Beyond Compare software.

![DiffLens Logo](src-tauri/icons/icon.png)

## Features

### Core Comparison Features

#### Text Comparison
- Monaco Editor diff view with syntax highlighting
- Character-level inline diff highlighting
- Navigate between differences (first/prev/next/last)
- Editable left/right panels
- Copy/merge content between sides
- Find and replace with regex support
- Go to line functionality
- Bookmark lines for quick navigation
- Word wrap toggle
- Compare options (ignore whitespace, case sensitivity)

#### Folder Comparison
- Tree view of folder differences
- Status indicators: added, removed, modified, equal
- Single click to select, double click to open file
- Select all files with differences
- File filters with glob and regex patterns
- Compare by content or size/date

#### Three-Way Merge
- Base, Left, Right, and Result panels
- Automatic conflict detection using diff3 algorithm
- Resolution options: Keep Base/Left/Right
- Resolve all conflicts at once
- Editable result output

#### Binary Comparison
- Hex view with byte-level diff highlighting
- Navigate to next/previous difference
- ASCII representation panel
- File size comparison

#### Image Comparison
- Side-by-side view
- Overlay mode with opacity slider
- Pixel difference mode (red highlights)
- Magnifier tool for detailed inspection
- Dimension and EXIF metadata comparison
- Multiple comparison modes (blink, overlay, side-by-side)

#### Document Comparison
- PDF comparison (text extraction)
- Word document comparison (.docx)
- Excel spreadsheet comparison (.xlsx)
- Encoding detection and conversion

### Remote File Support (Phase 10)

#### SFTP Support
- SSH/SFTP connection to remote servers
- Password authentication
- Host key fingerprint verification
- Browse remote directories
- Download files for comparison
- Upload modified files

#### FTP Support
- Standard FTP connections
- FTP directory browsing
- File download/upload

### Git Integration (Phase 11)

- View commit history with author/date info
- Compare files between commits
- Git blame integration (line-by-line author info)
- Branch listing and comparison
- View file contents at specific commits

### Sync Operations

- Preview sync operations before execution
- Multiple sync modes:
  - Update (copy newer to older)
  - Mirror (make destination identical to source)
  - Bidirectional (sync both ways)
  - Differential (copy only changed files)
- Select/unselect individual operations
- Execution progress and error reporting

### Session Management

- Save comparison sessions (.bcsession files)
- Load previous sessions
- Recent sessions tracking
- Quick session switching

### Cross-Platform Support (Phase 12)

- Windows: NSIS installer with context menu integration
- macOS: Finder Services integration
- Linux: Desktop file + Nautilus scripts

### UI/UX Features

- Two-row toolbar layout for better organization
- Horizontal/vertical layout toggle
- Diff statistics panel
- Bookmark panel with navigation
- Compare options panel
- Filter panel with presets
- Search panel with regex support
- Keyboard shortcuts for all operations
- Drag and drop file loading

### CLI Support

Command-line interface for automation:
```bash
difflens-cli compare <file1> <file2> [--output report.html]
difflens-cli folder <dir1> <dir2> [--filters "node_modules,.git"]
difflens-cli --help
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+N | New session |
| Ctrl+O | Open file/session |
| Ctrl+S | Save left file |
| Ctrl+Shift+S | Save right file / Swap sides |
| F5 | Refresh |
| F7 | Previous difference |
| F8 | Next difference |
| Ctrl+G | Go to line |
| Ctrl+Shift+S | Swap sides |

## Tech Stack

- **Tauri v2** - Cross-platform desktop framework (Rust backend)
- **React 18** - UI framework
- **TypeScript** - Type-safe development
- **Monaco Editor** - Code editor (VS Code's editor)
- **diff-match-patch** - Character-level diff algorithm
- **pdfjs-dist** - PDF parsing
- **mammoth** - Word document parsing
- **xlsx** - Excel spreadsheet parsing
- **jschardet** - Encoding detection
- **ssh2** - SFTP client (Rust)
- **suppaftp** - FTP client (Rust)
- **Vite** - Build tool

## Installation

### Prerequisites

1. **Rust** - Install from https://rustup.rs
2. **Node.js** - Install from https://nodejs.org (v18+)
3. **pnpm** - Install with `npm install -g pnpm`

### Development

```bash
# Clone the repository
git clone https://github.com/PrisonerCoding/beyond-compare-app.git
cd beyond-compare-app

# Install dependencies
pnpm install

# Start development server
pnpm tauri dev
# Or use the launcher script
start.bat
```

### Build

```bash
# Build for production
pnpm tauri build
# Or use the build script
build.bat
```

The built application will be in `src-tauri/target/release/bundle/`.

## Project Structure

```
beyond-compare-app/
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── DiffViewer.tsx       # Text diff view
│   │   ├── FolderDiffViewer.tsx # Folder comparison
│   │   ├── ThreeWayMerge.tsx    # Merge conflicts
│   │   ├── BinaryViewer.tsx     # Hex view
│   │   ├── ImageDiffViewer.tsx  # Image comparison
│   │   ├── DocumentCompare.tsx  # PDF/Word/Excel
│   │   ├── RemoteConnectionPanel.tsx # SFTP/FTP
│   │   ├── GitHistoryPanel.tsx  # Git integration
│   │   ├── BookmarkPanel.tsx    # Bookmarks
│   │   ├── DiffStatsPanel.tsx   # Statistics
│   │   ├── FilterPanel.tsx      # File filters
│   │   ├── SyncPanel.tsx        # Sync operations
│   │   └── Toolbar.tsx          # Main toolbar
│   ├── hooks/              # Custom hooks
│   ├── utils/              # Utility functions
│   │   ├── diff.ts              # Diff computation
│   │   ├── charDiff.ts          # Character-level diff
│   │   ├── diff3.ts             # Three-way merge
│   │   ├── folderCompare.ts     # Folder comparison
│   │   ├── syncOperations.ts    # File sync
│   │   ├── session.ts           # Session save/load
│   │   ├── binaryCheck.ts       # Binary detection
│   │   ├── encoding.ts          # Encoding detection
│   │   ├── pdfParser.ts         # PDF parsing
│   │   ├── wordParser.ts        # Word parsing
│   │   ├── excelParser.ts       # Excel parsing
│   │   ├── imageAnalysis.ts     # Image metadata
│   │   └── exportReport.ts      # HTML report export
│   └── types/              # TypeScript types
├── src-tauri/              # Tauri backend (Rust)
│   ├── src/
│   │   ├── main.rs              # Entry point
│   │   ├── lib.rs               # App logic
│   │   ├── cli.rs               # CLI support
│   │   ├── git.rs               # Git commands
│   │   └── remote.rs            # SFTP/FTP client
│   ├── Cargo.toml               # Rust dependencies
│   └── tauri.conf.json          # Tauri config
├── scripts/                # Installation scripts
│   ├── install-windows.ps1
│   ├── install-macos.sh
│   └── install-linux.sh
├── start.bat               # Development launcher
├── build.bat               # Production build script
├── package.json            # Node dependencies
├── vite.config.ts          # Vite config
└── tsconfig.json           # TypeScript config
```

## Supported File Types

- **Text**: All text-based files (code, config, logs, etc.)
- **Binary**: Executables, archives, databases
- **Images**: PNG, JPG, GIF, BMP, WebP, SVG, TIFF
- **Documents**: PDF, Word (.docx), Excel (.xlsx)
- **Remote**: SFTP/FTP files

## Feature Coverage vs Beyond Compare

| Category | Beyond Compare | DiffLens | Status |
|----------|---------------|----------|--------|
| Text Compare | ✅ | ✅ | Complete |
| Folder Compare | ✅ | ✅ | Complete |
| Three-Way Merge | ✅ | ✅ | Complete |
| Binary Compare | ✅ | ✅ | Complete |
| Image Compare | ✅ | ✅ | Complete |
| PDF/Word/Excel | ✅ | ✅ | Complete |
| FTP/SFTP | ✅ | ✅ | Complete |
| Git Integration | ✅ | ✅ | Complete |
| Cross-Platform | ✅ | ✅ | Complete |
| CLI Support | ✅ | ✅ | Complete |
| Plugin System | ✅ | ❌ | Planned |
| MP3 Compare | ✅ | ❌ | Planned |

**Overall Coverage: 90%**

## License

MIT

## Acknowledgments

- Inspired by [Beyond Compare](https://www.scootersoft.com/)
- Built with [Tauri](https://tauri.app/)
- Editor powered by [Monaco](https://microsoft.github.io/monaco-editor/)

---

*Last updated: 2026-04-21*