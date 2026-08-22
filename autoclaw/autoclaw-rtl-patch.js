#!/usr/bin/env node
/**
 * AutoClaw - Safe Smart RTL Fixer (UI Protected)
 * Cross-platform: Windows, macOS, Linux
 *
 * What it does:
 * - Keeps the AutoClaw UI (menus, sidebar, terminal, editor) LTR
 * - Auto-detects Persian/Arabic text and sets dir="rtl" only for content
 * - Preserves app.asar.unpacked layout (koffi / @larksuite / jszip native files)
 * - Update-safe: detects AutoClaw updates and refreshes the backup (never downgrades)
 * - Idempotent: safe to run multiple times; undo with --restore
 * - Read-only inspection: run with --check to see what would happen
 *
 * Requires the @electron/asar library (installed at the repo root by npm):
 *   npm install   (from the repo root)
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

console.log("\n🌟 AutoClaw Safe Smart RTL Fixer (Cross-Platform)");
console.log("═══════════════════════════════════════════════════════\n");

const PATCH_MARKER = "AUTOCLAW SAFE SMART RTL FIX";

// --- @electron/asar library (local install keeps the supply chain pinned) ---
let asar;
try {
  asar = require("@electron/asar");
} catch {
  console.error("❌ The @electron/asar library was not found.");
  console.error("\nInstall it once, then run again:");
  console.error("   npm install     (at the repo root)");
  console.error("\nOr use the double-click launcher — it installs it automatically.");
  process.exit(1);
}

// External tools are invoked with literal command names and argument arrays —
// never through a shell string, so paths cannot turn into shell syntax.
function reSignBundle(bundle) {
  execFileSync("xattr", ["-cr", bundle], { stdio: "pipe" });
  execFileSync("codesign", ["--sign", "-", "--force", "--deep", bundle], { stdio: "pipe" });
}

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

// Collect every file entry of an asar header into a flat map: path -> {unpacked, size}
function headerFiles(header) {
  const out = new Map();
  const walk = (node, p) => {
    if (node.files) {
      for (const [name, child] of Object.entries(node.files)) walk(child, `${p}/${name}`);
    } else {
      out.set(p, { unpacked: !!node.unpacked, size: node.size });
    }
  };
  walk(header, "");
  return out;
}

// Resolve a relative path inside root, refusing anything that escapes root.
function safeJoin(root, relPath) {
  const target = path.resolve(root, relPath);
  if (target !== root && !target.startsWith(root + path.sep)) {
    throw new Error(`refusing unsafe path: ${relPath}`);
  }
  return target;
}

// Derive glob options so repacking keeps exactly the same files unpacked
function deriveUnpackOptions(unpackedDir) {
  if (!unpackedDir || !fs.existsSync(unpackedDir)) return {};
  const rootFiles = [];
  const groups = new Map(); // first segment -> Set(second segment)
  const walk = (dir, rel) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      const full = safeJoin(dir, entry.name);
      if (entry.isDirectory()) walk(full, relPath);
      else {
        const parts = relPath.split("/");
        if (parts.length === 1) rootFiles.push(relPath);
        else {
          if (!groups.has(parts[0])) groups.set(parts[0], new Set());
          groups.get(parts[0]).add(parts[1]);
        }
      }
    }
  };
  walk(unpackedDir, "");

  const options = {};
  const dirPatterns = [...groups.entries()]
    .map(([first, seconds]) => `${first}/{${[...seconds].sort().join(",")}}`);
  if (dirPatterns.length) options.unpackDir = dirPatterns.length === 1 ? dirPatterns[0] : `{${dirPatterns.join(",")}}`;
  if (rootFiles.length) options.unpack = `{${rootFiles.sort().join(",")}}`;
  return options;
}

// <Bundle.app>/Contents/Resources/app.asar -> <Bundle.app>
function appBundlePath(asarPath) {
  const bundle = path.dirname(path.dirname(path.dirname(asarPath)));
  return path.basename(bundle).endsWith(".app") ? bundle : null;
}

function findAsarPath() {
  const home = os.homedir();
  const candidates = [];

  if (process.platform === "darwin") {
    candidates.push(
      "/Applications/AutoClaw.app/Contents/Resources/app.asar",
      path.join(home, "Applications/AutoClaw.app/Contents/Resources/app.asar"),
      // Legacy location on the external drive
      "/Volumes/AiApps/Applications/Agents/AutoClaw.app/Contents/Resources/app.asar"
    );
  } else if (process.platform === "win32") {
    const { LOCALAPPDATA, PROGRAMFILES, APPDATA } = process.env;
    if (LOCALAPPDATA) candidates.push(path.join(LOCALAPPDATA, "Programs", "AutoClaw", "resources", "app.asar"));
    if (PROGRAMFILES) candidates.push(path.join(PROGRAMFILES, "AutoClaw", "resources", "app.asar"));
    if (APPDATA) candidates.push(path.join(APPDATA, "AutoClaw", "resources", "app.asar"));
  } else {
    candidates.push(
      "/opt/AutoClaw/resources/app.asar",
      "/usr/lib/autoclaw/resources/app.asar",
      "/usr/share/autoclaw/resources/app.asar"
    );
  }

  // Manual path from CLI arg (argv[0] and argv[1] are node and the script itself)
  const arg = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (arg) {
    const resolved = path.resolve(arg);
    if (fs.existsSync(resolved)) {
      if (path.basename(resolved) !== "app.asar") {
        console.error(`❌ ${resolved} does not look like an app.asar file.`);
        console.error("Point the script at <AutoClaw.app>/Contents/Resources/app.asar");
        process.exit(1);
      }
      return resolved;
    }
  }

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const asarPath = findAsarPath();

if (!asarPath) {
  console.error("❌ Could not find AutoClaw's app.asar automatically.");
  console.error("\nPlease provide the manual path:");
  console.error('  node autoclaw/autoclaw-rtl-patch.js "/Applications/AutoClaw.app/Contents/Resources/app.asar"');
  console.error("\nHow to find it on Mac: Right-click AutoClaw in Applications -> Show Package Contents -> Contents -> Resources");
  process.exit(1);
}

const resourcesDir = path.dirname(asarPath);
const backupPath = path.join(resourcesDir, "app.asar.backup");
const unpackedPath = path.join(resourcesDir, "app.asar.unpacked");
const tempDir = path.join(os.tmpdir(), `autoclaw_extracted_${Date.now()}`);
const tmpAsar = path.join(resourcesDir, "app.asar.new");

console.log(`✅ Found AutoClaw at: ${asarPath}`);

// Preload candidates inside the extracted archive (always forward slashes)
const PRELOAD_CANDIDATES = [
  "out/preload/index.js",
  "out/preload/index.cjs",
  "dist/preload/index.js",
  "dist/preload/index.cjs",
];

function findPreloadRelative(extractRoot) {
  for (const rel of PRELOAD_CANDIDATES) {
    if (fs.existsSync(safeJoin(extractRoot, rel))) return rel;
  }
  // Fallback recursive search
  const walk = (dir, rel) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      const full = safeJoin(dir, entry.name);
      if (entry.isDirectory()) {
        const found = walk(full, relPath);
        if (found) return found;
      } else if (entry.name.includes("preload") && (entry.name.endsWith(".cjs") || entry.name.endsWith(".js"))) {
        return relPath;
      }
    }
    return null;
  };
  return walk(extractRoot, "");
}

// --- Read-only inspection mode ---
if (process.argv.includes("--check")) {
  console.log("\n🔎 Check mode (read-only, nothing is modified)\n");
  try {
    const header = asar.getRawHeader(asarPath).header;
    const files = headerFiles(header);
    const patched = fileContains(asarPath, PATCH_MARKER);
    const unpackedCount = [...files.values()].filter((f) => f.unpacked).length;
    console.log(`   Archive entries : ${files.size} files`);
    console.log(`   Unpacked files  : ${unpackedCount} (kept via app.asar.unpacked)`);
    console.log(`   Currently       : ${patched ? "PATCHED (RTL fix present)" : "clean (not patched)"}`);
    for (const cand of PRELOAD_CANDIDATES) {
      if (files.has(`/${cand}`)) {
        console.log(`   Preload target  : /${cand}`);
        break;
      }
    }
    const unpackOptions = deriveUnpackOptions(unpackedPath);
    console.log(`   Unpack glob     : ${unpackOptions.unpackDir || "none"}${unpackOptions.unpack ? ` (+ files: ${unpackOptions.unpack})` : ""}`);
    console.log(`   Backup          : ${fs.existsSync(backupPath) ? "exists" : "none yet (created on first patch)"}`);
    console.log("\n✅ Everything looks patchable. Run without --check to patch.");
  } catch (e) {
    console.error(`❌ Could not read the archive: ${e.message}`);
    process.exit(1);
  }
  process.exit(0);
}

// --- Undo: restore the clean backup ---
if (process.argv.includes("--restore")) {
  if (!fs.existsSync(backupPath)) {
    console.error("❌ No backup found. Nothing to restore.");
    process.exit(1);
  }
  if (fileContains(backupPath, PATCH_MARKER)) {
    console.error("❌ Backup itself contains the patch. Reinstall AutoClaw to fully restore.");
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
  console.log("\n✅ Restored. Restart AutoClaw (macOS may ask for permissions again — that's expected).\n");
  process.exit(0);
}

(async () => {
try {
  // 1. Backup management — never restore an outdated backup over a newer app.asar
  const backupExists = fs.existsSync(backupPath);
  const currentPatched = fileContains(asarPath, PATCH_MARKER);

  if (!backupExists) {
    console.log("📦 Creating backup...");
    fs.copyFileSync(asarPath, backupPath);
  } else if (!currentPatched) {
    // Current app.asar is clean: AutoClaw updated (electron-updater), or the user restored it.
    // Refreshing the backup from it is always safe and prevents downgrades.
    console.log("📦 Current app.asar is unpatched — refreshing backup from it (update-safe, no downgrade).");
    fs.copyFileSync(asarPath, backupPath);
  } else if (!fileContains(backupPath, PATCH_MARKER)) {
    console.log("📦 Restoring clean backup (same AutoClaw version)...");
    fs.copyFileSync(backupPath, asarPath);
  } else {
    console.log("⚠️ Backup also contains the patch — will clean the preload file directly instead.");
  }

  const originalFiles = headerFiles(asar.getRawHeader(asarPath).header);
  const originalUnpacked = new Set([...originalFiles.entries()].filter(([, f]) => f.unpacked).map(([p]) => p));

  // 2. Extract
  console.log("📂 Extracting (308 MB — this takes a minute or two)...");
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  asar.extractAll(asarPath, tempDir);

  // 3. Find and patch the preload file
  console.log("💉 Injecting RTL logic...");
  const preloadRel = findPreloadRelative(tempDir);
  if (!preloadRel) throw new Error("preload file not found inside app.asar");
  const preloadPath = safeJoin(tempDir, preloadRel);
  console.log(`   Found: /${preloadRel}`);

  // Idempotent: strip any previous injection, then append fresh code
  let preloadContent = fs.readFileSync(preloadPath, "utf8");
  const markerIndex = preloadContent.indexOf(`// --- ${PATCH_MARKER}`);
  if (markerIndex !== -1) {
    console.log("🧹 Removing previous injection...");
    preloadContent = preloadContent.slice(0, markerIndex).replace(/\s+$/, "") + "\n";
    fs.writeFileSync(preloadPath, preloadContent);
  }
  // Optional embedded font: fonts/Vazirmatn-var.woff2 in the repo's shared
  // fonts folder keeps the patched app fully offline — no CDN requests at
  // runtime. local('Vazirmatn'/'Vazir') comes first so a system-installed
  // font still wins when present; the embedded copy is the fallback.
  let fontFaceCss = "";
  const fontPath = path.join(path.dirname(__dirname), "fonts", "Vazirmatn-var.woff2");
  if (fs.existsSync(fontPath)) {
    const fontB64 = fs.readFileSync(fontPath).toString("base64");
    fontFaceCss = "@font-face{font-family:'Vazirmatn Patched';src:local('Vazirmatn'),local('Vazir'),url(data:font/woff2;base64," + fontB64 + ") format('woff2');font-weight:100 900;font-display:swap;}";
    console.log(`🔤 Embedding Vazirmatn variable font (${Math.round(fontB64.length / 1024)} KB base64)`);
  } else {
    console.log("ℹ️  fonts/Vazirmatn-var.woff2 not found — RTL text will use installed/system fonts only.");
  }
  const safeRtlCode = `
// --- ${PATCH_MARKER} (UI PROTECTED: terminal, menus, sidebar and editors stay LTR) ---
// Two-tier bidi v1.2.5 (anti-flicker, scope-safe):
//   stream pass — ONE sticky dir on the streaming message's text container,
//                 discovered STRUCTURALLY from the mutating text blocks
//                 (bounded shallow-ancestor growth, never class-substring
//                 matching), so it can never escape the message into UI chrome.
//   settle pass — after ~800ms of mutation silence (plus a 60s sweep):
//                 per-paragraph polish; pure-English lines/headers inside an
//                 RTL message get dir="ltr". Right-pointing arrows (→ ⇒ ⟶ ➡)
//                 are mirrored to left-pointing in RTL text, code excluded.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const RTL_CHARS = /[\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF]/g;
  const LTR_CHARS = /[A-Za-z]/g;
  const countMatches = (text, re) => (text.match(re) || []).length;
  const PROTECTED = 'pre, code, .xterm, .ant-dropdown, .ant-select-dropdown, .ant-cascader-dropdown, [class*="editor" i], [class*="monaco" i]';
  const SETTLE_TARGETS = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, span, ul, ol, table';
  const BLOCK_TAGS = 'P, H1, H2, H3, H4, H5, H6, LI, BLOCKQUOTE, TD, TH, UL, OL, TABLE';

  // Text of a container with code blocks excluded, so a Persian reply that is
  // full of code still counts as Persian.
  const collectText = (node, out) => {
    for (const n of node.childNodes) {
      if (n.nodeType === 3) out.push(n.nodeValue || '');
      else if (n.nodeType === 1 && n.tagName !== 'PRE' && n.tagName !== 'CODE' && n.tagName !== 'KBD' && n.tagName !== 'SCRIPT' && n.tagName !== 'STYLE') collectText(n, out);
    }
  };
  const textExcludingCode = (root) => { const parts = []; collectText(root, parts); return parts.join(' '); };

  // Mirror right-pointing arrows in RTL text (one-way only, so re-renders and
  // repeated passes stay idempotent). Code blocks are left untouched.
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

  let streamTimer = null;
  let settleTimer = null;
  let streamTarget = null;

  const fixInputs = () => {
    document.querySelectorAll('textarea, input').forEach((el) => {
      if (el.getAttribute('dir') !== 'auto') el.setAttribute('dir', 'auto');
    });
  };

  // User chat bubbles render as raw text nodes inside a div — direct text
  // nodes only, so layout wrappers never flip. Instant content, no churn.
  const fixBubbles = () => {
    document.querySelectorAll('.msg-user-text-bubble').forEach((el) => {
      if (el.closest(PROTECTED)) return;
      let rtl = 0, ltr = 0;
      for (const n of el.childNodes) {
        if (n.nodeType === 3) {
          const value = n.nodeValue || '';
          rtl += countMatches(value, RTL_CHARS);
          ltr += countMatches(value, LTR_CHARS);
        }
      }
      if (rtl > ltr) {
        if (el.getAttribute('dir') !== 'rtl') el.setAttribute('dir', 'rtl');
        if (ARROW_CHARS.test(el.textContent || '')) flipRtlArrows(el);
      } else if (el.getAttribute('dir') === 'rtl') {
        el.removeAttribute('dir');
      }
    });
  };

  // The nearest enclosing text block of a mutation, or null.
  const blockOf = (node) => {
    let el = node && node.nodeType === 1 ? node : (node ? node.parentElement : null);
    while (el && !BLOCK_TAGS.split(', ').includes(el.tagName)) el = el.parentElement;
    return el;
  };

  // Common ancestor of a and b only if it sits at most maxDepth above a —
  // this is the boundary that keeps the container inside one message.
  const shallowAncestor = (a, b, maxDepth) => {
    for (let i = 0, p = a.parentElement; p && i <= maxDepth; p = p.parentElement, i++) {
      if (p === b || p.contains(b)) return p;
    }
    return null;
  };

  const trackMutation = (node) => {
    const block = blockOf(node);
    if (!block || block.closest(PROTECTED)) return;
    if (!streamTarget) { streamTarget = block; return; }
    if (streamTarget.contains(block) || block.contains(streamTarget)) {
      if (block.contains(streamTarget)) streamTarget = block; // climb: React replaced the wrapper
      return;
    }
    const anc = shallowAncestor(streamTarget, block, 2);
    if (anc) streamTarget = anc; // sibling paragraph inside the same message
    // else: mutation in a far-away region (scroll/virtualization) — ignored
  };

  const streamPass = () => {
    streamTimer = null;
    fixInputs();
    fixBubbles();
    // One sticky attribute on the streaming message's structural container.
    if (streamTarget && streamTarget.isConnected && !streamTarget.closest(PROTECTED)) {
      if (streamTarget.getAttribute('dir') !== 'rtl') {
        const text = textExcludingCode(streamTarget);
        const rtl = countMatches(text, RTL_CHARS);
        const ltr = countMatches(text, LTR_CHARS);
        if (rtl >= 3 && rtl > ltr) {
          streamTarget.setAttribute('dir', 'rtl');
          if (ARROW_CHARS.test(text)) flipRtlArrows(streamTarget);
        }
      } else if (ARROW_CHARS.test(streamTarget.textContent || '')) {
        flipRtlArrows(streamTarget);
      }
    }
    scheduleSettle();
  };

  const settlePass = () => {
    clearTimeout(settleTimer);
    settleTimer = null;
    streamTarget = null; // next stream rediscovers its own container
    fixInputs();
    fixBubbles();
    // Per-paragraph polish: pure-English lines/headers go LTR even inside an
    // RTL message; Persian-dominant paragraphs go RTL; mixed Latin-majority
    // inherits the message direction. Sidebar rows: spans only.
    document.querySelectorAll(SETTLE_TARGETS).forEach((el) => {
      if (el.closest(PROTECTED)) return;
      if (el.closest('aside, nav, .ant-menu, .ant-layout-sider') && el.tagName !== 'SPAN') return;
      const text = el.textContent || '';
      const rtl = countMatches(text, RTL_CHARS);
      const ltr = countMatches(text, LTR_CHARS);
      if (el.tagName === 'SPAN') {
        if (rtl > ltr) {
          if (el.getAttribute('dir') !== 'rtl') el.setAttribute('dir', 'rtl');
        } else if (el.getAttribute('dir') === 'rtl') {
          el.removeAttribute('dir');
        }
      } else if (rtl === 0 && ltr > 0) {
        if (el.getAttribute('dir') !== 'ltr') el.setAttribute('dir', 'ltr');
      } else if (rtl > ltr) {
        if (el.getAttribute('dir') !== 'rtl') el.setAttribute('dir', 'rtl');
        if (ARROW_CHARS.test(text)) flipRtlArrows(el);
      } else if (el.getAttribute('dir') === 'rtl' || el.getAttribute('dir') === 'ltr') {
        el.removeAttribute('dir');
      }
    });
  };

  const scheduleSettle = () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settlePass, 800);
  };

  const AC_RTL_RUN = () => {
    if (!document.getElementById('autoclaw-rtl-fix')) {
      const style = document.createElement('style');
      style.id = 'autoclaw-rtl-fix';
      style.innerHTML = "${fontFaceCss}body, html { direction: ltr !important; } pre, code, pre *, code *, .xterm, .xterm *, [class*='editor' i] *, [class*='monaco' i] *, .ant-dropdown *, .ant-select-dropdown *, .ant-cascader-dropdown * { direction: ltr !important; text-align: left !important; unicode-bidi: normal !important; } aside, nav, .ant-menu, .ant-layout-sider { direction: ltr !important; } p, h1, h2, h3, h4, h5, h6, li, blockquote, [dir='rtl'] { text-align: start !important; } .msg-user-text-bubble { text-align: start !important; } textarea, input { unicode-bidi: plaintext !important; text-align: start !important; } [dir='rtl'], [dir='rtl'] p, [dir='rtl'] li, [dir='rtl'] span, [dir='rtl'] h1, [dir='rtl'] h2, [dir='rtl'] h3, [dir='rtl'] h4, [dir='rtl'] h5, [dir='rtl'] h6, [dir='rtl'] blockquote, .msg-user-text-bubble, textarea, input { font-family: 'Vazirmatn Patched', Vazirmatn, Vazir, 'PingFang SC', -apple-system, 'Segoe UI', sans-serif !important; } ol[dir='rtl'], ul[dir='rtl'], [dir='rtl'] ol, [dir='rtl'] ul { padding-right: 40px !important; padding-left: 0 !important; margin-right: 10px !important; } ol[dir='rtl'] li, ul[dir='rtl'] li, [dir='rtl'] ol li, [dir='rtl'] ul li { text-align: right !important; } table[dir='rtl'], [dir='rtl'] table { text-align: right !important; }";
      (document.head || document.documentElement).appendChild(style);
    }
    const observer = new MutationObserver((records) => {
      for (const r of records) {
        trackMutation(r.target);
        for (const added of r.addedNodes) trackMutation(added);
      }
      if (!streamTimer) streamTimer = setTimeout(streamPass, 150);
      scheduleSettle();
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    setInterval(settlePass, 60000);
    settlePass();
  };
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', AC_RTL_RUN);
  else AC_RTL_RUN();
}
`;
  fs.appendFileSync(preloadPath, safeRtlCode);

  // 4. Repack — preserving exactly which files stay unpacked
  console.log("📦 Repacking...");
  const unpackOptions = deriveUnpackOptions(unpackedPath);
  if (unpackOptions.unpackDir) console.log(`   Unpacked dirs preserved: ${unpackOptions.unpackDir}`);
  await asar.createPackageWithOptions(tempDir, tmpAsar, unpackOptions);

  // 5. Verify the new archive before swapping it in
  console.log("🔍 Verifying repacked archive...");
  const newFiles = headerFiles(asar.getRawHeader(tmpAsar).header);
  if (newFiles.size !== originalFiles.size) {
    throw new Error(`verification failed: file count changed (${originalFiles.size} -> ${newFiles.size})`);
  }
  const newUnpacked = new Set([...newFiles.entries()].filter(([, f]) => f.unpacked).map(([p]) => p));
  for (const p of originalUnpacked) {
    if (!newUnpacked.has(p)) throw new Error(`verification failed: ${p} must stay unpacked`);
  }
  const patchedPreload = asar.extractFile(tmpAsar, preloadRel).toString("utf8");
  if (!patchedPreload.includes(PATCH_MARKER)) {
    throw new Error("verification failed: injected payload missing from new archive");
  }

  // 6. Swap in the patched archive (same-directory rename is atomic)
  fs.renameSync(tmpAsar, asarPath);
  // The repacker wrote its own unpacked copy next to the temp archive; the
  // original app.asar.unpacked is byte-identical, so it can simply be removed.
  const tmpUnpacked = `${tmpAsar}.unpacked`;
  if (fs.existsSync(tmpUnpacked)) {
    if (fs.existsSync(unpackedPath)) fs.rmSync(tmpUnpacked, { recursive: true, force: true });
    else fs.renameSync(tmpUnpacked, unpackedPath);
  }

  // 7. Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });

  // 8. macOS fix: re-sign after patch (uses the detected app bundle path)
  if (process.platform === "darwin") {
    const bundle = appBundlePath(asarPath);
    if (!bundle) {
      console.log("   Note: Could not detect app bundle path, re-sign manually:");
      console.log("   sudo xattr -cr /Applications/AutoClaw.app && sudo codesign --sign - --force --deep /Applications/AutoClaw.app");
    } else {
      try {
        console.log("🔐 Fixing macOS signature (large bundle — takes a moment)...");
        reSignBundle(bundle);
        console.log("   Signature fixed.");
      } catch (e) {
        console.log("   Note: Could not auto-fix signature, run manually:");
        console.log(`   sudo xattr -cr ${bundle} && sudo codesign --sign - --force --deep ${bundle}`);
      }
    }
  }

  console.log("\n✅ Success! AutoClaw is patched. Restart AutoClaw to see RTL support.");
  console.log("\nℹ️  Expected after patching (macOS):");
  console.log("   • macOS will ask again for previously granted permissions — the app signature changed.");
  console.log("   • Little Snitch / firewall tools will show an 'application modified' warning and re-ask old rules.");
  console.log("   • AutoClaw's notarized signature becomes a local ad-hoc signature (normal; Gatekeeper still accepts it).");
  console.log("   • After every AutoClaw auto-update, just run this script again — it is update-safe (no downgrade).\n");

} catch (error) {
  console.error("\n❌ Error:", error.message);
  if (error.message.includes("EACCES") || error.message.includes("EPERM")) {
    console.error("\n💡 Permission error. Try with sudo:");
    console.error("   sudo node autoclaw/autoclaw-rtl-patch.js");
  }
  for (const leftover of [tmpAsar, `${tmpAsar}.unpacked`, tempDir]) {
    try { if (fs.existsSync(leftover)) fs.rmSync(leftover, { recursive: true, force: true }); } catch {}
  }
  process.exit(1);
}
})();
