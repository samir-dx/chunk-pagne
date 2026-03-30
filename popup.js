document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('list');
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  
  // Define our base storage key
  const STORAGE_KEY = 'network-chunks-v2';

  const iconMoon = `<path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>`;
  const iconSun = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>`;

  // --- Theme Logic ---
  const applyPopupTheme = (isDark) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      themeIcon.innerHTML = iconSun;
    } else {
      document.documentElement.classList.remove('dark');
      themeIcon.innerHTML = iconMoon;
    }
    chrome.storage.local.set({ darkMode: isDark });
  };

  chrome.storage.local.get(['darkMode'], (res) => {
    applyPopupTheme(res.darkMode || false);
  });

  themeToggle.onclick = () => {
    const isDark = !document.documentElement.classList.contains('dark');
    applyPopupTheme(isDark);
  };

  // --- Origin Helper ---
  // This grabs the URL of the active tab and extracts just the origin
  const getActiveOrigin = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0 && tabs[0].url) {
      return new URL(tabs[0].url).origin;
    }
    return 'INITIATOR'; // Fallback just in case
  };

  // --- Chunk Logic ---
  const update = async () => {
    const origin = await getActiveOrigin();
    const storageKey = `${STORAGE_KEY}-${origin}`;

    chrome.storage.local.get([storageKey], (res) => {
      const chunks = res[storageKey] || [];
      if (chunks.length === 0) {
        list.innerHTML = `<p class="text-zinc-400 text-xs italic w-full text-center py-8">No chunks captured for this origin</p>`;
        return;
      }
      
      list.innerHTML = chunks.toReversed().map(c => `
        <span class="chunk-pill px-2.5 py-1 rounded-full text-[10px] font-mono whitespace-nowrap overflow-hidden text-ellipsis max-w-[140px]">
          ${c}
        </span>
      `).join('');
    });
  };

  document.getElementById('copy').onclick = async () => {
    const origin = await getActiveOrigin();
    const storageKey = `${STORAGE_KEY}-${origin}`;

    chrome.storage.local.get([storageKey], (res) => {
      const text = (res[storageKey] || []).toSorted().join(',');
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copy');
        const oldText = btn.innerText;
        btn.innerText = 'Copied!';
        btn.classList.replace('bg-teal-600', 'bg-emerald-600');
        setTimeout(() => {
          btn.innerText = oldText;
          btn.classList.replace('bg-emerald-600', 'bg-teal-600');
        }, 1000);
      });
    });
  };

  document.getElementById('clear').onclick = async () => {
    const origin = await getActiveOrigin();
    // Send the specific origin to the background script so it only clears that bucket
    chrome.runtime.sendMessage({ 
      type: "CLEAR", 
      payload: { origin: origin } 
    }, () => {
      update();
    });
  };

  // --- REAL-TIME SYNC LISTENER ---
  chrome.runtime.onMessage.addListener(async (request) => {
    const currentOrigin = await getActiveOrigin();
    // Only update the UI if the background script broadcasted an update for OUR current origin
    if (request.action === "chunksUpdated" && request.origin === currentOrigin) {
      update();
    }
  });

  // Initial render
  update();
});