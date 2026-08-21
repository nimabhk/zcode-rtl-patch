// Vazirmatn font loader for the ZCode RTL patcher.
// Vazirmatn is SIL OFL licensed — embedding and redistribution are allowed.
// Fonts ship in the repo's shared fonts/ folder (release tag v33.003); if
// missing there, they are downloaded once from that pinned tag at patch time —
// never at app runtime. Only https://raw.githubusercontent.com is ever contacted.
const fs = require("fs");
const path = require("path");
const https = require("https");

const FONT_TAG = "v33.003";
const FONT_URLS = {
  regular: `https://raw.githubusercontent.com/rastikerdar/vazirmatn/${FONT_TAG}/fonts/webfonts/Vazirmatn-Regular.woff2`,
  bold: `https://raw.githubusercontent.com/rastikerdar/vazirmatn/${FONT_TAG}/fonts/webfonts/Vazirmatn-Bold.woff2`,
};

// Host allowlist: every requested URL (redirects included) must be https and
// on an allowed host — localhost, private, or any other origin is rejected.
const ALLOWED_HOSTS = new Set(["raw.githubusercontent.com"]);

function assertAllowedUrl(target) {
  const parsed = new URL(target);
  if (parsed.protocol !== "https:") throw new Error(`blocked non-https URL: ${target}`);
  if (!ALLOWED_HOSTS.has(parsed.hostname)) throw new Error(`blocked untrusted host: ${parsed.hostname}`);
}

function httpsGetBuffer(url, redirectsLeft = 3) {
  return new Promise((resolve, reject) => {
    let checked;
    try {
      assertAllowedUrl(url);
      checked = new URL(url).href;
    } catch (e) {
      reject(e);
      return;
    }
    const req = https.get(checked, { timeout: 20000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
        res.resume();
        let next;
        try {
          next = new URL(res.headers.location, checked).href;
          assertAllowedUrl(next);
        } catch (e) {
          reject(e);
          return;
        }
        resolve(httpsGetBuffer(next, redirectsLeft - 1));
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} for ${checked}`));
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
    req.on("timeout", () => req.destroy(new Error("download timeout")));
    req.on("error", reject);
  });
}

// Returns { regular, bold } as base64 woff2 strings, or null when unavailable.
// Never throws — the patch continues without a custom font on any failure.
async function getVazirmatnFont(skip) {
  if (skip) return null;
  const fontsDir = path.join(path.dirname(__dirname), "fonts");
  const regularFile = path.join(fontsDir, "Vazirmatn-Regular.woff2");
  const boldFile = path.join(fontsDir, "Vazirmatn-Bold.woff2");
  const isWoff2 = (buf) => buf.length > 1000 && buf.slice(0, 4).toString("latin1") === "wOF2";
  try {
    if (fs.existsSync(regularFile) && fs.existsSync(boldFile)) {
      console.log("🔤 Using bundled Vazirmatn font files (fonts/).");
      const regular = fs.readFileSync(regularFile);
      const bold = fs.readFileSync(boldFile);
      if (isWoff2(regular) && isWoff2(bold)) {
        return { regular: regular.toString("base64"), bold: bold.toString("base64") };
      }
      console.log("   ⚠️ Bundled font files are invalid — trying download instead.");
    } else {
      console.log("🔤 Bundled fonts missing — downloading Vazirmatn from the official repo...");
    }
    const [regular, bold] = await Promise.all([httpsGetBuffer(FONT_URLS.regular), httpsGetBuffer(FONT_URLS.bold)]);
    if (!isWoff2(regular) || !isWoff2(bold)) throw new Error("downloaded file is not a valid woff2 font");
    console.log("   Vazirmatn downloaded and verified (woff2).");
    return { regular: regular.toString("base64"), bold: bold.toString("base64") };
  } catch (e) {
    console.log(`   ⚠️ Vazirmatn unavailable (${e.message}) — patching WITHOUT custom font.`);
    return null;
  }
}

module.exports = { getVazirmatnFont };
