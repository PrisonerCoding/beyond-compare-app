# Beyond Compare Clone

A powerful file and folder comparison tool built with Tauri v2, React, and Monaco Editor. Inspired by the legendary Beyond Compare software.

## Features

### Text Comparison
- Monaco Editor diff view with syntax highlighting
- Character-level inline diff highlighting
- Navigate between differences (first/prev/next/last)
- Editable left/right panels
- Copy/merge content between sides
- Find and replace with regex support

### Folder Comparison
- Tree view of folder differences
- Status indicators: added, removed, modified, equal
- Single click to select, double click to open file
- Select all files with differences
- File filters with glob and regex patterns

### Three-Way Merge
- Base, Left, Right, and Result panels
- Automatic conflict detection
- Resolution options: Keep Base/Left/Right
- Resolve all conflicts at once
- Editable result output

### Binary Comparison
- Hex view with byte-level diff highlighting
- Navigate to next/previous difference
- ASCII representation panel
- File size comparison

### Image Comparison
- Side-by-side view
- Overlay mode with opacity slider
- Pixel difference mode (red highlights)
- Dimension comparison

### Sync Operations
- Preview sync operations before execution
- Select/unselect individual operations
- Copy left-to-right or right-to-left
- Delete files from either side
- Execution progress and error reporting

### Session Management
- Save comparison sessions (.bcsession files)
- Load previous sessions
- Recent sessions tracking

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| Ctrl+S | Save left file |
| Ctrl+Shift+S | Save right file |
| Ctrl+O | Open file |
| F7 | Previous difference |
| F8 | Next difference |
| Ctrl+Shift+X | Swap sides |
| F5 | Refresh |

## Tech Stack

- **Tauri v2** - Cross-platform desktop framework (Rust backend)
- **React 18** - UI framework
- **TypeScript** - Type-safe development
- **Monaco Editor** - Code editor (VS Code's editor)
- **diff-match-patch** - Character-level diff algorithm
- **Vite** - Build tool

## Installation

### Prerequisites

1. **Rust** - Install from https://rustup.rs
2. **Node.js** - Install from https://nodejs.org
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
```

### Build

```bash
# Build for production
pnpm tauri build
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
│   │   ├── FilterPanel.tsx      # File filters
│   │   ├── SyncPanel.tsx        # Sync operations
│   │   └── Toolbar.tsx          # Main toolbar
│   ├── hooks/              # Custom hooks
│   ├── utils/              # Utility functions
│   │   ├── diff.ts              # Diff computation
│   │   ├── charDiff.ts          # Character-level diff
│   │   ├── folderCompare.ts     # Folder comparison
│   │   ├── syncOperations.ts    # File sync
│   │   ├── session.ts           # Session save/load
│   │   └── binaryCheck.ts       # Binary detection
│   └── types/              # TypeScript types
├── src-tauri/              # Tauri backend (Rust)
│   ├── src/
│   │   ├── main.rs              # Entry point
│   │   └── lib.rs               # App logic
│   ├── Cargo.toml               # Rust dependencies
│   └── tauri.conf.json          # Tauri config
├── package.json             # Node dependencies
├── vite.config.ts           # Vite config
└── tsconfig.json            # TypeScript config
```

## Supported File Types

- **Text**: All text-based files (code, config, logs, etc.)
- **Binary**: Executables, archives, databases
- **Images**: PNG, JPG, GIF, BMP, WebP, SVG, TIFF

## License

MIT

## Acknowledgments

- Inspired by [Beyond Compare](https://www.scootersoft.com/)
- Built with [Tauri](https://tauri.app/)
- Editor powered by [Monaco](https://microsoft.github.io/monaco-editor/)