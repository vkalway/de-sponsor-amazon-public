# Copilot / AI Agent Instructions for Amazon-Ad-block

Purpose: Help an AI coding agent become productive quickly in this Chrome extension.

**Big Picture**:
- **Type:** Chromium extension (Manifest V3). Key files: `manifest.json`, `background.js` (service worker), `content.js` (content script), `popup.html` + `popup.js` (UI).
- **What it does:** Injects `content.js` into Amazon domains (see `manifest.json` `content_scripts.matches`) and hides sponsored results inside the main search region. The popup toggles behavior via `chrome.storage.local` and messaging.

**Data flows & service boundaries**:
- Persistent state: `chrome.storage.local` key `enabled` (default true). `background.js` initializes default on `onInstalled`.
- UI → background/content: `popup.js` writes `enabled` to storage and calls `chrome.tabs.sendMessage(tabId, { action: 'enable'|'disable' })` to notify content scripts.
- Background broadcast: `background.js` listens for messages with `{ broadcast: true, data }` and forwards `data` using `chrome.tabs.sendMessage` to Amazon tabs.
- Content script behavior: `content.js` reads storage on init, runs `scanSubtree(document)`, and uses a `MutationObserver` on the main results container to remove nodes when new content loads.

**Important code patterns to mirror or preserve**:
- Selectors and heuristics are central and intentionally conservative. See `content.js` constants: `EXPLICIT_LABEL_SELECTORS`, `RESULT_CONTAINER_SELECTORS`, `WIDGET_CANDIDATE_SELECTORS`.
  - Example: `EXPLICIT_LABEL_SELECTORS` contains selectors like `a.s-widget-sponsored-label-text` and `a[aria-label*="Sponsored"]` — changes here directly affect removal behavior.
- Node identification: `locateCandidateContainers(startNode)` climbs up to 14 parents to prefer product containers over widget containers. Avoid changing the climbing depth without testing.
- Removal safety: `removeSafe(node)` falls back to `display: none` if `.remove()` fails. Keep this pattern to avoid breaking pages.
- Text detection: `containsSponsoredLabel` uses a `TreeWalker` and limits depth/child checks to avoid false positives. Preserve these limits when tuning detection.

**Messaging conventions**:
- Popup → content: `{ action: 'enable' }` or `{ action: 'disable' }` (see `popup.js` and `content.js` handlers).
- Background broadcast: send `{ broadcast: true, data: <any> }` to `chrome.runtime.sendMessage` so `background.js` can forward to Amazon tabs.

**Manifest / permissions**:
- `manifest.json` uses `manifest_version: 3` and declares `host_permissions` covering many `amazon.*` domains. Edits to host coverage must be added in `manifest.json`.
- Background is a `service_worker` (`background.js`) — be aware MV3 service workers are short-lived; use the extension page to reload and inspect the worker.

**Developer/debug workflows (explicit, reproducible steps)**:
1. Open Chrome/Edge and go to `chrome://extensions`.
2. Enable Developer mode and click **Load unpacked**, select the repository root folder containing `manifest.json`.
3. After code changes to `background.js` (service worker), click the extension's **Reload** button on the extensions page to restart the service worker.
4. To inspect the background/service worker console: click **Service worker** → **Inspect** on the extension card.
5. To test content behavior, open an Amazon search results page (e.g., `https://www.amazon.com/s?k=...`). Use DevTools Console on the page to observe any runtime errors from `content.js`.
6. Toggling the UI in `popup.html` runs `popup.js` which will show a refresh box — click the provided **Refresh** button to reload the active tab and apply changes immediately.

**Files to review for small changes / unit of change**:
- `content.js`: main scanning/removal logic. Small, targeted edits here are typical for feature work (selector tuning, observability, performance).
- `popup.js` / `popup.html`: UX for toggling and refresh flow; altering UI requires consistent updates to `popup.html` styles and IDs referenced in `popup.js`.
- `background.js`: initialization and optional broadcast forwarding; keep code minimal because MV3 service workers may be restarted.

**Testing notes / what to look for after edits**:
- After editing `content.js`, reload the extension and refresh Amazon pages. Verify sponsored items are removed only inside the `div.s-main-slot` / main results.
- Avoid removing large widgets blindly — logic explicitly prefers removing `productContainer` over `widgetContainer`.
- When tuning selectors, test across at least two Amazon locales (e.g., `amazon.com` and `amazon.co.uk`) because host coverage is broad in `manifest.json`.

If anything in these instructions is unclear or you'd like more details (e.g., sample payloads, test checklist, or a quick debug helper script), tell me which section to expand.
