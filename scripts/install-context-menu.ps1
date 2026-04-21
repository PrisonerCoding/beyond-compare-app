# DiffLens Windows Registry Integration
# Adds context menu entries for file/folder comparison

# Run this script with: powershell -ExecutionPolicy Bypass -File install-context-menu.ps1

param(
    [string]$Action = "install",
    [string]$InstallPath = ""
)

# Find install path
if ($InstallPath -eq "") {
    $InstallPath = Split-Path -Parent $MyInvocation.MyCommand.Path
}

$ExePath = Join-Path $InstallPath "beyond-compare.exe"

# Check if executable exists
if (-not (Test-Path $ExePath)) {
    Write-Error "Executable not found at: $ExePath"
    Write-Host "Please build the application first with: pnpm tauri build"
    exit 1
}

function Install-ContextMenu {
    Write-Host "Installing DiffLens context menu integration..."

    # File comparison - Compare with DiffLens (select 2 files)
    $fileKey = "HKCR:\*\shell\DiffLens"
    New-Item -Path $fileKey -Force | Out-Null
    Set-ItemProperty -Path $fileKey -Name "MUIVerb" -Value "Compare with DiffLens"
    Set-ItemProperty -Path $fileKey -Name "Icon" -Value $ExePath
    Set-ItemProperty -Path $fileKey -Name "MultiSelectModel" -Value "Player"

    $fileCommandKey = "$fileKey\command"
    New-Item -Path $fileCommandKey -Force | Out-Null
    Set-ItemProperty -Path $fileCommandKey -Name "(default)" -Value "`"$ExePath`" compare `"%1`" `"%2`""

    # Folder comparison
    $folderKey = "HKCR:\Directory\shell\DiffLens"
    New-Item -Path $folderKey -Force | Out-Null
    Set-ItemProperty -Path $folderKey -Name "MUIVerb" -Value "Compare folder with DiffLens"
    Set-ItemProperty -Path $folderKey -Name "Icon" -Value $ExePath
    Set-ItemProperty -Path $folderKey -Name "MultiSelectModel" -Value "Player"

    $folderCommandKey = "$folderKey\command"
    New-Item -Path $folderCommandKey -Force | Out-Null
    Set-ItemProperty -Path $folderCommandKey -Name "(default)" -Value "`"$ExePath`" compare `"%1`" `"%2`""

    # Background context menu (right click in empty space)
    $bgKey = "HKCR:\Directory\Background\shell\DiffLens"
    New-Item -Path $bgKey -Force | Out-Null
    Set-ItemProperty -Path $bgKey -Name "MUIVerb" -Value "Open DiffLens here"
    Set-ItemProperty -Path $bgKey -Name "Icon" -Value $ExePath

    $bgCommandKey = "$bgKey\command"
    New-Item -Path $bgCommandKey -Force | Out-Null
    Set-ItemProperty -Path $bgCommandKey -Name "(default)" -Value "`"$ExePath`""

    Write-Host "Context menu integration installed successfully!"
    Write-Host ""
    Write-Host "New context menu options:"
    Write-Host "  - Select 2 files -> Right click -> 'Compare with DiffLens'"
    Write-Host "  - Select 2 folders -> Right click -> 'Compare folder with DiffLens'"
    Write-Host "  - Right click in folder -> 'Open DiffLens here'"
}

function Uninstall-ContextMenu {
    Write-Host "Uninstalling DiffLens context menu integration..."

    # Remove file context menu
    Remove-Item -Path "HKCR:\*\shell\DiffLens" -Recurse -Force -ErrorAction SilentlyContinue

    # Remove folder context menu
    Remove-Item -Path "HKCR:\Directory\shell\DiffLens" -Recurse -Force -ErrorAction SilentlyContinue

    # Remove background context menu
    Remove-Item -Path "HKCR:\Directory\Background\shell\DiffLens" -Recurse -Force -ErrorAction SilentlyContinue

    Write-Host "Context menu integration uninstalled successfully!"
}

# Main execution
switch ($Action) {
    "install" {
        Install-ContextMenu
    }
    "uninstall" {
        Uninstall-ContextMenu
    }
    default {
        Write-Host "Usage: .\install-context-menu.ps1 -Action [install|uninstall]"
        Write-Host "  install   - Add context menu entries"
        Write-Host "  uninstall - Remove context menu entries"
    }
}