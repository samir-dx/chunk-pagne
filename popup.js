document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  
  // Containers
  const liveView = document.getElementById('live-view');
  const savedView = document.getElementById('saved-view');
  const viewToggle = document.getElementById('view-toggle');
  const viewIcon = document.getElementById('view-icon');
  
  const emptyState = document.getElementById('empty-state');
  const newContainer = document.getElementById('newly-added-container');
  const historyContainer = document.getElementById('history-container');
  const newList = document.getElementById('new-list');
  const historyList = document.getElementById('history-list');
  const newCount = document.getElementById('new-count');
  const historyCount = document.getElementById('history-count');
  const savedListContainer = document.getElementById('saved-list-container');

  const STORAGE_KEY = 'network-chunks-v2';
  const GLOBAL_SAVED_KEY = 'saved-chunk-lists';
  
  let sessionSeen = null; 
  let currentNewChunks = []; 
  let isSavedView = false;

  // Icons
  const iconMoon = `<path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>`;
  const iconSun = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>`;
  const iconBookmark = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>`;
  const iconActivity = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>`;

  // --- Theme Logic ---
  const applyPopupTheme = (isDark) => {
    document.documentElement.classList.toggle('dark', isDark);
    themeIcon.innerHTML = isDark ? iconSun : iconMoon;
    chrome.storage.local.set({ darkMode: isDark });
  };
  chrome.storage.local.get(['darkMode'], (res) => applyPopupTheme(res.darkMode || false));
  themeToggle.onclick = () => applyPopupTheme(!document.documentElement.classList.contains('dark'));

  // --- View Toggle Logic ---
  viewToggle.onclick = () => {
    isSavedView = !isSavedView;
    if (isSavedView) {
      liveView.classList.add('hidden');
      savedView.classList.remove('hidden');
      viewIcon.innerHTML = iconActivity;
      viewToggle.setAttribute('title', 'View Live Chunks');
      renderSavedLists();
    } else {
      savedView.classList.add('hidden');
      liveView.classList.remove('hidden');
      viewIcon.innerHTML = iconBookmark;
      viewToggle.setAttribute('title', 'View Saved Lists');
    }
  };

  // --- Origin Helper ---
  const getActiveOrigin = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs.length > 0 && tabs[0].url ? new URL(tabs[0].url).origin : 'INITIATOR';
  };

  const generatePills = (chunks, isNew) => {
    const extraClass = isNew ? 'border-teal-500/50 bg-teal-50/50 dark:bg-teal-900/20' : 'opacity-70';
    return chunks.toReversed().map(c => `<span class="chunk-pill ${extraClass}">${c}</span>`).join('');
  };

  // --- Main Update Logic (Live View) ---
  const update = async () => {
    const origin = await getActiveOrigin();
    const storageKey = `${STORAGE_KEY}-${origin}`;
    const seenKey = `seenChunks-${origin}`;

    chrome.storage.local.get([storageKey, seenKey], (res) => {
      const active = res[storageKey] || [];
      if (sessionSeen === null) sessionSeen = res[seenKey] || [];
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

  // Save Newly Added Feature
  document.getElementById('save-new').onclick = (e) => {
    if (currentNewChunks.length === 0) return;
    const listName = prompt("Enter a display name for these chunks:");
    if (!listName) return;

    chrome.storage.local.get([GLOBAL_SAVED_KEY], (res) => {
      const savedLists = res[GLOBAL_SAVED_KEY] || [];
      savedLists.unshift({
        id: Date.now().toString(),
        name: listName,
        chunks: [...currentNewChunks].sort()
      });
      
      chrome.storage.local.set({ [GLOBAL_SAVED_KEY]: savedLists }, () => {
        const btn = e.currentTarget;
        const originalHTML = btn.innerHTML;
        btn.innerHTML = `<span style="font-size:10px; font-weight:bold;">✓</span>`;
        setTimeout(() => btn.innerHTML = originalHTML, 1000);
      });
    });
  };

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

  document.getElementById('clear').onclick = async () => {
    const origin = await getActiveOrigin();
    chrome.runtime.sendMessage({ type: "CLEAR", payload: { origin } }, () => {
      sessionSeen = []; 
      currentNewChunks = [];
      update();
    });
  };

  // --- Saved View Manager Logic ---
  const renderSavedLists = () => {
    chrome.storage.local.get([GLOBAL_SAVED_KEY], (res) => {
      const lists = res[GLOBAL_SAVED_KEY] || [];
      if (lists.length === 0) {
        savedListContainer.innerHTML = `<p class="text-zinc-400 text-xs italic w-full text-center py-8">No saved lists yet</p>`;
        return;
      }

      savedListContainer.innerHTML = lists.map(list => `
        <div class="border border-custom rounded-md p-3 flex flex-col gap-2 bg-zinc-50 dark:bg-[#ffffff08]">
          <div class="flex items-center justify-between border-b border-custom pb-2">
            <span class="text-xs font-semibold text-teal-600 dark:text-teal-400">
              ${list.name} <span class="opacity-70 font-normal text-foreground">(${list.chunks.length})</span>
            </span>
            <div class="flex gap-1">
              <button class="btn-icon p-1 action-copy" data-id="${list.id}" title="Copy">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
              </button>
              <button class="btn-icon p-1 action-edit" data-id="${list.id}" title="Rename">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              </button>
              <button class="btn-icon p-1 action-delete text-red-500 hover:text-red-600" data-id="${list.id}" title="Delete">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          </div>
          <div class="flex flex-wrap gap-1 max-h-[46px] overflow-hidden relative">
            ${list.chunks.slice(0, 5).map(c => `<span class="chunk-pill opacity-70">${c}</span>`).join('')}
            ${list.chunks.length > 5 ? `<span class="text-[10px] opacity-70 italic ml-1 mt-1">+${list.chunks.length - 5} more</span>` : ''}
          </div>
        </div>
      `).join('');

      // Attach Listeners to Generated Buttons
      document.querySelectorAll('.action-copy').forEach(btn => {
        btn.onclick = (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          const targetList = lists.find(l => l.id === id);
          if (targetList) {
            navigator.clipboard.writeText(targetList.chunks.join(',')).then(() => {
              const originalHTML = e.currentTarget.innerHTML;
              e.currentTarget.innerHTML = `<span style="font-size:10px; font-weight:bold;">✓</span>`;
              setTimeout(() => e.currentTarget.innerHTML = originalHTML, 1000);
            });
          }
        };
      });

      document.querySelectorAll('.action-edit').forEach(btn => {
        btn.onclick = (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          const targetIndex = lists.findIndex(l => l.id === id);
          if (targetIndex !== -1) {
            const newName = prompt("Rename list:", lists[targetIndex].name);
            if (newName && newName.trim() !== "") {
              lists[targetIndex].name = newName.trim();
              chrome.storage.local.set({ [GLOBAL_SAVED_KEY]: lists }, renderSavedLists);
            }
          }
        };
      });

      document.querySelectorAll('.action-delete').forEach(btn => {
        btn.onclick = (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          if (confirm("Delete this saved list?")) {
            const updatedLists = lists.filter(l => l.id !== id);
            chrome.storage.local.set({ [GLOBAL_SAVED_KEY]: updatedLists }, renderSavedLists);
          }
        };
      });
    });
  };

  // --- Real-time Sync ---
  chrome.runtime.onMessage.addListener(async (request) => {
    if (request.action === "chunksUpdated" && request.origin === await getActiveOrigin() && !isSavedView) {
      update();
    }
  });

  update();
});