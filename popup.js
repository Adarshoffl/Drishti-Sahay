// --- Constants ---
const STORAGE_KEY = 'accessibleShortcutsMap';
const CAPTURE_TOGGLE_ID = 'captureToggle';
const SHORTCUT_LIST_ID = 'shortcutList';
const ADD_ROW_ID = 'addRow';
const SAVE_BUTTON_ID = 'save';
const RESET_BUTTON_ID = 'reset';
const ANNOUNCE_ID = 'announce';

// --- Utility Functions ---
function setStatus(message) {
    const announceArea = document.getElementById(ANNOUNCE_ID);
    if (announceArea) {
        announceArea.textContent = `Status: ${message}`;
    }
}

function sendContentMessage(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
                // Ignore the error if the tab isn't ready
                if (chrome.runtime.lastError) {}
            });
        }
    });
}

// --- Dynamic Row Management ---
function createShortcutRow(selectorValue = '', keyValue = '', isManual = false) {
    const listContainer = document.getElementById(SHORTCUT_LIST_ID);
    if (!listContainer) return;
    
    const row = document.createElement('div');
    row.className = 'row shortcut-row-item';

    const selectorInput = document.createElement('input');
    selectorInput.type = 'text';
    selectorInput.className = 'selector-input';
    selectorInput.value = selectorValue;
    selectorInput.placeholder = 'e.g., #submit-btn';

    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.className = 'key-input';
    keyInput.value = keyValue;
    keyInput.placeholder = 'Key';
    
    // Key is read-only if assigned via capture, editable if manually added and empty
    const isReadOnly = !isManual && keyValue !== '';
    keyInput.readOnly = isReadOnly; 
    keyInput.title = isReadOnly ? 'Assigned via Capture Mode' : 'Enter a single letter/number';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'del-btn';
    deleteBtn.textContent = 'X';
    deleteBtn.title = 'Delete this row';
    deleteBtn.onclick = () => {
        if (confirm("Are you sure you want to delete this row? (Click Save to finalize)")) {
            row.remove();
            setStatus("Row deleted. Click 'Save' to confirm changes.");
        }
    };

    row.appendChild(selectorInput);
    row.appendChild(keyInput);
    row.appendChild(deleteBtn);
    listContainer.appendChild(row);
}

// --- Load, Save, and Reset Functions ---
function loadShortcuts() {
    chrome.storage.local.get(STORAGE_KEY, (data) => {
        const shortcuts = data[STORAGE_KEY] || {};
        const listContainer = document.getElementById(SHORTCUT_LIST_ID);
        if (listContainer) listContainer.innerHTML = ''; 
        
        Object.entries(shortcuts).forEach(([key, selector]) => {
            createShortcutRow(selector, key.toUpperCase());
        });
        
        if (Object.keys(shortcuts).length === 0 || Object.values(shortcuts).every(s => s !== '')) {
            createShortcutRow('', '', true); // Add an empty, manually editable row
        }
        
        setStatus(`Loaded ${Object.keys(shortcuts).length} active shortcuts.`);
    });
}

function saveShortcuts() {
    const listContainer = document.getElementById(SHORTCUT_LIST_ID);
    if (!listContainer) return;
    
    const newShortcuts = {};
    let errorCount = 0;
    const rows = listContainer.querySelectorAll('.shortcut-row-item');
    
    rows.forEach(row => {
        const selector = row.querySelector('.selector-input').value.trim();
        const key = row.querySelector('.key-input').value.trim().toLowerCase();
        
        const isValidKey = key.length === 1 && /[a-z0-9]/.test(key);

        if (selector && key && isValidKey) {
            newShortcuts[key] = selector;
        } else if (selector || key) {
            errorCount++;
        }
    });

    if (errorCount > 0) {
        setStatus(`Warning: ${errorCount} row(s) ignored due to missing selector or invalid key (must be single letter/number).`);
    }
    
    chrome.storage.local.set({ [STORAGE_KEY]: newShortcuts }, () => {
        setStatus(`Successfully saved ${Object.keys(newShortcuts).length} shortcuts.`);
        loadShortcuts(); 
        sendContentMessage({ action: 'RELOAD_SHORTCUTS' });
    });
}

