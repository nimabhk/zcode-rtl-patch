#!/bin/bash
# AutoClaw RTL Patch — double-clickable launcher for macOS
cd "$(dirname "$0")" || exit 1

echo "🌟 AutoClaw RTL Patch (macOS launcher)"
echo "═══════════════════════════════════════"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js not found. Install it from https://nodejs.org and run this file again."
  read -rp "Press Enter to close..."
  exit 1
fi

# One-time setup: the patcher needs the pinned @electron/asar library
if [ ! -d "node_modules/@electron/asar" ]; then
  echo "📦 First run — installing dependencies (npm install)..."
  npm install --no-fund --no-audit
  if [ $? -ne 0 ]; then
    echo "❌ npm install failed. Run it manually in this folder and try again."
    read -rp "Press Enter to close..."
    exit 1
  fi
fi

if pgrep -x "AutoClaw" >/dev/null 2>&1; then
  echo "⚠️  AutoClaw is currently running. Please quit it completely (Cmd+Q) first."
  read -rp "Press Enter once you have quit AutoClaw (Ctrl+C to abort)... "
fi

node autoclaw-rtl-patch.js "$@"
status=$?

if [ $status -ne 0 ]; then
  echo
  read -rp "Patch did not complete. Retry with administrator privileges (sudo)? [y/N]: " answer
  if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
    sudo node autoclaw-rtl-patch.js "$@"
    status=$?
  fi
fi

echo
if [ $status -eq 0 ]; then
  echo "✅ Done. Restart AutoClaw to see RTL support."
else
  echo "❌ Patch failed. See the messages above or the README Troubleshooting section."
fi
read -rp "Press Enter to close..."
