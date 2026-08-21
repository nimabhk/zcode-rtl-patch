[English](README.md) | **فارسی**

<div dir="rtl">

# ZCode و AutoClaw — پچرهای امن و هوشمند راست‌چین

پچ‌های امن و هوشمند RTL (راست‌به‌چپ) برای **ZCode** و **AutoClaw** (اپ‌های Electron شرکت ZhipuAI) که پشتیبانی فارسی/عربی را بدون خراب کردن UI اضافه می‌کنند.

هر دو پچ، ادیتور، سایدبار، نوار فعالیت، ترمینال و منوها را LTR نگه می‌دارند و فقط محتوایی را RTL می‌کنند که **خط غالب** آن فارسی/عربی باشد.

| اپ | اسکریپت پچ | لانچر (دبل‌کلیک) | نکات |
|---|---|---|---|
| [ZCode](https://zcode.app) | `zcode/zcode-rtl-patch.js` | `zcode/patch-zcode-mac.command` / `zcode/patch-zcode-windows.bat` | فونت وزیرمتن اختیاری (`--no-font`) |
| AutoClaw | `autoclaw/autoclaw-rtl-patch.js` | `autoclaw/patch-autoclaw-mac.command` / `autoclaw/patch-autoclaw-windows.bat` | فونت وزیرمتن تعبیه‌شده، حالت `--check` |

هر دو پچر از کتابخانه pinned محلی `@electron/asar` استفاده می‌کنند (یک‌بار با `npm install` در ریشه ریپو نصب می‌شود) و فونت‌های همراه در پوشه `fonts/` بینشان مشترک است.

---

## 🟦 AutoClaw — پچر امن و هوشمند راست‌چین

راست‌چین‌سازی content-aware برای UI چت AutoClaw (پیام‌های ایجنت، پیام‌های خودتان و باکس ورودی) اضافه می‌کند، در حالی که UI چینی/انگلیسی، ترمینال، منوها و سایدبار LTR می‌مانند. متن فارسی همچنین با فونت تعبیه‌شده **Vazirmatn** رندر می‌شود — بدون نیاز به نصب فونت یا اینترنت.

### ✨ ویژگی‌ها

- **RTL فقط برای محتوا**: پیام‌های مارک‌داون ایجنت، حباب‌های چت خودتان و لیست‌ها/جدول‌ها فقط وقتی RTL می‌شوند که خط غالبشان فارسی/عربی باشد
- **باکس ورودی RTL**: به `textarea`/`input` مقدار `dir="auto"` داده می‌شود — تایپ فارسی از راست شروع می‌شود و انگلیسی LTR می‌ماند
- **فونت Vazirmatn تعبیه‌شده**: فونت متغیر رسمی (وزن‌های ۱۰۰ تا ۹۰۰، لایسنس SIL OFL) موقع پچ داخل آن embed می‌شود — کاملاً آفلاین، بدون هیچ درخواست شبکه. اگر Vazirmatn/Vazir روی سیستمتان نصب باشد، نسخه محلی اولویت دارد
- **محافظت از UI**: ترمینال `.xterm`، منوها/دراپ‌داون‌ها/سایدبار antd و ادیتورها LTR می‌مانند
- **حفظ `app.asar.unpacked`**: موقع repack، ماژول‌های native (مثل koffi و @larksuite) دقیقاً مثل نسخه اصلی unpacked می‌مانند
- **Repack تأییدشده**: آرشیو جدید قبل از جایگزینی نسخه اصلی بررسی می‌شود (تعداد فایل‌ها، مجموعه unpacked، نشانگر payload) — خطا هرگز به اپ شما نمی‌رسد
- **امن**: بکاپ خودکار `app.asar.backup` — هر وقت خواستید با `--restore` برمی‌گردید
- **آپدیت‌سیف**: بعد از هر آپدیت خودکار AutoClaw فقط کافی است دوباره اجرا کنید — بکاپ را رفرش می‌کند و هرگز دانگرید نمی‌دهد
- **بازرسی فقط‌خواندنی**: با `node autoclaw/autoclaw-rtl-patch.js --check` بدون دست زدن به هیچ چیزی ببینید چه اتفاقی می‌افتد

### 📋 پیش‌نیازها

- [Node.js](https://nodejs.org/) >= 16
- AutoClaw نصب‌شده (مسیرهای پیش‌فرض خودکار پیدا می‌شوند؛ مسیر دستی هم پذیرفته می‌شود)

### 🚀 نصب

#### ۱. ریپو را clone یا دانلود کنید

```bash
git clone https://github.com/nimabhk/zcode-rtl-patch.git
cd zcode-rtl-patch
npm install        # یک‌بار — کتابخانه pinned نصب می‌شود
```

#### ۲. AutoClaw را کامل ببندید

مطمئن شوید AutoClaw در حال اجرا نیست (از Dock یا Task Manager خارج شوید).

#### ۳. پچ را اجرا کنید

**راه آسان — دبل‌کلیک:**
- **macOS**: دبل‌کلیک روی `autoclaw/patch-autoclaw-mac.command` (Node را چک می‌کند، وابستگی‌ها را در اولین اجرا نصب می‌کند، اگر AutoClaw باز باشد هشدار می‌دهد، و در صورت نیاز پیشنهاد اجرای sudo می‌دهد)
- **ویندوز**: دبل‌کلیک روی `autoclaw/patch-autoclaw-windows.bat` (پنجره درخواست ادمین را تأیید کنید)

**یا از ترمینال:**

```bash
node autoclaw/autoclaw-rtl-patch.js
# بازرسی فقط‌خواندنی قبل از پچ (اختیاری):
node autoclaw/autoclaw-rtl-patch.js --check
# اگر تشخیص خودکار نشد، مسیر را دستوری بدهید:
node autoclaw/autoclaw-rtl-patch.js "/Applications/AutoClaw.app/Contents/Resources/app.asar"
```

خروجی مورد انتظار:

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

### 🔧 نحوه کار

1. `app.asar` را پیدا و بکاپ می‌گیرد (`app.asar.backup`)
2. با کتابخانه pinned محلی `@electron/asar` استخراج می‌کند (بدون npx بدون‌قفل — زنجیره تأمین بسته می‌ماند)
3. یک بلوک self-contained به `out/preload/index.js` اضافه می‌کند:
   - CSS رابط کاربری را LTR قفل می‌کند؛ به textarea/input مقدار `unicode-bidi: plaintext` می‌دهد
   - یک `MutationObserver` با debounce روی المان‌هایی که خط غالبشان RTL است `dir="rtl"` می‌گذارد (قانون اکثریت — جمله‌های مخلوط خوانا می‌مانند؛ حباب‌های پیام کاربر از طریق نودهای متنی *مستقیم* تشخیص داده می‌شوند تا wrapperهای چیدمان هرگز برنگردند)
   - `textarea`/`input` مقدار `dir="auto"` می‌گیرند
   - یک `@font-face` تعبیه‌شده (Vazirmatn متغیر، اول `local()` و بعد data URI با base64) محتوای RTL و ورودی‌ها را استایل می‌دهد
4. **دقیقاً با همان مجموعه unpacked** دوباره بسته‌بندی می‌کند، آرشیو جدید را تأیید می‌کند و به‌صورت اتمیک جایگزین می‌کند
5. در macOS، باندل را با امضای ad-hoc محلی دوباره امضا می‌کند (`xattr -cr` + `codesign`)

### ♻️ حذف / بازگردانی

```bash
node autoclaw/autoclaw-rtl-patch.js --restore
```

بازگردانی دستی: فایل `app.asar.backup` را در `AutoClaw.app/Contents/Resources/` روی `app.asar` کپی کنید و دوباره امضا کنید:

```bash
sudo xattr -cr /Applications/AutoClaw.app
sudo codesign --sign - --force --deep /Applications/AutoClaw.app
```

### ⚠️ نکات AutoClaw

- **امضای notarized → ad-hoc**: AutoClaw با امضای Developer ID نهارایز‌شده عرضه می‌شود. بعد از پچ، به‌صورت ad-hoc محلی دوباره امضا می‌شود — Gatekeeper همچنان برنامه را می‌پذیرد، اما:
  - macOS دوباره برای پرمیژن‌های قبلی (دوربین/میکروف/اسناد/…) اجازه می‌خواهد
  - **Little Snitch** با هشدار *"application modified"* قوانین قبلی را دوباره می‌پرسد — این انتظار می‌رود و ناشی از تغییر امضاست
- **آپدیت‌های خودکار**: AutoClaw از `electron-updater` استفاده می‌کند؛ هر آپدیت `app.asar` را جایگزین و پچ را پاک می‌کند. کافی است اسکریپت را دوباره اجرا کنید — آپدیت‌سیف است.
- **وضعیت امنیتی**: payload تزریقی فقط DOM را دست می‌زند — بدون درخواست شبکه، بدون جمع‌آوری داده. فونت تعبیه‌شده داخل خود پچ حمل می‌شود (بدون درخواست به CDN یا Google Fonts).
- هش asar-integrity در `Info.plist` توسط AutoClaw بررسی نمی‌شود (فیوز Electron غیرفعال است)، پس تغییر asar مانع اجرا نمی‌شود.

---

## 🟩 ZCode — پچر امن و هوشمند راست‌چین

پچ امن و هوشمند RTL برای [ZCode](https://zcode.app) (بر پایه VS Code/Electron) که پشتیبانی فارسی/عربی را بدون خراب کردن UI اضافه می‌کند.

### ✨ ویژگی‌ها

- **محافظت از سایدبار**: ادیتور، سایدبار، منوها و نوار فعالیت LTR می‌مانند
- **Bidi هوشمند**: هر پاراگراف خط غالب خودش را دنبال می‌کند — جمله‌های مخلوط فارسی/انگلیسی خوانا می‌مانند
- **تشخیص هوشمند**: یک المان وقتی RTL می‌شود که حروف خط عربی/فارسی در متنش اکثریت داشته باشند
- **ورودی‌های RTL**: برای textarea/input از `unicode-bidi: plaintext` استفاده می‌شود (رفع پرش کرسر و مشکل جهت خط اول)
- **فونت وزیرمتن اختیاری**: موقع پچ به‌صورت base64 تعبیه می‌شود (با `--no-font` غیرفعال می‌شود)؛ اگر در `fonts/` موجود باشد از همان‌جا، وگرنه یک‌بار از ریپوی رسمی Vazirmatn دانلود می‌شود — هرگز در زمان اجرای برنامه
- **امن**: بکاپ خودکار — هر وقت خواستید با `--restore` برمی‌گردید
- **آپدیت‌سیف**: آپدیت‌های ZCode را تشخیص می‌دهد و بکاپ را رفرش می‌کند — هرگز دانگرید نمی‌دهد
- **چندسکویی**: macOS، ویندوز، لینوکس

### 🚀 نصب

#### ۱. ریپو را clone یا دانلود کنید

```bash
git clone https://github.com/nimabhk/zcode-rtl-patch.git
cd zcode-rtl-patch
npm install        # یک‌بار — کتابخانه pinned نصب می‌شود
```

#### ۲. ZCode را کامل ببندید

مطمئن شوید ZCode در حال اجرا نیست (از Dock یا Task Manager خارج شوید).

#### ۳. پچ را اجرا کنید

**راه آسان — دبل‌کلیک:**
- **macOS**: دبل‌کلیک روی `zcode/patch-zcode-mac.command` (Node را چک می‌کند، وابستگی‌ها را در اولین اجرا نصب می‌کند، اگر ZCode باز باشد هشدار می‌دهد، و در صورت نیاز پیشنهاد اجرای sudo می‌دهد)
- **ویندوز**: دبل‌کلیک روی `zcode/patch-zcode-windows.bat` (پنجره درخواست ادمین را تأیید کنید)

**یا از ترمینال:**

**در macOS:**

```bash
sudo node zcode/zcode-rtl-patch.js
# اگر تشخیص خودکار نشد، مسیر را دستوری بدهید:
sudo node zcode/zcode-rtl-patch.js "/Applications/ZCode.app/Contents/Resources/app.asar"
```

**در ویندوز (PowerShell به‌صورت ادمین):**

```powershell
node zcode/zcode-rtl-patch.js
node zcode/zcode-rtl-patch.js "C:\Users\%USERNAME%\AppData\Local\Programs\ZCode\resources\app.asar"
```

**در لینوکس:**

```bash
sudo node zcode/zcode-rtl-patch.js
```

خروجی مورد انتظار:

```
🌟 ZCode Safe Smart RTL Fixer
✅ Found ZCode at: ...
📦 Creating backup...
📂 Extracting...
💉 Injecting RTL logic...
📦 Repacking...
✅ Success! ZCode is patched.
```

حالا ZCode را دوباره باز کنید. پاراگراف‌های فارسی/عربی خودکار راست‌چین می‌شوند.

### 🔧 نحوه کار

اسکریپت:
1. `app.asar` (آرشیو Electron) را پیدا می‌کند
2. فونت Vazirmatn را بارگذاری می‌کند (از `fonts/` همراه، یا دانلود یک‌باره از ریپوی رسمی) مگر اینکه `--no-font` داده شده باشد
3. بکاپ `app.asar.backup` می‌سازد
4. با کتابخانه pinned `@electron/asar` استخراج می‌کند (بدون npx — همان قفل زنجیره تأمین AutoClaw)
5. CSS و MutationObserver را به `out/preload/index.cjs` تزریق می‌کند
   - CSS رابط کاربری را LTR نگه می‌دارد؛ `@font-face` تعبیه‌شده محتوای فارسی را استایل می‌دهد
   - observer جاوااسکریپت با قانون اکثریت خط غالب، به هر پاراگراف `dir="rtl"` می‌دهد
6. `app.asar` را دوباره بسته‌بندی می‌کند
7. در macOS امضای برنامه را با `xattr -cr` و `codesign` درست می‌کند

### ♻️ حذف / بازگردانی

**بازگردانی خودکار (پیشنهادی):**

```bash
node zcode/zcode-rtl-patch.js --restore
```

**بازگردانی دستی:**

```bash
# ویندوز
copy "%LOCALAPPDATA%\Programs\ZCode\resources\app.asar.backup" "%LOCALAPPDATA%\Programs\ZCode\resources\app.asar"

# macOS
sudo cp "/Applications/ZCode.app/Contents/Resources/app.asar.backup" "/Applications/ZCode.app/Contents/Resources/app.asar"
sudo xattr -cr /Applications/ZCode.app
sudo codesign --sign - --force --deep /Applications/ZCode.app

# لینوکس
sudo cp /opt/ZCode/resources/app.asar.backup /opt/ZCode/resources/app.asar
```

یا ساده‌ترین راه: نصب مجدد ZCode.

### ⚠️ نکات ZCode

- **بررسی امنیتی‌شده**: کد تزریقی فقط جهت متن را در DOM تنظیم می‌کند — بدون درخواست شبکه، بدون جمع‌آوری داده.
- **ریست شدن پرمیژن‌های macOS طبیعی است**: پچ، برنامه را دوباره امضا می‌کند و macOS آن را برنامه‌ای جدید تلقی می‌کند و پرمیژن‌های قبلی را دوباره می‌پرسد. **Little Snitch** هم با هشدار *"application modified"* قوانین قدیمی را دوباره می‌پرسد — ناشی از پچ است، نه بدافزار.
- بعد از هر آپدیت ZCode دوباره اجرا کنید (آپدیت‌سیف: به‌جای بازگردانی بکاپ قدیمی، آن را رفرش می‌کند).
- **جایگزین بدون پچ**: فلگ‌های نیتیو Chromium را تست کنید (کل UI را آینه می‌کند):

```bash
/Applications/ZCode.app/Contents/MacOS/ZCode --force-ui-direction=rtl --force-text-direction=rtl
```

---

## 🛠️ رفع اشکال

| خطا | راه‌حل |
|-------|-----|
| `Could not find app.asar` | مسیر را به‌صورت آرگومان بدهید |
| `EACCES / EPERM` | با `sudo` اجرا کنید (macOS/Linux) یا PowerShell ادمین (ویندوز) |
| باز نشدن اپ در مک | `sudo xattr -cr <App.app> && sudo codesign --sign - --force --deep <App.app>` |
| `@electron/asar library was not found` | `npm install` را در ریشه ریپو اجرا کنید |

---

## 📜 تغییرات (Changelog)

**v1.2.1 — ۲۰۲۶-۰۸-۲۲**
- **AutoClaw**: payload به همان قانون bidi اکثریت خط ZCode منتقل شد — جمله‌های عمدتاً فارسی با شروع انگلیسی خوانا می‌مانند؛ محدوده‌های یونیکد خط عربی گسترش یافت؛ تشخیص حباب پیام کاربر حالا خط غالب را در نودهای متنی مستقیم می‌شمارد
- **ZCode**: از `npx asar` به کتابخانه pinned محلی `@electron/asar` سوییچ شد — ویندوز درست شد (npx آنجا از طریق فراخوانی آرایه‌ای اجرا نمی‌شود) و نگرانی زنجیره تأمین npx بدون‌قفل حذف شد
- **زنجیره تأمین**: URLهای دانلود فونت به تگ انتشار `v33.003` قفل شدند (بایت‌به‌بایت یکسان با فونت‌های همراه) و به `raw.githubusercontent.com` روی https محدود شدند، شامل redirectها
- **چیدمان ریپو**: پچرها به فولدرهای جداگانه (`zcode/` و `autoclaw/`) منتقل شدند؛ لانچرهای ZCode به `patch-zcode-mac.command` / `patch-zcode-windows.bat` تغییر نام یافتند؛ فونت‌های مشترک در `fonts/` ماندند؛ هر دو پچر حالا از `npm install` ریشه ریپو استفاده می‌کنند

**v1.2.0 — ۲۰۲۶-۰۸-۲۲**
- **جدید: پچر AutoClaw** (`autoclaw-rtl-patch.js`) با لانچرهای مخصوص خودش
  - RTL فقط برای محتوای چت AutoClaw: مارک‌داون ایجنت، حباب‌های کاربر (divهای متن خام)، لیست‌ها، جدول‌ها
  - باکس‌های ورودی RTL (`dir="auto"` روی `textarea`/`input`)
  - **فونت متغیر Vazirmatn تعبیه‌شده** (OFL) — آفلاین، بدون درخواست CDN/Google Fonts؛ نسخه نصب‌شده سیستمی اولویت دارد
  - Repack با حفظ unpacked (ترکیب فایل‌های `app.asar.unpacked` عیناً حفظ می‌شود)
  - تأیید بعد از repack + جایگزینی اتمیک؛ اجرای ناموفق هرگز به اپ دست نمی‌زند
  - وابستگی pinned محلی `@electron/asar` (بدون npx بدون‌قفل) — فراخوانی ابزارها با آرایه آرگومان، چک مرز مسیر
  - حالت بازرسی فقط‌خواندنی `--check`
- **پچر ZCode v1.2.0**:
  - bidi اکثریتی هوشمند برای هر پاراگراف — جمله‌های مخلوط فارسی/انگلیسی خوانا می‌مانند
  - `unicode-bidi: plaintext` برای ورودی‌ها (رفع پرش کرسر و جهت خط اول)
  - Vazirmatn تعبیه‌شده اختیاری (Regular + Bold) با فلگ `--no-font`؛ لودر `vazirmatn-font.js` اول از `fonts/` همراه استفاده می‌کند و در غیابش به دانلود یک‌باره از ریپوی رسمی موقع پچ برمی‌گردد (هرگز در زمان اجرای برنامه)
  - محدوده‌های یونیکد گسترده‌تر خط عربی؛ مقاوم‌سازی آرگومان‌های خط فرمان

**v1.1.0 — ۲۰۲۶-۰۸-۲۰**
- مدیریت بکاپ آپدیت‌سیف: اجرای پچ بعد از آپدیت ZCode به‌جای بازگردانی بکاپ قدیمی، آن را رفرش می‌کند (رفع دانگرید بی‌سروصدا)
- تزریق idempotent: پچ قبلی قبل از تزریق مجدد حذف می‌شود
- بازگردانی با یک دستور: `--restore`
- لانچرهای دبل‌کلیک: `patch-mac.command` و `patch-windows.bat`
- امضای مجدد حالا از مسیر تشخیص‌داده‌شده اپ استفاده می‌کند (نه مسیر هاردکد)
- پیام‌های کنسول درباره پرمیژن‌های مورد انتظار macOS (شامل Little Snitch)

**v1.0.0**
- انتشار اولیه: RTL هوشمند فقط برای محتوا، محافظت از سایدبار، بکاپ خودکار

## 📄 لایسنس‌ها

- کد پچ‌ها: MIT — آزادانه استفاده و بهبود بدهید.
- فونت [Vazirmatn](https://github.com/rastikerdar/vazirmatn) اثر saber Rastikerdar: SIL Open Font License 1.1 (در `fonts/` برای تعبیه آفلاین همراه ریپو است).

### 🙏 مشارکت

PR ها پیشنهاد می‌شوند! اگر مسیر preload بهتری یا حالت خاصی پیدا کردید، یک issue باز کنید.

</div>
