// Vazirmatn font loader for the RTL patchers.
// Vazirmatn is SIL OFL licensed — embedding and redistribution are allowed.
// Fonts ship in the repo's fonts/ folder; if missing there, they are
// downloaded once from the official repo at patch time (never at app runtime).
const fs = require("fs");
const path = require("path");
const https = require("https");

const FONT_URLS = {
  regular: "https://raw.githubusercontent.com/rastikerdar/vazirmatn/master/fonts/webfonts/Vazirmatn-Regular.woff2",
  bold: "https://raw.githubusercontent.com/rastikerdar/vazirmatn/master/fonts/webfonts/Vazirmatn-Bold.woff2",
};

function httpsGetBuffer(url, redirectsLeft = 3) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 20000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirectsLeft > 0) {
        res.resume();
        resolve(httpsGetBuffer(new URL(res.headers.location, url).href, redirectsLeft - 1));
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
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
  const fontsDir = path.join(__dirname, "fonts");
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
