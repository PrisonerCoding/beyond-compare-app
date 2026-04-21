# DiffLens NSIS Custom Installer Script
# This file adds registry entries for context menu integration

# Add file comparison context menu
Section "Context Menu Integration"
  ; File comparison (for selecting 2 files)
  WriteRegStr HKCR "*\shell\DiffLens" "MUIVerb" "Compare with DiffLens"
  WriteRegStr HKCR "*\shell\DiffLens" "Icon" "$INSTDIR\DiffLens.exe"
  WriteRegStr HKCR "*\shell\DiffLens" "MultiSelectModel" "Player"
  WriteRegStr HKCR "*\shell\DiffLens\command" "" '"$INSTDIR\DiffLens.exe" compare "%1" "%2"'

  ; Folder comparison
  WriteRegStr HKCR "Directory\shell\DiffLens" "MUIVerb" "Compare folder with DiffLens"
  WriteRegStr HKCR "Directory\shell\DiffLens" "Icon" "$INSTDIR\DiffLens.exe"
  WriteRegStr HKCR "Directory\shell\DiffLens" "MultiSelectModel" "Player"
  WriteRegStr HKCR "Directory\shell\DiffLens\command" "" '"$INSTDIR\DiffLens.exe" compare "%1" "%2"'

  ; Background context menu (right click in folder)
  WriteRegStr HKCR "Directory\Background\shell\DiffLens" "MUIVerb" "Open DiffLens here"
  WriteRegStr HKCR "Directory\Background\shell\DiffLens" "Icon" "$INSTDIR\DiffLens.exe"
  WriteRegStr HKCR "Directory\Background\shell\DiffLens\command" "" '"$INSTDIR\DiffLens.exe"'
SectionEnd

# Remove registry entries on uninstall
Section "un.Context Menu Integration"
  DeleteRegKey HKCR "*\shell\DiffLens"
  DeleteRegKey HKCR "Directory\shell\DiffLens"
  DeleteRegKey HKCR "Directory\Background\shell\DiffLens"
SectionEnd