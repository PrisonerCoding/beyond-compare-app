@echo off
chcp 65001 >nul
title DiffLens Debug Launcher

echo ================================
echo   DiffLens Debug Launcher
echo ================================
echo.
echo This window will stay open even if errors occur.
echo.

:: 设置 Rust 路径 - 确保 cargo 在 PATH 中
set PATH=%USERPROFILE%\.cargo\bin;%USERPROFILE%\.rustup\bin;%PATH%
set CARGO_HOME=%USERPROFILE%\.cargo
set RUSTUP_HOME=%USERPROFILE%\.rustup

:: 进入项目目录
cd /d "%~dp0"

echo [INFO] Current directory: %cd%
echo.

:: 显示环境信息
echo [INFO] Environment check:
echo.

where cargo >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] cargo NOT found
) else (
    echo [OK] cargo found
    cargo --version
)

where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] pnpm NOT found
) else (
    echo [OK] pnpm found
    pnpm --version
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] node NOT found
) else (
    echo [OK] node found
    node --version
)

echo.
echo [INFO] Checking project files...
echo.

if exist "package.json" (
    echo [OK] package.json exists
) else (
    echo [ERROR] package.json NOT found - wrong directory!
)

if exist "src-tauri\Cargo.toml" (
    echo [OK] Cargo.toml exists
) else (
    echo [ERROR] src-tauri\Cargo.toml NOT found!
)

if exist "node_modules" (
    echo [OK] node_modules exists
) else (
    echo [WARN] node_modules NOT found - will need to install
)

echo.
echo ================================
echo   Ready to start
echo ================================
echo.
echo Press any key to start pnpm tauri dev...
echo (Window will stay open after completion)
echo.
pause >nul

:: 运行命令，无论成功失败都保持窗口打开
echo [INFO] Running: pnpm tauri dev
echo.
pnpm tauri dev

echo.
echo ================================
echo   Command finished (exit code: %errorlevel%)
echo ================================
echo.
echo Window will stay open. Press any key to close...
pause >nul