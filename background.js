const STORAGE_KEY = 'network-chunks-v2';
let originToUrls = new Map();


chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0) {
    const origin = new URL(details.url).origin;
    
    originToUrls.set(origin, new Set());
    chrome.action.setBadgeText({ text: '' });
    
    chrome.storage.local.set({ 
      [`${STORAGE_KEY}-${origin}`]: [], 
      [`seenChunks-${origin}`]: [],
    });
  }
}, { url: [{ hostContains: 'sprinklr.com' }] });


// 2. Intercept and isolate by Origin
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const match = details.url.match(/_next\/static\/chunks\/([a-zA-Z-]*)\./);
    
    if (match && match[1]) {
      const chunkName = match[1];
      const origin = details.initiator || 'INITIATOR';

      if (chunkName.length > 0) {
        if (!originToUrls.has(origin)) originToUrls.set(origin, new Set());
        const urls = originToUrls.get(origin);

        if (!urls.has(chunkName)) {
            urls.add(chunkName);
            chrome.action.setBadgeText({ text: urls.size.toString() });
            chrome.action.setBadgeBackgroundColor({ color: '#1D7671' });
            
            chrome.storage.local.set({ [`${STORAGE_KEY}-${origin}`]: Array.from(urls) }, () => {
              chrome.runtime.sendMessage({ action: "chunksUpdated", origin }).catch(() => {});
            });
        }
      }
    }
  },
  { urls: ["*://*.sprinklr.com/*"] }
);



chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "CLEAR") {
    const origin = request.payload.origin;
    originToUrls.set(origin, new Set());
    chrome.action.setBadgeText({ text: '' });
    
    // Clear both active and seen
    chrome.storage.local.set({ 
      [`${STORAGE_KEY}-${origin}`]: [],
      [`seenChunks-${origin}`]: [] 
    });
    sendResponse({ type: 'CLEAR_SUCCESSFUL' });
  }
});