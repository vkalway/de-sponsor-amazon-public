// background.js - keep storing default value on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['enabled'], (res) => {
    if (typeof res.enabled === 'undefined') {
      chrome.storage.local.set({enabled: true});
    }
    // Set initial icon based on state
    updateIcon(res.enabled !== false);
  });
});

// Update icon based on enabled state
function updateIcon(enabled) {
  const iconSet = enabled ? {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  } : {
    "16": "icons/icon16-disabled.png",
    "48": "icons/icon48-disabled.png",
    "128": "icons/icon128-disabled.png"
  };
  chrome.action.setIcon({ path: iconSet });
}

// Listen for storage changes to update icon
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.enabled) {
    updateIcon(changes.enabled.newValue);
  }
});

// also forward action from popup (optional)
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg && msg.broadcast) {
    chrome.tabs.query({url: "*://*.amazon.*/*"}, (tabs) => {
      for (const t of tabs) {
        chrome.tabs.sendMessage(t.id, msg.data, ()=>{});
      }
    });
  }
});
