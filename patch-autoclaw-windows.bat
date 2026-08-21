@echo off
chcp 65001 >nul
title AutoClaw RTL Patch
cd /d "%~dp0"

:: Self-elevate to administrator (patching app files usually requires it)
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Requesting administrator privileges...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install it from https://nodejs.org and run this file again.
  pause
  exit /b 1
)

:: One-time setup: the patcher needs the pinned @electron/asar library
if not exist "node_modules\@electron\asar" (
  echo First run — installing dependencies ^(npm install^)...
  call npm install --no-fund --no-audit
  if errorlevel 1 (
    echo [ERROR] npm install failed. Run it manually in this folder and try again.
    pause
    exit /b 1
  )
)

echo Make sure AutoClaw is fully closed before continuing.
pause

node autoclaw-rtl-patch.js %*
echo.
if %errorlevel% equ 0 (
  echo Done. Restart AutoClaw to see RTL support.
) else (
  echo Patch failed. See the messages above or the README Troubleshooting section.
)
pause
