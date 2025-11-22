// content.js (targeted removal — only remove sponsored items inside main search results)
// Tightened rules: only remove if the candidate is inside the main results container
// AND the candidate (or its subtree) actually contains an explicit "Sponsored" label.
// Based on user's snippets (s-searchgrid-carousel / s-widget-sponsored-label-text / puis-sponsored-label-text).
// See provided snippets for context. :contentReference[oaicite:2]{index=2} :contentReference[oaicite:3]{index=3}

const ENABLED_DEFAULT = true;
let enabled = true;
let observer = null;
let blockedCount = 0;
let styleElement = null;

// CSS rules to hide sponsored content (matches hide-sponsored.css)
const HIDE_SPONSORED_CSS = `
div.s-main-slot [data-component-type="s-search-result"]:has(.s-widget-sponsored-label-text),
div.s-main-slot [data-component-type="s-search-result"]:has(.puis-sponsored-label-text),
div.s-main-slot [data-component-type="s-search-result"]:has(a[aria-label*="Sponsored"]),
div.s-main-slot div.s-result-item:has(.s-widget-sponsored-label-text),
div.s-main-slot div.s-result-item:has(.puis-sponsored-label-text),
div.s-main-slot div.s-result-item:has(a[aria-label*="Sponsored"]),
div.s-main-slot div[data-asin]:has(.s-widget-sponsored-label-text),
div.s-main-slot div[data-asin]:has(.puis-sponsored-label-text),
div.s-main-slot div[data-asin]:has(a[aria-label*="Sponsored"]),
div.s-main-slot div.s-card-container:has(.s-widget-sponsored-label-text),
div.s-main-slot div.s-card-container:has(.puis-sponsored-label-text),
div.s-main-slot div.s-card-container:has(a[aria-label*="Sponsored"]),
div.s-main-slot li.a-carousel-card:has(.s-widget-sponsored-label-text),
div.s-main-slot li.a-carousel-card:has(.puis-sponsored-label-text),
div.s-main-slot li.a-carousel-card:has(a[aria-label*="Sponsored"]),
div.s-main-slot div.s-widget-container:has(.s-widget-sponsored-label-text),
div.s-main-slot div.s-widget-container:has(.puis-sponsored-label-text),
div.s-main-slot div.s-widget-container:has(a[aria-label*="Sponsored"]),
div.s-main-slot div.s-searchgrid-carousel:has(.s-widget-sponsored-label-text),
div.s-main-slot div.s-searchgrid-carousel:has(.puis-sponsored-label-text),
div.s-main-slot div.s-searchgrid-carousel:has(a[aria-label*="Sponsored"]) {
  display: none !important;
  visibility: hidden !important;
}
`;

// Inject or remove dynamic CSS based on enabled state
function updateCSS(enable) {
  if (enable) {
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'amazon-ad-block-dynamic-css';
      styleElement.textContent = HIDE_SPONSORED_CSS;
      (document.head || document.documentElement).appendChild(styleElement);
    }
  } else {
    if (styleElement) {
      styleElement.remove();
      styleElement = null;
    }
  }
}

// Main results container selector(s)
function getMainResultsContainer() {
  return document.querySelector('div.s-main-slot') || document.querySelector('#search') || document.body;
}

// small utility
function textOf(el){
  try { return (el.innerText || el.textContent || '').trim(); } catch(e){ return ''; }
}

// Known explicit label selectors (from snippets)
const EXPLICIT_LABEL_SELECTORS = [
  'a.s-widget-sponsored-label-text',
  '.s-widget-sponsored-label-text',
  '.puis-sponsored-label-text',
  '.puis-label-popover',
  '.puis-label-popover-default',
  'span._ZGFyZ_ad-feedback-text-desktop_q3xp_',  // top-ad ad-feedback (only remove if inside main results)
  'a[aria-label*="Sponsored"]',
  'a[role="button"].s-widget-sponsored-label-text'
];

// Candidate container selectors (product card / result item)
const RESULT_CONTAINER_SELECTORS = [
  '[data-component-type="s-search-result"]',
  'div.s-result-item',
  'div[data-asin]',
  'article',
  'div.s-card-container'
];

// Candidate widget/carousel selectors (we will NOT remove them blindly)
const WIDGET_CANDIDATE_SELECTORS = [
  'div.s-widget-container',
  'div.s-searchgrid-carousel',
  'div.a-carousel-container',
  'div[data-component-type="s-searchgrid-carousel"]',
  'span[data-component-type="aspa-asin-ajax-lazy-loader"]',
];

