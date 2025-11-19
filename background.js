// background.js - keep storing default value on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['enabled'], (res) => {
    if (typeof res.enabled === 'undefined') {
      chrome.storage.local.set({enabled: true});
    }
  });
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
