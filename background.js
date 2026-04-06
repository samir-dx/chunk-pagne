const STORAGE_KEY = 'network-chunks-v2';
let tabToUrls = new Map();
let syncTimers = new Map();

// Debounced Tab Sync
function debouncedSync(tabId) {
  if (syncTimers.has(tabId)) clearTimeout(syncTimers.get(tabId));
  
  syncTimers.set(tabId, setTimeout(() => {
    const urls = tabToUrls.get(tabId) || new Set();
    
    // Update the badge for this specific tab only
    chrome.action.setBadgeText({ text: urls.size.toString(), tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#1D7671', tabId: tabId });
    
    // Write to tab-specific storage
    chrome.storage.local.set({ [`${STORAGE_KEY}-${tabId}`]: Array.from(urls) }, () => {
      chrome.runtime.sendMessage({ action: "chunksUpdated", tabId: tabId }).catch(() => {});
    });
  }, 200));
}

// Clear Tab on Refresh
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0 && details.tabId !== -1) {
    const tabId = details.tabId;
    
    if (syncTimers.has(tabId)) clearTimeout(syncTimers.get(tabId));
    tabToUrls.set(tabId, new Set());
    
    chrome.action.setBadgeText({ text: '', tabId: tabId });
    chrome.storage.local.set({ 
      [`${STORAGE_KEY}-${tabId}`]: [], 
      [`seenChunks-${tabId}`]: [] 
    });
  }
}, { url: [{ hostContains: 'sprinklr.com' }] });

// Intercept and isolate by Tab ID
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId === -1) return; // Ignore background system requests

    const match = details.url.match(/_next\/static\/chunks\/([a-zA-Z-]*)\./);
    if (match && match[1]) {
      const chunkName = match[1];
      if (chunkName.length > 0) {
        const tabId = details.tabId;
        
        if (!tabToUrls.has(tabId)) tabToUrls.set(tabId, new Set());
        const urls = tabToUrls.get(tabId);

        if (!urls.has(chunkName)) {
            urls.add(chunkName);
            debouncedSync(tabId);
        }
      }
    }
  },
  { urls: ["*://*.sprinklr.com/*"] }
);

// manual clear from Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "CLEAR") {
    const tabId = request.payload.tabId;
    
    if (syncTimers.has(tabId)) clearTimeout(syncTimers.get(tabId));
    tabToUrls.set(tabId, new Set());
    
    chrome.action.setBadgeText({ text: '', tabId: tabId });
    chrome.storage.local.set({ 
      [`${STORAGE_KEY}-${tabId}`]: [],
      [`seenChunks-${tabId}`]: [] 
    });
    sendResponse({ type: 'CLEAR_SUCCESSFUL' });
  }
});

// Fallback for Tab Updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('sprinklr.com')) {
    const urls = tabToUrls.get(tabId);
    if (urls && urls.size > 0) {
      chrome.action.setBadgeText({ text: urls.size.toString(), tabId: tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#1D7671', tabId: tabId });
    }
  }
});

// Memory Cleanup: Wipe storage when a tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabToUrls.delete(tabId);
  chrome.storage.local.remove([`${STORAGE_KEY}-${tabId}`, `seenChunks-${tabId}`]);
});