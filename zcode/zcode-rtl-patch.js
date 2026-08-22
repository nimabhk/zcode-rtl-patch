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
 * - Smart bidi: per-paragraph majority direction (mixed EN/FA sentences stay readable),
 *   plaintext textareas (fixes input caret jumps and first-line direction)
 * - Optional Vazirmatn font embedding (--no-font to skip)
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

console.log("\n🌟 ZCode Safe Smart RTL Fixer (Cross-Platform)");
console.log("═══════════════════════════════════════════════════\n");

// --- @electron/asar library (local install keeps the supply chain pinned) ---
let asarLib;
try {
  asarLib = require("@electron/asar");
} catch {
  console.error("❌ The @electron/asar library was not found.");
  console.error("\nInstall it once, then run again:");
  console.error("   npm install     (at the repo root)");
  console.error("\nOr use the double-click launcher — it installs it automatically.");
  process.exit(1);
}

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
  const bundle = path.dirname(path.dirname(path.dirname(asar)));
  return path.basename(bundle).endsWith(".app") ? bundle : null;
}

// True when target resolves inside base (prefix containment, no parent hops)
function isInsideDir(target, base) {
  const root = path.resolve(base) + path.sep;
  return path.resolve(target).startsWith(root);
}

// External tools are invoked with literal command names and argument arrays —
// never through a shell string, so paths cannot turn into shell syntax.
function reSignBundle(bundle) {
  execFileSync("xattr", ["-cr", bundle], { stdio: "pipe" });
  execFileSync("codesign", ["--sign", "-", "--force", "--deep", bundle], { stdio: "pipe" });
}

const PATCH_VERSION = "1.2.5";
const { getVazirmatnFont } = require("./vazirmatn-font");

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

  // Manual path from CLI arg (skip flags like --restore / --no-font)
  const manualArg = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (manualArg && path.basename(manualArg) === "app.asar" && fs.existsSync(manualArg)) {
    return manualArg;
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
  console.error('  node zcode/zcode-rtl-patch.js "/Applications/ZCode.app/Contents/Resources/app.asar"');
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
      reSignBundle(bundle);
    }
  }
  console.log("\n✅ Restored. Restart ZCode (macOS may ask for permissions again — that's expected).\n");
  process.exit(0);
}