// climb up from a label node and prefer: carousel item -> product container -> widget container -> fallback
function locateCandidateContainers(startNode){
  let productContainer = null;
  let widgetContainer = null;
  let carouselItem = null;
  let cur = startNode;
  for (let i = 0; i < 14 && cur; i++, cur = cur.parentElement){
   try {
      // Check for carousel item first (li.a-carousel-card)
      // This is crucial: if inside a carousel, we must remove the <li> to avoid empty slots
      if (!carouselItem && cur.matches && cur.matches('li.a-carousel-card')) {
        carouselItem = cur;
      }
      // Always check for product container to find the outermost one (e.g. s-result-item)
      // This prevents leaving empty slots by removing inner containers (like s-card-container)
      // while leaving the grid cell (s-result-item) intact.
      for (const s of RESULT_CONTAINER_SELECTORS) {
        if (cur.matches && cur.matches(s)) {
          productContainer = cur;
          break;
        }
      }
      if (!widgetContainer) {
        for (const s of WIDGET_CANDIDATE_SELECTORS) {
          if (cur.matches && cur.matches(s)) {
            widgetContainer = cur;
            break;
          }
        }
      }
    } catch(e){}
  }
  return {productContainer, widgetContainer, carouselItem};
}

// safe remove
function removeSafe(node){
  if (!node) return false;
  try {
    node.remove();
    return true;
  } catch(e){
    try { node.style.display = 'none'; return true; } catch(e2) { return false; }
  }
}

// Find the carousel container that contains this node
function findCarouselContainer(node) {
  if (!node) return null;
  let current = node;
  for (let i = 0; i < 15 && current; i++, current = current.parentElement) {
    try {
      if (current.matches && (
        current.matches('div.s-searchgrid-carousel') ||
        current.matches('div.a-carousel-container') ||
        current.matches('[data-component-type="s-searchgrid-carousel"]') ||
        current.matches('.a-carousel-viewport') ||
        current.matches('[cel_widget_id*="carousel"]')
      )) {
        return current;
      }
    } catch(e) {}
  }
  return null;
}

// check if node is inside the main results container
function isInsideMainResults(node){
  const main = getMainResultsContainer();
  if (!main) return false;
  return main.contains(node);
}

// does this element (or its subtree) contain explicit sponsored indicator?
function containsSponsoredLabel(el){
  if (!el) return false;
  // 1) explicit selectors
  for (const sel of EXPLICIT_LABEL_SELECTORS) {
    try {
      if (el.querySelector && el.querySelector(sel)) return true;
    } catch(e){}
  }
  // 2) visible text 'Sponsored' somewhere in subtree (limit depth scan)
  try {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);
    let n;
    let depth = 0;
    while ((n = walker.nextNode()) && depth < 1000) {
      depth++;
      // ignore nodes with many children (we want small label spans)
      if (n.childElementCount > 6) continue;
      const t = textOf(n);
      if (/\bSponsored\b/i.test(t)) return true;
    }
  } catch(e){}
  return false;
}

