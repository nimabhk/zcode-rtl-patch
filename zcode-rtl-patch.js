#!/usr/bin/env node
/**
 * ZCode - Safe Smart RTL Fixer (Sidebar Protected)
 * Cross-platform: Windows, macOS, Linux
 * 
 * What it does:
 * - Keeps UI, sidebar, editor LTR
 * - Auto-detects Persian/Arabic text and sets dir="rtl" only for content
 * - Update-safe: detects ZCode updates and refreshes the backup (never downgrades)
 * - Idempotent: safe to run multiple times; undo with --restore
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

console.log("\n🌟 ZCode Safe Smart RTL Fixer (Cross-Platform)");
console.log("═══════════════════════════════════════════════════\n");

const PATCH_MARKER = "SAFE SMART RTL FIX";

// Search a large binary file for a marker without loading it all into memory
function fileContains(filePath, needle) {
  const fd = fs.openSync(filePath, "r");
  const chunkSize = 16 * 1024 * 1024;
  const overlap = Buffer.byteLength(needle) - 1;
  const chunk = Buffer.alloc(chunkSize + overlap);
  try {
    let pos = 0;
    for (;;) {
      const bytesRead = fs.readSync(fd, chunk, 0, chunk.length, pos);
      if (bytesRead === 0) return false;
      if (chunk.slice(0, bytesRead).includes(needle)) return true;
      if (bytesRead < chunk.length) return false;
      pos += bytesRead - overlap;
    }
  } finally {
    fs.closeSync(fd);
  }
}

// <Bundle.app>/Contents/Resources/app.asar -> <Bundle.app>
function appBundlePath(asar) {
  const bundle = path.resolve(path.dirname(asar), "..", "..");
  return path.basename(bundle).endsWith(".app") ? bundle : null;
}

// Minimal shell quoting for execSync string commands
const shq = (p) => `"${String(p).replace(/"/g, '\\"')}"`;

function findAsarPath() {
  const home = os.homedir();
  const candidates = [];

  if (process.platform === "darwin") {
    candidates.push(
      "/Applications/ZCode.app/Contents/Resources/app.asar",
      path.join(home, "Applications/ZCode.app/Contents/Resources/app.asar"),
      "/Applications/ZCode.app/Contents/Resources/resources/app.asar"
    );
  } else if (process.platform === "win32") {
    const { LOCALAPPDATA, PROGRAMFILES, APPDATA } = process.env;
    if (LOCALAPPDATA) candidates.push(path.join(LOCALAPPDATA, "Programs", "ZCode", "resources", "app.asar"));
    if (PROGRAMFILES) candidates.push(path.join(PROGRAMFILES, "ZCode", "resources", "app.asar"));
    if (APPDATA) candidates.push(path.join(APPDATA, "ZCode", "resources", "app.asar"));
  } else {
    candidates.push(
      "/opt/ZCode/resources/app.asar",
      "/usr/lib/zcode/resources/app.asar",
      "/usr/share/zcode/resources/app.asar"
    );
  }

  // Manual path from CLI arg
  if (process.argv[2] && fs.existsSync(process.argv[2])) {
    return process.argv[2];
  }

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

let asarPath = findAsarPath();

if (!asarPath) {
  console.error("❌ Could not find app.asar automatically.");
  console.error("\nPlease provide manual path:");
  console.error('  node zcode-rtl-patch.js "/Applications/ZCode.app/Contents/Resources/app.asar"');
  console.error("\nHow to find it on Mac: Right-click ZCode in Applications -> Show Package Contents -> Contents -> Resources");
  process.exit(1);
}

const zcodeDir = path.dirname(asarPath);
const backupPath = path.join(zcodeDir, "app.asar.backup");
const unpackedPath = path.join(os.tmpdir(), `zcode_extracted_${Date.now()}`);

console.log(`✅ Found ZCode at: ${asarPath}`);

// --- Undo: restore the clean backup ---
if (process.argv.includes("--restore")) {
  if (!fs.existsSync(backupPath)) {
    console.error("❌ No backup found. Nothing to restore.");
    process.exit(1);
  }
  if (fileContains(backupPath, PATCH_MARKER)) {
    console.error("❌ Backup itself contains the patch. Reinstall ZCode to fully restore.");
    process.exit(1);
  }
  console.log("♻️  Restoring original app.asar from backup...");
  fs.copyFileSync(backupPath, asarPath);
  if (process.platform === "darwin") {
    const bundle = appBundlePath(asarPath);
    if (bundle) {
      console.log("🔐 Re-signing app bundle...");
      execSync(`xattr -cr ${shq(bundle)}`, { stdio: "pipe" });
      execSync(`codesign --sign - --force --deep ${shq(bundle)}`, { stdio: "pipe" });
    }
  }
  console.log("\n✅ Restored. Restart ZCode (macOS may ask for permissions again — that's expected).\n");
  process.exit(0);
}

try {
  // 1. Backup management — never restore an outdated backup over a newer app.asar
  const backupExists = fs.existsSync(backupPath);
  const currentPatched = fileContains(asarPath, PATCH_MARKER);

  if (!backupExists) {
    console.log("📦 Creating backup...");
    fs.copyFileSync(asarPath, backupPath);
  } else if (!currentPatched) {
    // Current app.asar is clean: either ZCode updated, or the user restored it.
    // Refreshing the backup from it is always safe and prevents downgrades.
    console.log("📦 Current app.asar is unpatched — refreshing backup from it (update-safe, no downgrade).");
    fs.copyFileSync(asarPath, backupPath);
  } else if (!fileContains(backupPath, PATCH_MARKER)) {
    console.log("📦 Restoring clean backup (same ZCode version)...");
    fs.copyFileSync(backupPath, asarPath);
  } else {
    console.log("⚠️ Backup also contains the patch — will clean the preload file directly instead.");
  }

  // 2. Extract
  console.log("📂 Extracting...");
  if (fs.existsSync(unpackedPath)) fs.rmSync(unpackedPath, { recursive: true, force: true });

  let extracted = false;
  for (let i = 0; i < 10 && !extracted; i++) {
    try {
      execSync(`npx asar extract ${shq(asarPath)} ${shq(unpackedPath)}`, { stdio: "pipe" });
      extracted = true;
    } catch (err) {
      const stderr = err.stderr?.toString() || "";
      const match = stderr.match(/ENOENT: no such file or directory, open '([^']+)'/);
      if (match) {
        fs.mkdirSync(path.dirname(match[1]), { recursive: true });
        fs.writeFileSync(match[1], "");
      } else {
        if (i === 0) {
          console.log("   Installing asar...");
          execSync("npm install -g asar", { stdio: "inherit" });
        }
      }
    }
  }

  if (!extracted) throw new Error("Failed to extract app.asar");

  // 3. Find preload file
  console.log("💉 Injecting RTL logic...");
  const preloadCandidates = [
    path.join(unpackedPath, "out", "preload", "index.cjs"),
    path.join(unpackedPath, "dist", "preload", "index.cjs"),
    path.join(unpackedPath, "out", "preload", "index.js"),
  ];

  let preloadPath = preloadCandidates.find(p => fs.existsSync(p));

  if (!preloadPath) {
    // Fallback recursive search
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const found = walk(full);
          if (found) return found;
        } else if (entry.name.includes("preload") && (entry.name.endsWith(".cjs") || entry.name.endsWith(".js"))) {
          return full;
        }
      }
      return null;
    };
    preloadPath = walk(unpackedPath);
  }

  if (!preloadPath) throw new Error("preload file not found");

  console.log(`   Found: ${preloadPath.replace(unpackedPath, "")}`);

  // Idempotent: strip any previous injection, then append fresh code
  let preloadContent = fs.readFileSync(preloadPath, "utf8");
  const markerIndex = preloadContent.indexOf(`// --- ${PATCH_MARKER}`);
  if (markerIndex !== -1) {
    console.log("🧹 Removing previous injection...");
    preloadContent = preloadContent.slice(0, markerIndex).replace(/\s+$/, "") + "\n";
    fs.writeFileSync(preloadPath, preloadContent);
  }
  const safeRtlCode = `
// --- SAFE SMART RTL FIX FOR ZCODE (SIDEBAR PROTECTED) ---
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.id = 'zcode-rtl-fix';
    if (!document.getElementById('zcode-rtl-fix')) {
      style.innerHTML = "body, html { direction: ltr !important; } pre, code, pre *, code *, .editor-instance *, [class*='editor'], aside *, nav *, [class*='sidebar' i] *, [class*='activitybar' i] *, [class*='menu' i] * { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; } p, h1, h2, h3, h4, h5, h6, span { unicode-bidi: plaintext !important; text-align: start !important; } ol[dir='rtl'], ul[dir='rtl'] { direction: rtl !important; padding-right: 40px !important; padding-left: 0 !important; margin-right: 10px !important; } ol[dir='rtl'] li, ul[dir='rtl'] li { direction: rtl !important; text-align: right !important; } table[dir='rtl'] { direction: rtl !important; text-align: right !important; }";
      document.head.appendChild(style);
    }
    const observer = new MutationObserver(() => {
      document.querySelectorAll('ul, ol, p, table, span, li, h1, h2, h3').forEach(el => {
        if (el.closest('pre') || el.closest('code') || el.closest('[class*="editor"]') || el.closest('aside') || el.closest('nav') || el.closest('[class*="sidebar" i]') || el.closest('[class*="menu" i]')) return;
        const hasRTL = /[\\u0600-\\u06FF]/.test(el.textContent);
        if (hasRTL && el.getAttribute('dir') !== 'rtl') {
          el.setAttribute('dir', 'rtl');
        } else if (!hasRTL && el.getAttribute('dir') === 'rtl') {
          el.removeAttribute('dir');
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
`;
  fs.appendFileSync(preloadPath, safeRtlCode);

  // 4. Repack
  console.log("📦 Repacking...");
  execSync(`npx asar pack ${shq(unpackedPath)} ${shq(asarPath)}`, { stdio: "pipe" });

  // 5. Cleanup
  fs.rmSync(unpackedPath, { recursive: true, force: true });

  // 6. macOS fix: re-sign after patch (uses the detected app bundle path)
  if (process.platform === "darwin") {
    const bundle = appBundlePath(asarPath);
    if (!bundle) {
      console.log("   Note: Could not detect app bundle path, re-sign manually:");
      console.log('   sudo xattr -cr /Applications/ZCode.app && sudo codesign --sign - --force --deep /Applications/ZCode.app');
    } else {
      try {
        console.log("🔐 Fixing macOS signature...");
        execSync(`xattr -cr ${shq(bundle)}`, { stdio: "pipe" });
        execSync(`codesign --sign - --force --deep ${shq(bundle)}`, { stdio: "pipe" });
        console.log("   Signature fixed.");
      } catch (e) {
        console.log("   Note: Could not auto-fix signature, run manually:");
        console.log(`   sudo xattr -cr ${bundle} && sudo codesign --sign - --force --deep ${bundle}`);
      }
    }
  }

  console.log("\n✅ Success! ZCode is patched. Restart ZCode to see RTL support.");
  console.log("\nℹ️  Expected after patching (macOS):");
  console.log("   • macOS will ask again for previously granted permissions (the app signature changed).");
  console.log("   • Little Snitch / firewall tools will show an 'application modified' warning and re-ask old rules.");
  console.log("   • After every ZCode update, just run this script again — it is update-safe (no downgrade).\n");

} catch (error) {
  console.error("\n❌ Error:", error.message);
  if (error.message.includes("EACCES") || error.message.includes("EPERM")) {
    console.error("\n💡 Permission error. Try with sudo:");
    console.error("   sudo node zcode-rtl-patch.js");
  }
  if (fs.existsSync(unpackedPath)) {
    try { fs.rmSync(unpackedPath, { recursive: true, force: true }); } catch {}
  }
}
