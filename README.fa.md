[English](README.md) | **فارسی**

<div dir="rtl">

# پچ راست‌چین ZCode و AutoClaw

پشتیبانی راست‌به‌چپ (فارسی/عربی) برای اپ‌های دسکتاپ **ZCode** و **AutoClaw**. فقط متن RTL می‌شود — UI، ادیتور، ترمینال و منوها دست نمی‌خورند. متن فارسی با فونت تعبیه‌شده [وزیرمتن](https://github.com/rastikerdar/vazirmatn) و کاملاً آفلاین رندر می‌شود.

| اپ | پچر | لانچر (دبل‌کلیک) |
|---|---|---|
| ZCode | `zcode/zcode-rtl-patch.js` | `zcode/patch-zcode-mac.command` / `patch-zcode-windows.bat` |
| AutoClaw | `autoclaw/autoclaw-rtl-patch.js` | `autoclaw/patch-autoclaw-mac.command` / `patch-autoclaw-windows.bat` |

## شروع سریع

نیازمند [Node.js](https://nodejs.org/) ≥ 16.

```bash
git clone https://github.com/nimabhk/zcode-rtl-patch.git
cd zcode-rtl-patch
npm install        # یک‌بار
```

1. برنامه را کامل ببندید.
2. لانچر آن را دبل‌کلیک کنید، یا از ترمینال `sudo node zcode/zcode-rtl-patch.js` (یا `node autoclaw/autoclaw-rtl-patch.js`) را اجرا کنید.
3. برنامه را دوباره باز کنید.

فلگ‌های مفید: `--restore` (بازگردانی) · `--check` (AutoClaw: پیش‌نمایش بدون تغییر) · `--no-font` (ZCode: بدون فونت).

## بعد از پچ (macOS) — انتظار داشته باشید

- پچ، برنامه را دوباره امضا می‌کند؛ پس macOS دوباره پرمیژن‌های قبلی را می‌پرسد.
- **Little Snitch** موقع باز کردن برنامه هشدار *"application modification"* می‌دهد — روی **Accept/Allow** کلیک کنید تا برنامه باز شود. این هشدار ناشی از پچ است، نه بدافزار.
- آپدیت‌های برنامه پچ را پاک می‌کنند — فقط پچر را دوباره اجرا کنید (هرگز دانگرید نمی‌کند؛ بکاپ تمیز خودکار نگه داشته می‌شود).

مشکلی پیش آمد؟ پچر را با `--restore` اجرا کنید، یا برنامه را دوباره نصب کنید.

تاریخچه کامل نسخه‌ها (انگلیسی): [CHANGELOG.md](CHANGELOG.md)

## لایسنس

MIT (کد) · فونت وزیرمتن اثر صابر رستیکردار: SIL OFL 1.1

</div>
