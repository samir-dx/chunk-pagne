const STORAGE_KEY = 'network-chunks-v2';
let originToUrls = new Map();

function getStorageKey (origin) {
  return `${STORAGE_KEY}-${origin}`;
}

// Helper to write to specific origin storage
async function writeToOriginStorage(origin, urlsArray) {
  const key = getStorageKey(origin);
  return new Promise(resolve => {
    chrome.storage.local.set({ [key]: urlsArray }, () => {
      chrome.runtime.sendMessage({ action: "chunksUpdated", origin }).catch(() => {});
      resolve();
    });
  });
}

// 1. Bulletproof Clear on Refresh (Origin-Aware)
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0) {
    const origin = new URL(details.url).origin;
    
    // Only clear the chunks for the specific origin being reloaded!
    originToUrls.set(origin, new Set());
    chrome.action.setBadgeText({ text: '' });
    
    // Reset storage for this origin only
    chrome.storage.local.set({ 
      [getStorageKey(origin)]: [],
      [`seenChunks-${origin}`]: [] 
    });
  }
}, { url: [{ hostContains: 'sprinklr.com' }] });


// 2. Intercept and isolate by Origin
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const match = details.url.match(/_next\/static\/chunks\/([a-zA-Z-]*)\./);
    const chunkName = match ? match[1] : null;
    const origin = details.initiator || 'INITIATOR';

    if (chunkName && chunkName.length > 0) {
      if (!originToUrls.has(origin)) originToUrls.set(origin, new Set());
      const urls = originToUrls.get(origin);

      if (!urls.has(chunkName)) {
        urls.add(chunkName);
        
        chrome.action.setBadgeText({ text: urls.size.toString() });
        chrome.action.setBadgeBackgroundColor({ color: '#1D7671' });

        writeToOriginStorage(origin, Array.from(urls));
      }
    }
  },
  { urls: ["*://*.sprinklr.com/*"] }
);

// 3. Handle manual clear from Popup
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.type === "CLEAR") {
    const origin = request.payload.origin;
    originToUrls.set(origin, new Set());
    chrome.action.setBadgeText({ text: '' });
    
    await writeToOriginStorage(origin, []);
    chrome.storage.local.set({ [`seenChunks-${origin}`]: [] });
    sendResponse({ type: 'CLEAR_SUCCESSFUL' });
  }
});