// scan a subtree (or whole doc) but only act on nodes inside main results
function scanSubtree(root = document){
  if (!enabled) return 0;
  let removed = 0;
  const main = getMainResultsContainer();
  if (!main) return 0;

  // 1) Explicit label elements inside main results
  for (const sel of EXPLICIT_LABEL_SELECTORS) {
    let list = [];
    try { list = Array.from((root.querySelectorAll && root.querySelectorAll(sel)) || []); } catch(e){ list = []; }
    for (const labelEl of list) {
      if (!isInsideMainResults(labelEl)) continue;            // only within search results
      // locate candidate containers
      const {productContainer, widgetContainer, carouselItem} = locateCandidateContainers(labelEl);

      // If inside a carousel, remove the carousel item (<li>) to prevent empty slots
      if (carouselItem && isInsideMainResults(carouselItem)) {
        if (removeSafe(carouselItem)) {
          removed++;
        }
        continue;
      }

      // If a product-level container exists, remove it (single search result)
      if (productContainer && isInsideMainResults(productContainer)) {
        if (removeSafe(productContainer)) {
          removed++;
        }
        continue;
      }

      // If a widget-level container exists, remove it only if the widget contains a sponsored label (double-check)
      if (widgetContainer && isInsideMainResults(widgetContainer)) {
        if (containsSponsoredLabel(widgetContainer)) {
          if (removeSafe(widgetContainer)) {
            removed++;
          }
        }
      }
    }
  }

  // 2) Fallback: find any small element with visible text 'Sponsored' inside main results
  try {
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_ELEMENT);
    let node;
    while (node = walker.nextNode()){
      // skip big nodes
      if (node.childElementCount > 6) continue;
      const t = textOf(node);
      if (/\bSponsored\b/i.test(t)) {
        // ensure the node is inside main results (it is, because walker is on main)
        const {productContainer, widgetContainer, carouselItem} = locateCandidateContainers(node);
        
        // Prioritize carousel item removal to prevent empty slots
        if (carouselItem && isInsideMainResults(carouselItem)) {
          if (removeSafe(carouselItem)) {
            removed++;
          }
          continue;
        }
        
        if (productContainer && isInsideMainResults(productContainer)) {
          if (removeSafe(productContainer)) {
            removed++;
          }
          continue;
        }
        if (widgetContainer && isInsideMainResults(widgetContainer) && containsSponsoredLabel(widgetContainer)) {
          if (removeSafe(widgetContainer)) {
            removed++;
          }
          continue;
        }
        // as final fallback, remove nearest result-like div if inside main results
        let fallback = node.closest('li.a-carousel-card') || node.closest('div.s-result-item') || node.closest('[data-component-type="s-search-result"]') || node.closest('div[data-asin]');
        if (fallback && isInsideMainResults(fallback)) {
          if (removeSafe(fallback)) {
            removed++;
          }
        }
      }
    }
  } catch(e){}

  return removed;
}

// Update badge with current blocked count
function updateBadge() {
  try {
    chrome.runtime.sendMessage({ action: 'update_badge', count: blockedCount }, () => {
      if (chrome.runtime.lastError) {
        // Silent error handling
      }
    });
  } catch(e) {}
}

// Increment total blocked count in storage
function incrementTotalBlocked(count) {
  if (count <= 0) return;
  try {
    chrome.storage.local.get({ totalBlocked: 0 }, (items) => {
      const newTotal = (items.totalBlocked || 0) + count;
      chrome.storage.local.set({ totalBlocked: newTotal });
    });
  } catch(e) {}
}

// observer: only watch main results region
function startObserver(){
  if (observer) return;
  const target = getMainResultsContainer() || document.body;
  observer = new MutationObserver((mutations)=>{
    for (const m of mutations){
      if (m.addedNodes && m.addedNodes.length) {
        for (const n of Array.from(m.addedNodes)){
          try { 
            const r = scanSubtree(n); 
            if (r) {
              blockedCount += r;
              incrementTotalBlocked(r);
              updateBadge();
            }
          } catch(e){}
        }
      }
    }
  });
  observer.observe(target, { childList: true, subtree: true });
}

function stopObserver(){
  if (!observer) return;
  observer.disconnect();
  observer = null;
}

// storage/init/messages
function init(){
  blockedCount = 0; // Reset count on init (new page or reload)
  chrome.storage.local.get({enabled: ENABLED_DEFAULT}, (items) => {
    enabled = !!items.enabled;
    updateCSS(enabled); // Inject or remove CSS dynamically
    if (enabled) {
      try { 
        const r = scanSubtree(document); 
        if (r) {
          blockedCount += r;
          incrementTotalBlocked(r);
          updateBadge();
        }
      } catch(e){}
      startObserver();
    } else {
      stopObserver();
      blockedCount = 0;
      updateBadge();
    }
  });
}

// Consolidated message listener for all actions
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.action) return false;
  
  if (msg.action === 'enable') {
    chrome.storage.local.set({enabled: true});
    enabled = true;
    updateCSS(true); // Inject CSS
    blockedCount = 0;
    try { 
      const r = scanSubtree(document); 
      if (r) {
        blockedCount += r;
        incrementTotalBlocked(r);
        updateBadge();
      }
    } catch(e){}
    startObserver();
    return false;
  } else if (msg.action === 'disable') {
    chrome.storage.local.set({enabled: false});
    enabled = false;
    updateCSS(false); // Remove CSS
    blockedCount = 0; // Reset count when disabling
    stopObserver();
    blockedCount = 0;
    updateBadge();
    // reload to restore original page reliably
    try { window.location.reload(); } catch(e){}
    return false;
  } else if (msg.action === 'get_blocked_count') {
    try {
      sendResponse({ count: blockedCount });
    } catch (e) {
      sendResponse({ count: 0 });
    }
    return true; // Indicate async response handling
  }
  
  return false;
});

// run on load
init();
