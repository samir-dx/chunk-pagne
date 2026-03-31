document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  
  // Containers
  const liveViewEl = document.getElementById('live-view');
  const savedViewEl = document.getElementById('saved-view');
  const viewToggleEl = document.getElementById('view-toggle');
  const viewIconEl = document.getElementById('view-icon');
  
  const emptyStateEl = document.getElementById('empty-state');
  const newContainerEl = document.getElementById('newly-added-container');
  const historyContainerEl = document.getElementById('history-container');
  const newListEl = document.getElementById('new-list');
  const historyListEl = document.getElementById('history-list');
  const newCountEl = document.getElementById('new-count');
  const historyCountEl = document.getElementById('history-count');
  const savedListContainerEl = document.getElementById('saved-list-container');

  const STORAGE_KEY = 'network-chunks-v2';
  const GLOBAL_SAVED_KEY = 'saved-chunk-lists';
  
  let sessionSeen = null; 
  let currentNewChunks = [];
  let currentHistoryChunks = []; 
  let isSavedView = false;

  // Icons
  const iconMoon = `<path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>`;
  const iconSun = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>`;
  const iconBookmark = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>`;
  const iconActivity = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>`;
  
  // Action Icons
  const iconCheck = `<svg class="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
  const iconCopy = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>`;
  const iconSave = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>`;
  
  // theme toggle
  const applyPopupTheme = (isDark) => {
    document.documentElement.classList.toggle('dark', isDark);
    themeIcon.innerHTML = isDark ? iconSun : iconMoon;
    chrome.storage.local.set({ darkMode: isDark });
  };
  chrome.storage.local.get(['darkMode'], (res) => {
    const isDarkDefault = res.darkMode === undefined ? true : res.darkMode;
    applyPopupTheme(isDarkDefault);
  });
  themeToggle.onclick = () => applyPopupTheme(!document.documentElement.classList.contains('dark'));

  // view toggle
  viewToggleEl.onclick = () => {
    isSavedView = !isSavedView;
    if (isSavedView) {
      liveViewEl.classList.add('hidden');
      savedViewEl.classList.remove('hidden');
      viewIconEl.innerHTML = iconActivity;
      viewToggleEl.setAttribute('title', 'View Live Chunks');
      renderSavedLists();
    } else {
      savedViewEl.classList.add('hidden');
      liveViewEl.classList.remove('hidden');
      viewIconEl.innerHTML = iconBookmark;
      viewToggleEl.setAttribute('title', 'View Saved Lists');
    }
  };

  // origin
  const getActiveOrigin = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs.length > 0 && tabs[0].url ? new URL(tabs[0].url).origin : 'INITIATOR';
  };

  const generatePills = (chunks, isNew) => {
    const extraClass = isNew ? 'border-teal-500/50 bg-teal-50/50 dark:bg-teal-900/20' : 'opacity-70';
    return chunks.toReversed().map(c => `<span class="chunk-pill ${extraClass}">${c}</span>`).join('');
  };

  // update live chunks view
  const update = async () => {
    const origin = await getActiveOrigin();
    const storageKey = `${STORAGE_KEY}-${origin}`;
    const seenKey = `seenChunks-${origin}`;

    chrome.storage.local.get([storageKey, seenKey], (res) => {
      const active = res[storageKey] || [];
      if (sessionSeen === null) sessionSeen = res[seenKey] || [];
      chrome.storage.local.set({ [seenKey]: active });

      if (active.length === 0) {
        emptyStateEl.classList.remove('hidden');
        newContainerEl.classList.add('hidden');
        historyContainerEl.classList.add('hidden');
        return;
      }
      emptyStateEl.classList.add('hidden');

      currentNewChunks = active.filter(c => !sessionSeen.includes(c));
      currentHistoryChunks = active.filter(c => sessionSeen.includes(c));

      if (currentNewChunks.length > 0) {
        newContainerEl.classList.remove('hidden');
        newCountEl.innerText = currentNewChunks.length;
        newListEl.innerHTML = generatePills(currentNewChunks, true);
      } else {
        newContainerEl.classList.add('hidden');
      }

      if (currentHistoryChunks.length > 0) {
        historyContainerEl.classList.remove('hidden');
        historyCountEl.innerText = currentHistoryChunks.length;
        historyListEl.innerHTML = generatePills(currentHistoryChunks, false);
      } else {
        historyContainerEl.classList.add('hidden');
      }
    });
  };

  // button actions
  
  //copy newly added
  const btnCopyNewEl = document.getElementById('copy-new');
  btnCopyNewEl.onclick = () => {
    if (currentNewChunks.length === 0) return;
    navigator.clipboard.writeText([...currentNewChunks].sort().join(',')).then(() => {
      btnCopyNewEl.innerHTML = iconCheck;
      setTimeout(() => { btnCopyNewEl.innerHTML = iconCopy; }, 1000);
    });
  };

  // save newly added
  const btnSaveNewEl = document.getElementById('save-new');
  btnSaveNewEl.onclick = () => {
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
        btnSaveNewEl.innerHTML = iconCheck;
        setTimeout(() => { btnSaveNewEl.innerHTML = iconSave; }, 1000);
      });
    });
  };

  // copy history
  const btnCopyHistoryEl = document.getElementById('copy-history');
  btnCopyHistoryEl.onclick = () => {
    if (currentHistoryChunks.length === 0) return;
    navigator.clipboard.writeText([...currentHistoryChunks].sort().join(',')).then(() => {
      btnCopyHistoryEl.innerHTML = iconCheck;
      setTimeout(() => { btnCopyHistoryEl.innerHTML = iconCopy; }, 1000);
    });
  };

  // save history
  const btnSaveHistoryEl = document.getElementById('save-history');
  btnSaveHistoryEl.onclick = () => {
    if (currentHistoryChunks.length === 0) return;
    const listName = prompt("Enter a display name for these chunks:");
    if (!listName) return;

    chrome.storage.local.get([GLOBAL_SAVED_KEY], (res) => {
      const savedLists = res[GLOBAL_SAVED_KEY] || [];
      savedLists.unshift({
        id: Date.now().toString(),
        name: listName,
        chunks: [...currentHistoryChunks].sort()
      });
      chrome.storage.local.set({ [GLOBAL_SAVED_KEY]: savedLists }, () => {
        btnSaveHistoryEl.innerHTML = iconCheck;
        setTimeout(() => { btnSaveHistoryEl.innerHTML = iconSave; }, 1000);
      });
    });
  };

  // footer ctas
  const footerCopyBtnEl = document.getElementById('copy');
  footerCopyBtnEl.onclick = async () => {
    const origin = await getActiveOrigin();
    chrome.storage.local.get([`${STORAGE_KEY}-${origin}`], (res) => {
      const text = (res[`${STORAGE_KEY}-${origin}`] || []).toSorted().join(',');
      navigator.clipboard.writeText(text).then(() => {
        footerCopyBtnEl.innerText = 'Copied!';
        footerCopyBtnEl.classList.replace('bg-teal-600', 'bg-emerald-600');
        setTimeout(() => {
          footerCopyBtnEl.innerText = 'Copy All';
          footerCopyBtnEl.classList.replace('bg-emerald-600', 'bg-teal-600');
        }, 1000);
      });
    });
  };

  document.getElementById('clear').onclick = async () => {
    const origin = await getActiveOrigin();
    chrome.runtime.sendMessage({ type: "CLEAR", payload: { origin } }, () => {
      sessionSeen = []; 
      currentNewChunks = [];
      currentHistoryChunks = []; 
      update();
    });
  };

  // bookmark view
  const renderSavedLists = () => {
    chrome.storage.local.get([GLOBAL_SAVED_KEY], (res) => {
      const lists = res[GLOBAL_SAVED_KEY] || [];
      if (lists.length === 0) {
        savedListContainerEl.innerHTML = `<p class="text-zinc-400 text-xs italic w-full text-center py-8">No saved lists yet</p>`;
        return;
      }

      savedListContainerEl.innerHTML = lists.map(list => `
        <div class="border border-custom rounded-md p-2 flex flex-col bg-zinc-50 dark:bg-[#ffffff08]">
          
          <div class="flex items-center justify-between cursor-pointer action-toggle" data-id="${list.id}">
            <div class="flex items-center gap-1 overflow-hidden">
              <svg class="w-3.5 h-3.5 transition-transform chevron-icon text-zinc-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
              <span class="text-xs font-semibold text-teal-600 dark:text-teal-400 whitespace-nowrap overflow-hidden text-ellipsis">
                ${list.name} <span class="opacity-70 font-normal text-foreground">(${list.chunks.length})</span>
              </span>
            </div>
            
            <div class="flex gap-1 shrink-0 ml-2" onclick="event.stopPropagation()">
              <button class="btn-icon p-1 action-copy" data-id="${list.id}" title="Copy">
                ${iconCopy}
              </button>
              <button class="btn-icon p-1 action-edit" data-id="${list.id}" title="Rename">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              </button>
              <button class="btn-icon p-1 action-delete text-red-500 hover:text-red-600" data-id="${list.id}" title="Delete">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          </div>

          <div class="chunks-container hidden border-t border-custom mt-2 pt-2" id="chunks-${list.id}">
            <div class="scroll-container" style="height: auto; max-height: 85px; padding: 2px 4px 2px 0; background: transparent; border: none;">
              <div class="flex flex-wrap gap-1">
                ${list.chunks.map(c => `<span class="chunk-pill opacity-70">${c}</span>`).join('')}
              </div>
            </div>
          </div>

        </div>
      `).join('');

      // bookmark list toggles
      document.querySelectorAll('.action-toggle').forEach(header => {
        header.onclick = () => {
          const id = header.getAttribute('data-id');
          const container = document.getElementById(`chunks-${id}`);
          const chevron = header.querySelector('.chevron-icon');
          
          container.classList.toggle('hidden');
          if (container.classList.contains('hidden')) {
            chevron.classList.remove('rotate-90');
          } else {
            chevron.classList.add('rotate-90');
          }
        };
      });

      // bookmark list actions
      document.querySelectorAll('.action-copy').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          const targetList = lists.find(l => l.id === id);
          if (targetList) {
            navigator.clipboard.writeText(targetList.chunks.join(',')).then(() => {
              btn.innerHTML = iconCheck;
              setTimeout(() => { btn.innerHTML = iconCopy; }, 1000);
            });
          }
        };
      });

      document.querySelectorAll('.action-edit').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
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
          e.stopPropagation();
          const id = btn.getAttribute('data-id');
          if (confirm("Delete this saved list?")) {
            const updatedLists = lists.filter(l => l.id !== id);
            chrome.storage.local.set({ [GLOBAL_SAVED_KEY]: updatedLists }, renderSavedLists);
          }
        };
      });
    });
  };

  // sync realtime updates
  chrome.runtime.onMessage.addListener(async (request) => {
    if (request.action === "chunksUpdated" && request.origin === await getActiveOrigin() && !isSavedView) {
      update();
    }
  });

  update();
});