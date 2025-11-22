// background.js - keep storing default value on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['enabled'], (res) => {
    if (typeof res.enabled === 'undefined') {
      chrome.storage.local.set({enabled: true});
      updateAllTabIcons(true);
    } else {
      updateAllTabIcons(res.enabled);
    }
  });
});

// Update icon for a specific tab based on enabled state
function updateTabIcon(tabId, enabled) {
  const iconPath = enabled ? {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  } : {
    "16": "icons/icon16-disabled.png",
    "48": "icons/icon48-disabled.png",
    "128": "icons/icon128-disabled.png"
  };
  
  chrome.action.setIcon({ path: iconPath, tabId: tabId });
}

// Update icons for all tabs
function updateAllTabIcons(enabled) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      updateTabIcon(tab.id, enabled);
    }
  });
}

// Listen for storage changes to update icons
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.enabled) {
    const newEnabled = changes.enabled.newValue;
    updateAllTabIcons(newEnabled);
  }
});

// Handle badge updates and broadcasts
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (!msg) return;
  
  // Update badge for the tab that sent the message
  if (msg.action === 'update_badge' && sender.tab) {
    const count = Number(msg.count) || 0;
    const badgeText = count > 0 ? String(count) : '';
    
    chrome.action.setBadgeText({ 
      text: badgeText,
      tabId: sender.tab.id 
    });
    
    chrome.action.setBadgeBackgroundColor({ 
      color: [247, 144, 37, 255],
      tabId: sender.tab.id 
    });
    
    chrome.action.setBadgeTextColor({
      color: '#FFFFFF',
      tabId: sender.tab.id
    });
  }
  
  // Forward broadcast messages
  if (msg.broadcast) {
    const amazonPatterns = [
      "*://*.amazon.com/*",
      "*://*.amazon.co.uk/*",
      "*://*.amazon.ca/*",
      "*://*.amazon.de/*",
      "*://*.amazon.in/*",
      "*://*.amazon.com.au/*",
      "*://*.amazon.fr/*",
      "*://*.amazon.it/*",
      "*://*.amazon.es/*",
      "*://*.amazon.nl/*",
      "*://*.amazon.co.jp/*",
      "*://*.amazon.com.mx/*",
      "*://*.amazon.com.br/*"
    ];
    
    chrome.tabs.query({url: amazonPatterns}, (tabs) => {
      if (!tabs || !Array.isArray(tabs)) return;
      for (const t of tabs) {
        chrome.tabs.sendMessage(t.id, msg.data, ()=>{});
      }
    });
  }
});

// Check if URL is an Amazon domain
function isAmazonURL(url) {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.includes('amazon.');
  } catch(e) {
    return false;
  }
}

// Update icon based on tab URL and storage state
function updateIconForTab(tabId, url) {
  const isAmazon = isAmazonURL(url);
  chrome.storage.local.get({ enabled: true }, (items) => {
    // Show disabled icon on non-Amazon sites, or when disabled on Amazon
    const shouldShowEnabled = isAmazon && items.enabled;
    updateTabIcon(tabId, shouldShowEnabled);
  });
}

// Clear badge when tab is updated (navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    if (tab.url && tab.url.includes('amazon')) {
      chrome.action.setBadgeText({ text: '', tabId: tabId });
    }
    // Update icon for any URL
    updateIconForTab(tabId, tab.url);
  }
});

// Handle tab activation (switching between tabs)
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError || !tab) return;
    updateIconForTab(activeInfo.tabId, tab.url);
  });
});
