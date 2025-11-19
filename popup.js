// popup.js - Fixed toggle functionality
const toggleInput = document.getElementById('toggle');
const status = document.getElementById('status');
const refreshBox = document.getElementById('refreshBox');
const refreshBtn = document.getElementById('refreshBtn');
const switchEl = document.getElementById('switch');

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

// Load current stored preference and update UI
chrome.storage.local.get({ enabled: true }, (items) => {
  const enabled = !!items.enabled;
  setSwitchUI(enabled);
  setStatusText(enabled ? 'Blocking is ON' : 'Blocking is OFF');
  hideRefreshBox();
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
  });
}

// Click handler for the custom switch UI
switchEl.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
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