function resetShortcuts() {
    if (!confirm("Are you sure you want to delete ALL shortcuts? This cannot be undone.")) return;
    chrome.storage.local.set({ [STORAGE_KEY]: {} }, () => {
        setStatus("All shortcuts deleted.");
        loadShortcuts(); 
        sendContentMessage({ action: 'RELOAD_SHORTCUTS' });
    });
}

// --- Capture Mode Integration ---

function toggleCaptureMode(isActive) {
    const button = document.getElementById(CAPTURE_TOGGLE_ID);
    if (!button) return;

    button.classList.toggle('capture-active', isActive);
    button.classList.toggle('inactive', !isActive);
    button.textContent = isActive ? 'Stop Capture Mode (Active)' : 'Start Capture Mode';

    // The instruction message emphasizes the next step
    setStatus(isActive ? 'Capture Mode **Active**. Close this popup, **TAB or click** an element, then press ALT + Key.' : 'Capture Mode Inactive.');

    // Send state to content script
    sendContentMessage({ action: 'TOGGLE_CAPTURE', state: isActive });
}

// --- Listener for Messages from Content Script ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'SET_POPUP_STATUS') {
        setStatus(message.message);
    } else if (message.action === 'NEW_ASSIGNMENT_READY') {
        // Find existing empty row or one with the same key
        const rows = document.getElementById(SHORTCUT_LIST_ID).querySelectorAll('.shortcut-row-item');
        let found = false;
        
        rows.forEach(row => {
            const selectorInput = row.querySelector('.selector-input');
            const keyInput = row.querySelector('.key-input');
            
            // Match if: 1) It's an empty row, OR 2) It has the same key
            if ((selectorInput.value === '' && keyInput.value === '') || keyInput.value.toLowerCase() === message.key) {
                selectorInput.value = message.selector;
                keyInput.value = message.key.toUpperCase();
                keyInput.readOnly = true; // Lock key on assignment
                found = true;
            }
        });

        if (!found) {
            createShortcutRow(message.selector, message.key.toUpperCase());
        }
        
        // Save automatically after successful assignment
        saveShortcuts(); 
        
    } else if (message.action === 'RETURN_STATE') {
        // Fix: Sync button state on popup open based on the content script's actual state
        const button = document.getElementById(CAPTURE_TOGGLE_ID);
        if (button) {
            // Only update UI, do NOT send TOGGLE_CAPTURE back
            button.classList.toggle('capture-active', message.state);
            button.classList.toggle('inactive', !message.state);
            button.textContent = message.state ? 'Stop Capture Mode (Active)' : 'Start Capture Mode';
            setStatus(message.state ? 'Capture Mode **Active** (Restored). Close popup, TAB/click element.' : 'Capture Mode Inactive.');
        }
    }
});

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    loadShortcuts();
    
    // Ask content script for its current capture mode state immediately
    sendContentMessage({ action: 'GET_STATE' });

    document.getElementById(CAPTURE_TOGGLE_ID)?.addEventListener('click', () => {
        // Get the current state from the UI class list
        const currentState = document.getElementById(CAPTURE_TOGGLE_ID).classList.contains('capture-active');
        toggleCaptureMode(!currentState);
    });

    document.getElementById(ADD_ROW_ID)?.addEventListener('click', () => {
        createShortcutRow('', '', true);
        setStatus('New manual row added. Fill out and click "Save".');
    });

    document.getElementById(SAVE_BUTTON_ID)?.addEventListener('click', saveShortcuts);
    document.getElementById(RESET_BUTTON_ID)?.addEventListener('click', resetShortcuts);
});