async function main() {
try {
  // 0. Optional Vazirmatn font (embedded as base64 into the injected CSS)
  const fontData = await getVazirmatnFont(process.argv.includes("--no-font"));

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
      asarLib.extractAll(asarPath, unpackedPath);
      extracted = true;
    } catch (err) {
      // Some archives contain entries whose parent directories are implicit —
      // create the missing destination file (inside the temp extract dir only)
      // as an empty placeholder and retry.
      if (err.code === "ENOENT" && err.path && isInsideDir(err.path, unpackedPath)) {
        fs.mkdirSync(path.dirname(err.path), { recursive: true });
        fs.writeFileSync(err.path, "");
      } else {
        throw err;
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
  const fontFaces = fontData
    ? `@font-face{font-family:'Vazirmatn';font-style:normal;font-weight:400;src:local('Vazirmatn'),url(data:font/woff2;base64,${fontData.regular}) format('woff2');} @font-face{font-family:'Vazirmatn';font-style:normal;font-weight:700;src:local('Vazirmatn'),url(data:font/woff2;base64,${fontData.bold}) format('woff2');} `
    : "";

  const safeRtlCode = `
// --- SAFE SMART RTL FIX FOR ZCODE (SIDEBAR PROTECTED) v${PATCH_VERSION} ---
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const applyRtl = () => {
    if (!document.getElementById('zcode-rtl-fix')) {
      const style = document.createElement('style');
      style.id = 'zcode-rtl-fix';
      style.innerHTML = "${fontFaces}body, html { direction: ltr !important; } pre, code, pre *, code *, .editor-instance *, [class*='editor'], [class*='editor'] *, [class*='activitybar' i] *, [class*='menu' i] * { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; } aside, nav, [class*='sidebar' i] { direction: ltr !important; } textarea, input { unicode-bidi: plaintext !important; } p, h1, h2, h3, h4, h5, h6, li, blockquote, dd, dt, figcaption, td, th, [dir='rtl'] { text-align: start !important; } ol[dir='rtl'], ul[dir='rtl'] { direction: rtl !important; padding-right: 40px !important; padding-left: 0 !important; margin-right: 10px !important; } ol[dir='rtl'] li, ul[dir='rtl'] li { direction: rtl !important; text-align: right !important; } table[dir='rtl'] { direction: rtl !important; text-align: right !important; } p, h1, h2, h3, h4, h5, h6, li, blockquote, dd, dt, figcaption, td, th, textarea, input { font-family: 'Vazirmatn', 'Vazir', -apple-system, 'Segoe UI', sans-serif !important; } @keyframes zcode-rtl-reveal { from { transform: translateX(0); } to { transform: translateX(55%); } } aside span[dir='rtl']:hover, nav span[dir='rtl']:hover, [class*='sidebar' i] span[dir='rtl']:hover, [class*='list-row' i] span[dir='rtl']:hover { animation: zcode-rtl-reveal 3.5s ease-in-out infinite alternate !important; }";
      document.head.appendChild(style);
    }
    const RTL_CHARS = /[\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF]/g;
    const LTR_CHARS = /[A-Za-z]/g;
    const countMatches = (text, re) => (text.match(re) || []).length;
    // Chat bubbles and sidebar/task titles render text as direct child nodes
    // of divs — only DIRECT text nodes count there, so layout wrappers never flip.
    const directTextCounts = (el) => {
      let rtl = 0, ltr = 0;
      for (const n of el.childNodes) {
        if (n.nodeType === 3) {
          const value = n.nodeValue || '';
          rtl += countMatches(value, RTL_CHARS);
          ltr += countMatches(value, LTR_CHARS);
        }
      }
      return [rtl, ltr];
    };
    // Mirror right-pointing arrows in RTL text (one-way only, so repeated
    // passes and editor re-renders stay idempotent). Code stays untouched.
    const ARROW_CHARS = /[\\u2192\\u21D2\\u27F6\\u27A1]/;
    const ARROW_GLOBAL = /[\\u2192\\u21D2\\u27F6\\u27A1]/g;
    const ARROW_MAP = { '\\u2192': '\\u2190', '\\u21D2': '\\u21D0', '\\u27F6': '\\u27F5', '\\u27A1': '\\u2B05' };
    const flipRtlArrows = (root) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => {
        let p = n.parentElement;
        while (p && p !== root) {
          if (p.tagName === 'PRE' || p.tagName === 'CODE' || p.tagName === 'KBD') return NodeFilter.FILTER_REJECT;
          p = p.parentElement;
        }
        return ARROW_CHARS.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      } });
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const n of nodes) n.nodeValue = n.nodeValue.replace(ARROW_GLOBAL, (ch) => ARROW_MAP[ch]);
    };
    document.querySelectorAll('p, li, blockquote, dd, dt, figcaption, td, th, h1, h2, h3, h4, h5, h6, ul, ol, table, div, span').forEach(el => {
      if (el.closest('pre') || el.closest('code') || el.closest('[class*="editor"]') || el.closest('[class*="menu" i]') || el.closest('[class*="activitybar" i]')) return;
      // Row contexts (sidebars, list rows): ONLY leaf text spans may flip.
      // Flipping any container there (div/li/ul/p/…) also flips timestamps,
      // badges, fade overlays and marquee geometry — only the text should RTL.
      if (el.tagName !== 'SPAN' && el.closest('aside, nav, [class*="sidebar" i], [class*="list-row" i]')) return;
      let rtl, ltr;
      if (el.tagName === 'DIV') {
        [rtl, ltr] = directTextCounts(el);
      } else {
        const text = el.textContent || '';
        rtl = countMatches(text, RTL_CHARS);
        ltr = countMatches(text, LTR_CHARS);
      }
      // Majority rule: a paragraph follows its dominant script, so
      // "Claude Code این قابلیت را دارد" stays RTL and "use این tool" stays LTR.
      if (rtl > ltr) {
        if (el.getAttribute('dir') !== 'rtl') el.setAttribute('dir', 'rtl');
        if (ARROW_CHARS.test(el.textContent || '')) flipRtlArrows(el);
      } else if (el.getAttribute('dir') === 'rtl') {
        el.removeAttribute('dir');
      }
    });
  };
  const startRtl = () => {
    applyRtl();
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      setTimeout(() => { scheduled = false; applyRtl(); }, 150);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', startRtl);
  } else {
    startRtl();
  }
}
`;
  fs.appendFileSync(preloadPath, safeRtlCode);

  // 4. Repack (pinned local library — no shell, no child processes)
  console.log("📦 Repacking...");
  await asarLib.createPackageWithOptions(unpackedPath, asarPath, {});

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
        reSignBundle(bundle);
        console.log("   Signature fixed.");
      } catch (e) {
        console.log("   Note: Could not auto-fix signature, run manually:");
        console.log(`   sudo xattr -cr ${bundle} && sudo codesign --sign - --force --deep ${bundle}`);
      }
    }
  }

  console.log(`\n✅ Success! ZCode is patched (v${PATCH_VERSION}). Restart ZCode to see RTL support.`);
  if (fontData) console.log("🔤 Vazirmatn font embedded for Persian text (chat, lists, input).");
  console.log("\nℹ️  Expected after patching (macOS):");
  console.log("   • macOS will ask again for previously granted permissions (the app signature changed).");
  console.log("   • Little Snitch / firewall tools will show an 'application modified' warning and re-ask old rules.");
  console.log("   • After every ZCode update, just run this script again — it is update-safe (no downgrade).\n");

} catch (error) {
  console.error("\n❌ Error:", error.message);
  if (error.message.includes("EACCES") || error.message.includes("EPERM")) {
    console.error("\n💡 Permission error. Try with sudo:");
    console.error("   sudo node zcode/zcode-rtl-patch.js");
  }
  if (fs.existsSync(unpackedPath)) {
    try { fs.rmSync(unpackedPath, { recursive: true, force: true }); } catch {}
  }
}
}

main().catch((e) => {
  console.error("❌ Fatal:", e.message);
  process.exit(1);
});
