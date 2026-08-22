# Changelog

All notable changes to this project. The date format is YYYY-MM-DD.

## [1.2.5] — 2026-08-23

### AutoClaw (streaming rewrite)
- **Anti-flicker two-tier bidi**: during streaming, ONE sticky `dir="rtl"` attribute is placed on the streaming message's text container — discovered **structurally** from the mutating text blocks (bounded shallow-ancestor growth, never by class-name matching) — so React's node re-creation cannot cause LTR/RTL flicker, and the flip can structurally never escape the message into UI chrome (menus, toolbars, input box). Direction is decided early from the first Persian words, not at stream end.
- **Settle pass** (after ~800 ms of mutation silence, plus a 60 s sweep): pure-English paragraphs/headers inside RTL messages get `dir="ltr"`; mixed paragraphs inherit the message direction — readable while streaming, polished after it finishes.
- Code-block text is excluded from the script-majority count, so Persian replies full of code still count as Persian.

### Both patchers
- **Arrow mirroring in RTL text**: right-pointing arrows (→ ⇒ ⟶ ➡) are mirrored to left-pointing (← ⇐ ⟵ ⬅) inside RTL content. The replacement is one-way, so repeated passes and React re-renders stay idempotent; code blocks (`pre`/`code`/`kbd`) are never touched.

## [1.2.4] — 2026-08-22

### ZCode
- **Sidebar/list rows final fix**: inside row contexts (`aside`, `nav`, `[class*="sidebar"]`, `[class*="list-row"]`) **only leaf text `<span>` elements may flip** to RTL. Containers (`div`, `li`, `ul`, `p`, …) are never flipped there, so task-list rows keep their default geometry — timestamps (`14m`/`3d`) stay on the right, fade/truncation overlays stay on the correct side — while Persian task titles render RTL.

## [1.2.3] — 2026-08-22

### ZCode
- Added a rightward reveal animation (`zcode-rtl-reveal`) for RTL title spans on hover in sidebars/list rows — ZCode's built-in leftward marquee is wrong for RTL text (it faded out the beginning of the title); the override slides the title right and back.
- First row-context guard (divs skipped inside sidebar/list-row contexts) — fixed the animation direction; timestamps/fade still displaced (fully fixed in 1.2.4).

## [1.2.2] — 2026-08-22

### ZCode & AutoClaw
- **User chat messages RTL (ZCode)**: the scanner now also covers `div` elements, using **direct text nodes only** (majority script) — chat bubbles render user text as raw text nodes inside divs; layout wrappers never flip. Same proven mechanism as AutoClaw.
- **Sidebar/task titles RTL (both apps)**: relaxed the sidebar LTR protection from *all descendants* to *container-level* (`aside`, `nav`, `[class*='sidebar']` in ZCode; `.ant-menu`, `.ant-layout-sider` in AutoClaw), and added `span` to the scan list, so Persian titles inside sidebars can go RTL while panel chrome stays LTR. Dropdown menus, editor, terminal and `pre`/`code` remain fully LTR-locked.
- Added `[dir='rtl'] { text-align: start }` so flipped divs/spans align right.

## [1.2.1] — 2026-08-22

### Repo layout
- Patchers moved into per-app folders: `zcode/` and `autoclaw/` (git rename history preserved); ZCode launchers renamed to `patch-zcode-mac.command` / `patch-zcode-windows.bat`; shared fonts stay in `fonts/`; both patchers share the repo-root `npm install`.

### ZCode
- Switched from `npx asar` to the pinned local `@electron/asar` library — fixes Windows (npx cannot run through argument-array child-process calls there) and removes the unpinned-npx supply-chain concern. The ENOENT retry is now guarded by a path-containment check against the temp extract dir.

### AutoClaw
- Payload ported to the same **majority-script bidi rule** as ZCode — English-leading mostly-Persian sentences stay readable; extended Arabic-script Unicode ranges (incl. presentation forms); user-bubble detection counts the dominant script over direct text nodes.

### Supply chain
- Vazirmatn download URLs pinned to release tag `v33.003` (byte-identical to the bundled fonts) and restricted to `raw.githubusercontent.com` over https, redirects included.

## [1.2.0] — 2026-08-22

### AutoClaw (new patcher)
- `autoclaw-rtl-patch.js`: content-only RTL for AutoClaw's chat UI (agent markdown, user bubbles via direct-text-node detection, lists, tables), `dir="auto"` inputs, unpack-preserving repack (`app.asar.unpacked` layout kept), post-repack verification with atomic swap, `--check` read-only mode, pinned local `@electron/asar`, embedded Vazirmatn variable font (fully offline).

### ZCode
- Smart per-paragraph **majority bidi** — mixed Persian/English sentences stay readable ("Claude Code این قابلیت را دارد" → RTL; "use این tool" → LTR). Replaced the v1.1 approach (forced `dir="rtl"` + `unicode-bidi: plaintext` on content elements, which scrambled English-leading sentences).
- `unicode-bidi: plaintext` on textareas/inputs (fixes input caret jumps after spaces and first-line direction).
- Optional embedded Vazirmatn (Regular + Bold) with `--no-font` flag; `vazirmatn-font.js` loader prefers bundled `fonts/`, falls back to a one-time official-repo download at patch time (never at app runtime).
- Wider Arabic-script Unicode ranges; CLI-argument hardening (`slice(2)` + `app.asar` basename guard).

## [1.1.0] — 2026-08-20

- **Update-safe backup handling**: running the patch after a ZCode update refreshes the backup instead of restoring the old one (fixes silent downgrade).
- Idempotent injection (previous patch stripped before re-injecting); one-command undo `--restore`.
- Double-click launchers for macOS/Windows; re-signing uses the detected app path instead of a hardcoded one; console notes about expected macOS permission prompts.

## [1.0.0] — 2026-07-29

- Initial release: smart content-only RTL, sidebar protection, automatic backup, security-audited injection (DOM-only payload, no network/file access).
