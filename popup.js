document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  
  const emptyState = document.getElementById('empty-state');
  const newContainer = document.getElementById('newly-added-container');
  const historyContainer = document.getElementById('history-container');
  const newList = document.getElementById('new-list');
  const historyList = document.getElementById('history-list');
  const newCount = document.getElementById('new-count');
  const historyCount = document.getElementById('history-count');

  const STORAGE_KEY = 'network-chunks-v2';
  let sessionSeen = null; // Locks in the "seen" state when popup opens
  let currentNewChunks = []; // Stored in memory for the mini copy button

  const iconMoon = `<path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>`;
  const iconSun = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>`;

  // --- Theme Logic ---
  const applyPopupTheme = (isDark) => {
    document.documentElement.classList.toggle('dark', isDark);
    themeIcon.innerHTML = isDark ? iconSun : iconMoon;
    chrome.storage.local.set({ darkMode: isDark });
  };
  chrome.storage.local.get(['darkMode'], (res) => applyPopupTheme(res.darkMode || false));
  themeToggle.onclick = () => applyPopupTheme(!document.documentElement.classList.contains('dark'));

  // --- Origin Helper ---
  const getActiveOrigin = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs.length > 0 && tabs[0].url ? new URL(tabs[0].url).origin : 'INITIATOR';
  };

  // --- Render Pill HTML ---
  const generatePills = (chunks, isNew) => {
    const extraClass = isNew ? 'border-teal-500/50 bg-teal-50/50 dark:bg-teal-900/20' : 'opacity-70';
    return chunks.toReversed().map(c => `
      <span class="chunk-pill ${extraClass}">${c}</span>
    `).join('');
  };

  // --- Main Update Logic ---
  const update = async () => {
    const origin = await getActiveOrigin();
    const storageKey = `${STORAGE_KEY}-${origin}`;
    const seenKey = `seenChunks-${origin}`;

    chrome.storage.local.get([storageKey, seenKey], (res) => {
      const active = res[storageKey] || [];
      
      // Initialize sessionSeen once per popup open
      if (sessionSeen === null) {
        sessionSeen = res[seenKey] || [];
      }

      // Always update the stored seenChunks to current active so next time they aren't new
      chrome.storage.local.set({ [seenKey]: active });

      if (active.length === 0) {
        emptyState.classList.remove('hidden');
        newContainer.classList.add('hidden');
        historyContainer.classList.add('hidden');
        return;
      }
      emptyState.classList.add('hidden');

      // Calculate Diff
      currentNewChunks = active.filter(c => !sessionSeen.includes(c));
      const historyChunks = active.filter(c => sessionSeen.includes(c));

      // Render Newly Added
      if (currentNewChunks.length > 0) {
        newContainer.classList.remove('hidden');
        newCount.innerText = currentNewChunks.length;
        newList.innerHTML = generatePills(currentNewChunks, true);
      } else {
        newContainer.classList.add('hidden');
      }

      // Render History
      if (historyChunks.length > 0) {
        historyContainer.classList.remove('hidden');
        historyCount.innerText = historyChunks.length;
        historyList.innerHTML = generatePills(historyChunks, false);
      } else {
        historyContainer.classList.add('hidden');
      }
    });
  };

  // --- Button Actions ---
  
  // 1. Copy ONLY Newly Added
  document.getElementById('copy-new').onclick = (e) => {
    if (currentNewChunks.length === 0) return;
    navigator.clipboard.writeText(currentNewChunks.toSorted().join(',')).then(() => {
      const btn = e.currentTarget;
      const originalHTML = btn.innerHTML;
      btn.innerHTML = `<span style="font-size:10px; font-weight:bold;">✓</span>`;
      setTimeout(() => btn.innerHTML = originalHTML, 1000);
    });
  };

  // 2. Copy ALL
  document.getElementById('copy').onclick = async () => {
    const origin = await getActiveOrigin();
    chrome.storage.local.get([`${STORAGE_KEY}-${origin}`], (res) => {
      const text = (res[`${STORAGE_KEY}-${origin}`] || []).toSorted().join(',');
      navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copy');
        btn.innerText = 'Copied!';
        btn.classList.replace('bg-teal-600', 'bg-emerald-600');
        setTimeout(() => {
          btn.innerText = 'Copy All';
          btn.classList.replace('bg-emerald-600', 'bg-teal-600');
        }, 1000);
      });
    });
  };

  // 3. Clear ALL
  document.getElementById('clear').onclick = async () => {
    const origin = await getActiveOrigin();
    chrome.runtime.sendMessage({ type: "CLEAR", payload: { origin } }, () => {
      sessionSeen = []; // Reset memory
      currentNewChunks = [];
      update();
    });
  };

  // --- Real-time Sync ---
  chrome.runtime.onMessage.addListener(async (request) => {
    if (request.action === "chunksUpdated" && request.origin === await getActiveOrigin()) {
      update();
    }
  });

  update();
});