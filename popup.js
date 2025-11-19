// popup.js - Fixed toggle functionality
const toggleInput = document.getElementById('toggle');
const status = document.getElementById('status');
const refreshBox = document.getElementById('refreshBox');
const refreshBtn = document.getElementById('refreshBtn');
const switchEl = document.getElementById('switch');
const blockedCountEl = document.getElementById('blockedCount');

let isAmazonSite = false;

function setStatusText(text) {
  status.textContent = text;
}

// Helper to set switch UI state
function setSwitchUI(checked) {
  toggleInput.checked = !!checked;
  if (checked) {
    switchEl.classList.add('on');
    switchEl.setAttribute('aria-checked', 'true');
  } else {
    switchEl.classList.remove('on');
    switchEl.setAttribute('aria-checked', 'false');
  }
}

// Show refresh box
function showRefreshBox() {
  refreshBox.style.display = 'block';
}

// Hide refresh box
function hideRefreshBox() {
  refreshBox.style.display = 'none';
}

// Check if a URL is an Amazon domain
function isAmazonURL(url) {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.includes('amazon.');
  } catch(e) {
    return false;
  }
}

// Load current stored preference and update UI
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const currentTab = tabs && tabs[0];
  isAmazonSite = currentTab ? isAmazonURL(currentTab.url) : false;
  
  chrome.storage.local.get({ enabled: true }, (items) => {
    const storedEnabled = !!items.enabled;
    
    // Show the stored state if on Amazon, otherwise show as disabled
    const displayEnabled = isAmazonSite ? storedEnabled : false;
    
    setSwitchUI(displayEnabled);
    
    if (!isAmazonSite) {
      setStatusText('Only works on Amazon');
      switchEl.style.opacity = '0.5';
      switchEl.style.cursor = 'not-allowed';
    } else {
      setStatusText(storedEnabled ? 'Blocking is ON' : 'Blocking is OFF');
      switchEl.style.opacity = '1';
      switchEl.style.cursor = 'pointer';
    }
    
    hideRefreshBox();
    // Query the active tab for the number of ads blocked on this page
    fetchBlockedCountFromActiveTab();
  });
});

// Handle toggle change
function handleToggleChange(enabled) {
  // Store preference
  chrome.storage.local.set({ enabled }, () => {
    setSwitchUI(enabled);
    setStatusText(enabled ? 'Blocking is ON' : 'Blocking is OFF');
    // Notify all amazon tabs (content.js listens for enable/disable)
    notifyAllTabs(enabled);
    // Show the refresh UI so the user can make changes take effect
    showRefreshBox();
    // update count (content script may have updated or will update after reload)
    setTimeout(fetchBlockedCountFromActiveTab, 300);
  });
}

// Click handler for the custom switch UI
switchEl.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  // Prevent toggle on non-Amazon sites
  if (!isAmazonSite) {
    return;
  }
  
  const newVal = !toggleInput.checked;
  toggleInput.checked = newVal;
  handleToggleChange(newVal);
});

// Notify all Amazon tabs
function notifyAllTabs(enabled) {
  chrome.tabs.query({ url: "*://*.amazon.*/*" }, (tabs) => {
    for (const t of tabs) {
      chrome.tabs.sendMessage(t.id, { action: enabled ? 'enable' : 'disable' }, () => {
        // Ignore errors (tab might not have content script loaded)
        if (chrome.runtime.lastError) {
          // Silent error handling
        }
      });
    }
  });
}

// Update blocked count UI
function setBlockedCount(count) {
  if (!blockedCountEl) return;
  blockedCountEl.textContent = String(Number(count) || 0);
}

// Ask the active tab's content script for the blocked count on that page
function fetchBlockedCountFromActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs.length) return setBlockedCount(0);
    const tabId = tabs[0].id;
    chrome.tabs.sendMessage(tabId, { action: 'get_blocked_count' }, (resp) => {
      if (chrome.runtime.lastError) {
        // No content script or other error — default to 0
        setBlockedCount(0);
        return;
      }
      if (resp && typeof resp.count === 'number') {
        setBlockedCount(resp.count);
      } else {
        setBlockedCount(0);
      }
    });
  });
}

// Refresh button: reload the currently active tab
refreshBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs.length) {
      chrome.tabs.reload(tabs[0].id, () => {
        // Hide refresh box after reload is initiated
        hideRefreshBox();
        // Close popup after a brief delay
        setTimeout(() => {
          window.close();
        }, 100);
      });
    }
  });
});