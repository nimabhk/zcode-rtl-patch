**English** | [فارسی](README.fa.md)

# ZCode & AutoClaw RTL Patch

Right-to-Left (Persian/Arabic) support for the **ZCode** and **AutoClaw** desktop apps. Only the text goes RTL — the UI, editor, terminal and menus stay untouched. Persian text renders with the embedded [Vazirmatn](https://github.com/rastikerdar/vazirmatn) font, fully offline.

| App | Patcher | Launcher (double-click) |
|---|---|---|
| ZCode | `zcode/zcode-rtl-patch.js` | `zcode/patch-zcode-mac.command` / `zcode/patch-zcode-windows.bat` |
| AutoClaw | `autoclaw/autoclaw-rtl-patch.js` | `autoclaw/patch-autoclaw-mac.command` / `autoclaw/patch-autoclaw-windows.bat` |

## Quick start

Requires [Node.js](https://nodejs.org/) ≥ 16.

```bash
git clone https://github.com/nimabhk/zcode-rtl-patch.git
cd zcode-rtl-patch
npm install        # one-time
```

1. Quit the app completely.
2. Double-click its launcher, or run `sudo node zcode/zcode-rtl-patch.js` (or `node autoclaw/autoclaw-rtl-patch.js`) from the terminal.
3. Reopen the app.

Useful flags: `--restore` (undo) · `--check` (AutoClaw: read-only preview) · `--no-font` (ZCode: skip font embedding).

## After patching (macOS) — expected

- Patching re-signs the app, so macOS asks again for previously granted permissions.
- **Little Snitch** shows an *"application modification"* alert when you open the app — click **Accept/Allow** so the app can start. This is caused by the patch, not malware.
- App updates overwrite the patch — just run the patcher again (it never downgrades; a clean backup is kept automatically).

Something went wrong? Run the patcher with `--restore`, or reinstall the app.

Full version history: [CHANGELOG.md](CHANGELOG.md)

## License

MIT (code) · Vazirmatn font by Saber Rastikerdar: SIL OFL 1.1
