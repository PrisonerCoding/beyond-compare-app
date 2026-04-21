@echo off
chcp 65001 >nul
title DiffLens Launcher

echo ================================
echo   DiffLens Launcher
echo ================================
echo.

cd /d "%~dp0"

:: 设置 Rust 路径 - 确保 cargo 在 PATH 中
set PATH=%USERPROFILE%\.cargo\bin;%USERPROFILE%\.rustup\bin;%PATH%
set CARGO_HOME=%USERPROFILE%\.cargo
set RUSTUP_HOME=%USERPROFILE%\.rustup

echo Current directory: %cd%
echo.
echo Starting Tauri dev...
echo.

pnpm tauri dev

echo.
echo Exit code: %errorlevel%
echo.
pause