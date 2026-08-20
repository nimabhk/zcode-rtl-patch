# ZCode - Safe Smart RTL Fixer

A safe, smart RTL (Right-to-Left) patch for [ZCode](https://zcode.app) that adds Persian/Arabic support without breaking the UI.

This patch keeps the editor, sidebar, activity bar, and menus in LTR, and only applies RTL to content paragraphs that actually contain Arabic/Persian characters.

### ✨ Features

- **Sidebar Protected**: Editor, sidebar, menus, activity bar stay LTR
- **Smart Detection**: Only elements containing `[\u0600-\u06FF]` become RTL
- **Safe**: Creates automatic backup `app.asar.backup` — undo anytime with `--restore`
- **Update-Safe**: Detects ZCode updates and refreshes the backup — never downgrades your app
- **Cross-Platform**: Works on macOS, Windows, and Linux
- **Easy Launchers**: One double-click file for macOS and one for Windows

### 📋 Prerequisites

- [Node.js](https://nodejs.org/) >= 16
- ZCode installed

### 🚀 Installation

#### 1. Clone or download this repo
```bash
git clone https://github.com/nimabhk/zcode-rtl-patch.git
cd zcode-rtl-patch
```

#### 2. Close ZCode completely
Make sure ZCode is not running (Quit from Dock / Task Manager).

#### 3. Run the patch

**Easy way — double-click:**
- **macOS**: double-click `patch-mac.command` (checks Node, detects a running ZCode, offers a sudo retry if needed)
- **Windows**: double-click `patch-windows.bat` (accept the administrator prompt)

**Or from the terminal:**

**On macOS:**
```bash
sudo node zcode-rtl-patch.js
# If auto-detection fails, provide path manually:
sudo node zcode-rtl-patch.js "/Applications/ZCode.app/Contents/Resources/app.asar"
```

**On Windows (PowerShell as Admin):**
```powershell
node zcode-rtl-patch.js
# Or with manual path:
node zcode-rtl-patch.js "C:\Users\%USERNAME%\AppData\Local\Programs\ZCode\resources\app.asar"
```

**On Linux:**
```bash
sudo node zcode-rtl-patch.js
```

You should see:
```
🌟 ZCode Safe Smart RTL Fixer
✅ Found ZCode at: ...
📦 Creating backup...
📂 Extracting...
💉 Injecting RTL logic...
📦 Repacking...
✅ Success! ZCode is patched.
```

Now open ZCode again. Persian/Arabic paragraphs will auto-align to the right.

### 🔧 How it Works

The script:
1. Finds `app.asar` (Electron archive)
2. Creates backup `app.asar.backup`
3. Extracts it using `asar`
4. Injects CSS + MutationObserver into `out/preload/index.cjs`
   - CSS forces UI to stay LTR
   - JS observer sets `dir="rtl"` only for elements with RTL characters
5. Repacks `app.asar`
6. On macOS, fixes code signature with `xattr -cr` and `codesign`

### ♻️ Uninstall / Restore

**Automatic restore (recommended):**
```bash
node zcode-rtl-patch.js --restore
```

**Manual restore:**
```bash
# Windows
copy "%LOCALAPPDATA%\Programs\ZCode\resources\app.asar.backup" "%LOCALAPPDATA%\Programs\ZCode\resources\app.asar"

# macOS
sudo cp "/Applications/ZCode.app/Contents/Resources/app.asar.backup" "/Applications/ZCode.app/Contents/Resources/app.asar"
sudo xattr -cr /Applications/ZCode.app
sudo codesign --sign - --force --deep /Applications/ZCode.app

# Linux
sudo cp /opt/ZCode/resources/app.asar.backup /opt/ZCode/resources/app.asar
```

Or simply reinstall ZCode.

### ⚠️ Notes

- **Security reviewed**: the injected code only adjusts text direction in the DOM — no network calls, no data collection.
- **macOS permissions reset is expected**: patching re-signs the app, so macOS treats it as a new app and asks again for previously granted permissions. If you use **Little Snitch**, all old rules are re-asked with an *"application modified"* warning — this is caused by the patch, not by malware.
- Re-run the patch after every ZCode update (updates overwrite `app.asar`). It's update-safe: it detects updates and refreshes the backup instead of restoring the old one.
- **No-patch alternative**: test Chromium's native RTL flags (mirrors the *entire* UI, no modification, no re-signing):
  ```bash
  /Applications/ZCode.app/Contents/MacOS/ZCode --force-ui-direction=rtl --force-text-direction=rtl
  ```
- The patch does not modify your documents, only the app's UI logic.
- If ZCode doesn't start after patching on macOS, run:
  ```bash
  sudo xattr -cr /Applications/ZCode.app
  sudo codesign --sign - --force --deep /Applications/ZCode.app
  ```

### 🛠️ Troubleshooting

| Error | Fix |
|-------|-----|
| `Could not find app.asar` | Provide manual path as second argument |
| `EACCES / EPERM` | Run with `sudo` (macOS/Linux) or Admin PowerShell (Windows) |
| `ERR_INVALID_ARG_TYPE` with `LOCALAPPDATA` | You are using old Windows-only version, use `zcode-rtl-patch.js` (this repo) |
| ZCode not opening on Mac | Run the two `xattr` + `codesign` commands above |

### 📜 Changelog

**v1.1.0 — 2026-08-20**
- Update-safe backup handling: running the patch after a ZCode update refreshes the backup instead of restoring the old one (fixes silent downgrade)
- Idempotent injection: any previous patch is removed before re-injecting
- One-command undo: `node zcode-rtl-patch.js --restore`
- Double-click launchers: `patch-mac.command` and `patch-windows.bat`
- Re-signing now uses the detected app path instead of hardcoded `/Applications/ZCode.app`
- Console notes about expected macOS permission prompts (incl. Little Snitch)

**v1.0.0**
- Initial release: smart content-only RTL, sidebar protection, automatic backup

### 📄 License

MIT - Feel free to use and improve.

### 🙏 Contributing

PRs are welcome! If you find a better preload path or edge case, open an issue.
