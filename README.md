**English** | [فارسی](README.fa.md)

# ZCode & AutoClaw — Safe Smart RTL Fixers

Safe, smart RTL (Right-to-Left) patches for **ZCode** and **AutoClaw** (ZhipuAI's Electron apps) that add Persian/Arabic support without breaking the UI.

Both patches keep the editor, sidebar, activity bar, terminal, and menus in LTR, and only apply RTL to content whose dominant script is Arabic/Persian.

| App | Patch script | Launcher (double-click) | Notes |
|---|---|---|---|
| [ZCode](https://zcode.app) | `zcode/zcode-rtl-patch.js` | `zcode/patch-zcode-mac.command` / `zcode/patch-zcode-windows.bat` | Optional Vazirmatn embedding (`--no-font`) |
| AutoClaw | `autoclaw/autoclaw-rtl-patch.js` | `autoclaw/patch-autoclaw-mac.command` / `autoclaw/patch-autoclaw-windows.bat` | Embeds Vazirmatn font, `--check` mode |

Both patchers use the pinned local `@electron/asar` library (installed once by `npm install` at the repo root) and share the bundled fonts in `fonts/`.

---

## 🟦 AutoClaw — Safe Smart RTL Fixer

Adds content-aware RTL to AutoClaw's chat UI (agent messages, your own messages, the input box) while the Chinese/English UI, terminal, menus, and sidebar stay LTR. Persian text also renders with the embedded **Vazirmatn** font — no font installation, no internet needed.

### ✨ Features

- **Content-only RTL**: agent markdown messages, your own chat bubbles, and lists/tables flip to RTL only when they contain Persian/Arabic text
- **RTL input box**: `textarea`/`input` get `dir="auto"` — typing Persian starts from the right, English stays LTR
- **Embedded Vazirmatn font**: the official variable font (weights 100–900, SIL OFL) is embedded into the patch at build time — fully offline, zero network requests. If Vazirmatn/Vazir is already installed on your system, the local copy is used first
- **UI Protected**: `.xterm` terminal, antd menus/dropdowns/sidebar, editors stay LTR
- **Preserves `app.asar.unpacked`**: the repack keeps native modules (koffi, @larksuite) unpacked exactly like the original
- **Verified repack**: the new archive is checked (file count, unpacked set, payload marker) before it replaces the original — a failure never touches your app
- **Safe**: automatic backup `app.asar.backup` — undo anytime with `--restore`
- **Update-safe**: after every AutoClaw auto-update, just run it again — it refreshes the backup, never downgrades
- **Read-only inspection**: `node autoclaw/autoclaw-rtl-patch.js --check` shows what would be patched, without touching anything

### 📋 Prerequisites

- [Node.js](https://nodejs.org/) >= 16
- AutoClaw installed (default locations are auto-detected; a manual path is accepted too)

### 🚀 Installation

#### 1. Clone or download this repo
```bash
git clone https://github.com/nimabhk/zcode-rtl-patch.git
cd zcode-rtl-patch
npm install        # one-time — installs the pinned @electron/asar library
```

#### 2. Close AutoClaw completely
Make sure AutoClaw is not running (Quit from Dock / Task Manager).

#### 3. Run the patch

**Easy way — double-click:**
- **macOS**: double-click `autoclaw/patch-autoclaw-mac.command` (checks Node, installs dependencies on first run, detects a running AutoClaw, offers a sudo retry)
- **Windows**: double-click `autoclaw/patch-autoclaw-windows.bat` (accept the administrator prompt)

**Or from the terminal:**
```bash
node autoclaw/autoclaw-rtl-patch.js
# Read-only inspection first (optional):
node autoclaw/autoclaw-rtl-patch.js --check
# If auto-detection fails, provide the path manually:
node autoclaw/autoclaw-rtl-patch.js "/Applications/AutoClaw.app/Contents/Resources/app.asar"
```

You should see:
```
🌟 AutoClaw Safe Smart RTL Fixer
✅ Found AutoClaw at: /Applications/AutoClaw.app/Contents/Resources/app.asar
📦 Creating backup...
📂 Extracting (308 MB — this takes a minute or two)...
💉 Injecting RTL logic...
🔤 Embedding Vazirmatn variable font (145 KB base64)
📦 Repacking...
🔍 Verifying repacked archive...
🔐 Fixing macOS signature...
✅ Success!
```

### 🔧 How it Works

1. Finds `app.asar` and backs it up (`app.asar.backup`)
2. Extracts it with the pinned `@electron/asar` library (no unpinned `npx` — supply chain stays locked)
3. Appends a self-contained block to `out/preload/index.js`:
   - CSS locks the UI LTR; textareas/inputs get `unicode-bidi: plaintext`
   - A debounced `MutationObserver` sets `dir="rtl"` on elements whose dominant script is RTL (majority rule — mixed sentences stay readable; raw user-bubble `div`s are detected by their *direct* text nodes, so layout wrappers never flip)
   - `textarea`/`input` get `dir="auto"`
   - An embedded `@font-face` (Vazirmatn variable, `local()` first, then a base64 data URI) styles RTL content and inputs
4. Repacks **preserving the exact unpacked file set**, verifies the new archive, then swaps it in atomically
5. On macOS, re-signs the bundle with a local ad-hoc signature (`xattr -cr` + `codesign`)

### ♻️ Uninstall / Restore

```bash
node autoclaw/autoclaw-rtl-patch.js --restore
```
Manual restore: copy `app.asar.backup` over `app.asar` in `AutoClaw.app/Contents/Resources/`, then re-sign:
```bash
sudo xattr -cr /Applications/AutoClaw.app
sudo codesign --sign - --force --deep /Applications/AutoClaw.app
```

### ⚠️ AutoClaw Notes

- **Notarized → ad-hoc signature**: AutoClaw ships with a notarized Developer ID signature. After patching it is re-signed ad-hoc locally — Gatekeeper still accepts the app, but:
  - macOS asks again for previously granted permissions (camera/mic/documents/…)
  - **Little Snitch** shows an *"application modified"* warning and re-asks old rules — expected, caused by the signature change
- **Auto-updates**: AutoClaw uses `electron-updater`; every update replaces `app.asar` and wipes the patch. Just re-run the script — it is update-safe.
- **Security posture**: the injected payload only touches the DOM — no network calls, no data collection. The embedded font travels inside the patch itself (no CDN/Google Fonts requests).
- AutoClaw's asar-integrity hash in `Info.plist` is not enforced (the Electron fuse is disabled), so modifying the asar does not prevent launch.

---

## 🟩 ZCode — Safe Smart RTL Fixer

A safe, smart RTL patch for [ZCode](https://zcode.app) (VS Code/Electron fork) that adds Persian/Arabic support without breaking the UI.

### ✨ Features

- **Sidebar Protected**: Editor, sidebar, menus, activity bar stay LTR
- **Smart Bidi**: each paragraph follows its dominant script — mixed Persian/English sentences stay readable
- **Smart Detection**: an element becomes RTL when Arabic-script characters dominate its text
- **RTL Inputs**: textareas/inputs use `unicode-bidi: plaintext` (fixes input caret jumps and first-line direction)
- **Optional Vazirmatn font**: embedded as base64 at patch time (`--no-font` to skip); taken from `fonts/` if bundled, otherwise downloaded once from the official Vazirmatn repo at patch time — never at app runtime
- **Safe**: Automatic backup — undo anytime with `--restore`
- **Update-Safe**: Detects ZCode updates and refreshes the backup — never downgrades
- **Cross-Platform**: macOS, Windows, Linux

### 🚀 Installation

#### 1. Clone or download this repo
```bash
git clone https://github.com/nimabhk/zcode-rtl-patch.git
cd zcode-rtl-patch
npm install        # one-time — installs the pinned @electron/asar library
```

#### 2. Close ZCode completely
Make sure ZCode is not running (Quit from Dock / Task Manager).

#### 3. Run the patch

**Easy way — double-click:**
- **macOS**: double-click `zcode/patch-zcode-mac.command` (checks Node, installs dependencies on first run, detects a running ZCode, offers a sudo retry)
- **Windows**: double-click `zcode/patch-zcode-windows.bat` (accept the administrator prompt)

**Or from the terminal:**

**On macOS:**
```bash
sudo node zcode/zcode-rtl-patch.js
# If auto-detection fails, provide path manually:
sudo node zcode/zcode-rtl-patch.js "/Applications/ZCode.app/Contents/Resources/app.asar"
```

**On Windows (PowerShell as Admin):**
```powershell
node zcode/zcode-rtl-patch.js
node zcode/zcode-rtl-patch.js "C:\Users\%USERNAME%\AppData\Local\Programs\ZCode\resources\app.asar"
```

**On Linux:**
```bash
sudo node zcode/zcode-rtl-patch.js
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
2. Loads the Vazirmatn font (bundled `fonts/`, or a one-time official-repo download) unless `--no-font` is given
3. Creates backup `app.asar.backup`
4. Extracts it with the pinned `@electron/asar` library (same supply-chain pinning as AutoClaw — no `npx`)
5. Injects CSS + MutationObserver into `out/preload/index.cjs`
   - CSS forces UI to stay LTR; embedded `@font-face` styles Persian content
   - JS observer sets `dir="rtl"` per paragraph using a dominant-script majority rule
6. Repacks `app.asar`
7. On macOS, fixes code signature with `xattr -cr` and `codesign`

### ♻️ Uninstall / Restore

**Automatic restore (recommended):**
```bash
node zcode/zcode-rtl-patch.js --restore
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

### ⚠️ ZCode Notes

- **Security reviewed**: the injected code only adjusts text direction in the DOM — no network calls, no data collection.
- **macOS permissions reset is expected**: patching re-signs the app, so macOS treats it as a new app and asks again for previously granted permissions. **Little Snitch** re-asks old rules with an *"application modified"* warning — caused by the patch, not malware.
- Re-run after every ZCode update (update-safe: refreshes the backup instead of restoring the old one).
- **No-patch alternative**: test Chromium's native RTL flags (mirrors the *entire* UI):
  ```bash
  /Applications/ZCode.app/Contents/MacOS/ZCode --force-ui-direction=rtl --force-text-direction=rtl
  ```

---

## 🛠️ Troubleshooting

| Error | Fix |
|-------|-----|
| `Could not find app.asar` | Provide the manual path as an argument |
| `EACCES / EPERM` | Run with `sudo` (macOS/Linux) or Admin PowerShell (Windows) |
| App not opening on Mac | `sudo xattr -cr <App.app> && sudo codesign --sign - --force --deep <App.app>` |
| `@electron/asar library was not found` | Run `npm install` in this folder (AutoClaw patcher only) |

---

## 📜 Changelog

**v1.2.1 — 2026-08-22**
- **AutoClaw**: payload ported to the same majority-script bidi rule as ZCode — English-leading mostly-Persian sentences stay readable; extended Arabic-script Unicode ranges; user-bubble detection now counts the dominant script (direct text nodes)
- **ZCode**: switched from `npx asar` to the pinned local `@electron/asar` library — fixes Windows (npx cannot run through argument-array calls there) and removes the unpinned-npx supply-chain concern
- **Supply chain**: Vazirmatn download URLs pinned to release tag `v33.003` (byte-identical to the bundled fonts) and restricted to `raw.githubusercontent.com` over https, redirects included
- **Repo layout**: patchers moved into per-app folders (`zcode/`, `autoclaw/`); ZCode launchers renamed to `patch-zcode-mac.command` / `patch-zcode-windows.bat`; shared fonts stay in `fonts/`; both patchers now share the repo-root `npm install`

**v1.2.0 — 2026-08-22**
- **New: AutoClaw patcher** (`autoclaw-rtl-patch.js`) with its own launchers
  - Content-only RTL for AutoClaw's chat UI: agent markdown, user bubbles (raw-text `div`s), lists, tables
  - RTL input boxes (`dir="auto"` on `textarea`/`input`)
  - **Embedded Vazirmatn variable font** (OFL) — offline, no CDN/Google Fonts requests; system-installed Vazirmatn/Vazir takes priority
  - Unpack-preserving repack (`app.asar.unpacked` layout kept bit-for-bit in file set)
  - Post-repack verification + atomic swap; a failed run never touches the app
  - Pinned local `@electron/asar` dependency (no unpinned `npx`) — argument-array tool calls, path-boundary checks
  - `--check` read-only inspection mode
- **ZCode patcher v1.2.0**:
  - Smart per-paragraph majority bidi — mixed Persian/English sentences stay readable
  - `unicode-bidi: plaintext` on inputs (fixes caret jumps and first-line direction)
  - Optional embedded Vazirmatn (Regular + Bold) with `--no-font` flag; `vazirmatn-font.js` loader uses bundled `fonts/` first, falls back to a one-time official-repo download at patch time (never at app runtime)
  - Wider Arabic-script Unicode ranges; CLI-argument hardening

**v1.1.0 — 2026-08-20**
- Update-safe backup handling: running the patch after a ZCode update refreshes the backup instead of restoring the old one (fixes silent downgrade)
- Idempotent injection: any previous patch is removed before re-injecting
- One-command undo: `node zcode-rtl-patch.js --restore`
- Double-click launchers: `patch-mac.command` and `patch-windows.bat`
- Re-signing now uses the detected app path instead of hardcoded `/Applications/ZCode.app`
- Console notes about expected macOS permission prompts (incl. Little Snitch)

**v1.0.0**
- Initial release: smart content-only RTL, sidebar protection, automatic backup

## 📄 Licenses

- Patch code: MIT — feel free to use and improve.
- [Vazirmatn](https://github.com/rastikerdar/vazirmatn) font by Saber Rastikerdar: SIL Open Font License 1.1 (bundled in `fonts/` for offline embedding).

### 🙏 Contributing

PRs are welcome! If you find a better preload path or edge case, open an issue.
