#!/bin/bash

# DiffLens macOS Integration Script
# Installs context menu integration for Finder

INSTALL_PATH="/Applications/DiffLens.app"

# Check if app exists
if [ ! -d "$INSTALL_PATH" ]; then
    echo "Error: DiffLens.app not found in /Applications"
    echo "Please install DiffLens first"
    exit 1
fi

# Create Automator Service for file comparison
echo "Creating Finder Service for DiffLens..."

# Create the service directory
SERVICE_DIR="$HOME/Library/Services"
mkdir -p "$SERVICE_DIR"

# Create Quick Action for comparing files
# This uses Automator's concept but via plist

SERVICE_NAME="DiffLens Compare"
SERVICE_PLIST="$SERVICE_DIR/${SERVICE_NAME}.workflow"

# Create workflow content
mkdir -p "$SERVICE_PLIST/Contents"
cat > "$SERVICE_PLIST/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSServices</key>
    <array>
        <dict>
            <key>NSMenuItem</key>
            <dict>
                <key>default</key>
                <string>Compare with DiffLens</string>
            </dict>
            <key>NSMessage</key>
            <string>runWorkflow</string>
            <key>NSRequiredContext</key>
            <dict>
                <key>NSApplicationIdentifier</key>
                <string>com.apple.finder</string>
            </dict>
            <key>NSSendFileTypes</key>
            <array>
                <string>public.item</string>
            </dict>
            <key>NSServiceDescription</key>
            <string>Compare selected files with DiffLens</string>
        </dict>
    </array>
</dict>
</plist>
EOF

# Create the workflow document
cat > "$SERVICE_PLIST/Contents/document.wflow" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>AMApplicationVersion</key>
    <string>2.9</string>
    <key>AMActions</key>
    <array>
        <dict>
            <key>Action</key>
            <dict>
                <key>AMActionVersion</key>
                <string>2.0.3</string>
                <key>AMApplication</key>
                <array>
                    <string>Automator</string>
                </array>
                <key>AMBundleIdentifier</key>
                <string>com.apple.RunShellScript</string>
                <key>AMCategory</key>
                <string>AMCategoryUtilities</string>
                <key>AMName</key>
                <string>Run Shell Script</string>
                <key>AMParameterProperties</key>
                <dict>
                    <key>source</key>
                    <dict/>
                    <key>COMMAND_STRING</key>
                    <dict/>
                    <key>CheckForErrors</key>
                    <dict>
                        <key>Value</key>
                        <string>NO</string>
                    </dict>
                </dict>
                <key>AMProvides</key>
                <dict>
                    <key>AMActionClass</key>
                    <string>AMAppleScriptActionBundle</string>
                </dict>
            </dict>
        </dict>
    </array>
    <key>AMDocumentVersion</key>
    <string>2</string>
</dict>
</plist>
EOF

# Create shell script content
cat > "$SERVICE_PLIST/Contents/Resources/script.sh" << 'SCRIPT'
#!/bin/bash

# Get selected files from Finder
files=()
for f in "$@"
do
    files+=("$f")
done

# Open DiffLens with selected files
if [ ${#files[@]} -ge 2 ]; then
    open -a DiffLens --args compare "${files[0]}" "${files[1]}"
else
    open -a DiffLens
fi
SCRIPT

chmod +x "$SERVICE_PLIST/Contents/Resources/script.sh"

# Restart Finder to pick up new services
killall Finder

echo "DiffLens macOS integration installed successfully!"
echo ""
echo "Usage:"
echo "  - Select 2 files in Finder"
echo "  - Right-click -> Quick Actions -> Compare with DiffLens"
echo "  - Or use Services menu -> Compare with DiffLens"
echo ""
echo "To uninstall, remove: ~/Library/Services/DiffLens Compare.workflow"