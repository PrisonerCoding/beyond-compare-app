#!/bin/bash

# DiffLens Linux Integration Script
# Creates desktop entry and registers as file comparison tool

INSTALL_DIR="/opt/difflens"
APP_NAME="DiffLens"
EXECUTABLE="difflens"

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then
    echo "Please run with sudo: sudo ./install-linux.sh"
    exit 1
fi

# Create installation directory
mkdir -p "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR/bin"
mkdir -p "$INSTALL_DIR/share/icons"

# Copy executable (assume it's already built)
if [ -f "./difflens" ]; then
    cp ./difflens "$INSTALL_DIR/bin/"
    chmod +x "$INSTALL_DIR/bin/difflens"
fi

# Copy icon
if [ -f "./icons/icon.png" ]; then
    cp ./icons/icon.png "$INSTALL_DIR/share/icons/difflens.png"
fi

# Create desktop entry
DESKTOP_FILE="/usr/share/applications/difflens.desktop"
mkdir -p /usr/share/applications

cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Version=1.0
Name=DiffLens
GenericName=File Comparison Tool
Comment=Compare files and folders like a pro
Exec=$INSTALL_DIR/bin/difflens %F
Icon=$INSTALL_DIR/share/icons/difflens.png
Terminal=false
Type=Application
Categories=Utility;Development;FileTools;
MimeType=text/plain;inode/directory;
StartupNotify=true
EOF

chmod 644 "$DESKTOP_FILE"

# Create file comparison action (Nautilus/GNOME)
NAUTILUS_SCRIPTS="$HOME/.local/share/nautilus/scripts"
mkdir -p "$NAUTILUS_SCRIPTS"

cat > "$NAUTILUS_SCRIPTS/Compare with DiffLens" << 'SCRIPT'
#!/bin/bash

# Get selected files
files=()
for file in "$NAUTILUS_SCRIPT_SELECTED_FILE_PATHS"
do
    files+=("$file")
done

# Launch DiffLens
if [ ${#files[@]} -ge 2 ]; then
    /opt/difflens/bin/difflens compare "${files[0]}" "${files[1]}"
else
    zenity --error --text="Please select 2 files to compare"
fi
SCRIPT

chmod +x "$NAUTILUS_SCRIPTS/Compare with DiffLens"

# Register MIME types
MIME_FILE="/usr/share/mime/packages/difflens.xml"
cat > "$MIME_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">
    <mime-type type="application/x-difflens-session">
        <comment>DiffLens Session File</comment>
        <glob pattern="*.difflens-session"/>
    </mime-type>
</mime-info>
EOF

chmod 644 "$MIME_FILE"

# Update mime database
update-mime-database /usr/share/mime

# Update desktop database
update-desktop-database /usr/share/applications

echo "DiffLens Linux integration installed successfully!"
echo ""
echo "Usage:"
echo "  - Desktop: Open DiffLens from application menu"
echo "  - GNOME: Right-click 2 files -> Scripts -> Compare with DiffLens"
echo "  - Terminal: difflens compare file1 file2"
echo ""
echo "To uninstall:"
echo "  sudo rm /usr/share/applications/difflens.desktop"
echo "  sudo rm /opt/difflens"
echo "  rm ~/.local/share/nautilus/scripts/Compare with DiffLens"