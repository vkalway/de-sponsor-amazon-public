# De-Sponsor for Amazon

Free and open-source Chrome extension that hides sponsored results on Amazon search pages so organic results are easier to scan.

## Features

- Removes sponsored listings from Amazon search result areas.
- Watches dynamically loaded results and keeps filtering as new items appear.
- One-click ON/OFF toggle from the extension popup.
- Per-page blocked count and lifetime blocked count.
- Toolbar icon updates to reflect enabled/disabled state.
- Works across multiple Amazon country domains.

## Supported Amazon Domains

- amazon.com
- amazon.co.uk
- amazon.ca
- amazon.de
- amazon.in
- amazon.com.au
- amazon.fr
- amazon.it
- amazon.es
- amazon.nl
- amazon.co.jp
- amazon.com.mx
- amazon.com.br

## Install (Load Unpacked)

1. Clone this repository:
   - `git clone https://github.com/vkalway/de-sponsor-amazon-public.git`
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select this project folder (the one that contains `manifest.json`).

## How to Use

1. Open any Amazon search page.
2. Click the extension icon.
3. Toggle **Block sponsored results** ON or OFF.
4. Click **Refresh** in the popup to apply the change on the current tab.

## How It Works

- `content.js`:
  - Runs on Amazon pages at `document_end`.
  - Scans the main search region for explicit sponsored labels/selectors.
  - Removes only matched result containers to reduce false positives.
  - Observes DOM updates with `MutationObserver` to handle infinite scroll/lazy content.
- `popup.js` + `popup.html`:
  - Manages toggle state and refresh flow.
  - Reads and writes `enabled` and counters in `chrome.storage.local`.
- `background.js`:
  - Initializes defaults on install.
  - Updates toolbar icon and badge.
  - Opens `welcome.html` on first install.

## Permissions and Privacy

- Uses `storage` permission only.
- Uses host permissions for listed Amazon domains.
- Does not require account login.
- No external backend calls are required for core blocking behavior.

## Project Structure

- `manifest.json` - MV3 configuration, permissions, content script registration.
- `background.js` - service worker for icon/badge state and startup behavior.
- `content.js` - sponsored-result detection and removal logic.
- `popup.html` - popup UI.
- `popup.js` - popup state, toggle actions, counters, refresh action.
- `welcome.html` - shown once on install.
- `icons/` - extension icons.

## Local Development Workflow

1. Make changes in this repo.
2. In `chrome://extensions`, click **Reload** on the extension card.
3. Refresh your Amazon tab and verify behavior.
4. If changing service worker logic (`background.js`), reload the extension to restart the worker.

## Troubleshooting

- Toggle changed but page did not update:
  - Click **Refresh** in the popup.
- Block count shows 0:
  - Ensure you are on an Amazon page and the extension is ON.
- Extension appears disabled on non-Amazon sites:
  - Expected behavior; filtering is Amazon-only.

## Contributing

Issues and pull requests are welcome.

- Repository: https://github.com/vkalway/de-sponsor-amazon-public
