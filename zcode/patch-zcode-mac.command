#!/bin/bash
# ZCode RTL Patch — double-clickable launcher for macOS
cd "$(dirname "$0")" || exit 1

echo "🌟 ZCode RTL Patch (macOS launcher)"
echo "═══════════════════════════════════"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js not found. Install it from https://nodejs.org and run this file again."
  read -rp "Press Enter to close..."
  exit 1
fi

# One-time setup: the pinned @electron/asar library lives at the repo root
if [ ! -d "../node_modules/@electron/asar" ]; then
  echo "📥 Installing dependencies (one-time, repo root)..."
  (cd .. && npm install --no-fund --no-audit) || echo "⚠️ npm install failed — run it in the repo root, then retry."
fi

if pgrep -x "ZCode" >/dev/null 2>&1; then
  echo "⚠️  ZCode is currently running. Please quit it completely (Cmd+Q) first."
  read -rp "Press Enter once you have quit ZCode (Ctrl+C to abort)... "
fi

node zcode-rtl-patch.js "$@"
status=$?

if [ $status -ne 0 ]; then
  echo
  read -rp "Patch did not complete. Retry with administrator privileges (sudo)? [y/N]: " answer
  if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
    sudo node zcode-rtl-patch.js "$@"
    status=$?
  fi
fi

echo
if [ $status -eq 0 ]; then
  echo "✅ Done. Restart ZCode to see RTL support."
else
  echo "❌ Patch failed. See the messages above or the README Troubleshooting section."
fi
read -rp "Press Enter to close..."
