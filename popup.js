// --- Constants ---
const STORAGE_KEY = 'accessibleShortcutsMap'; // Stored as { "google.com": { "a": "selector" }, ... }
const CAPTURE_TOGGLE_ID = 'captureToggle';
const SHORTCUT_LIST_ID = 'shortcutList';
const ADD_ROW_ID = 'addRow';
const SAVE_BUTTON_ID = 'save';
const RESET_BUTTON_ID = 'reset';
const ANNOUNCE_ID = 'announce';

// --- Utility Functions ---
function setStatus(message) {
    const announceArea = document.getElementById(ANNOUNCE_ID);
    if (announceArea) announceArea.textContent = `Status: ${message}`;
}

function sendContentMessage(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, message, () => {
                if (chrome.runtime.lastError) {} // Ignore connection errors
            });
        }
    });
}

function getDomain(url) {
    try { return new URL(url).hostname; } catch (e) { return null; }
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
    selectorInput.placeholder = '#submit-btn';

    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.className = 'key-input';
    keyInput.value = keyValue;
    keyInput.placeholder = 'Key';
    
    // Key is read-only if assigned via capture, editable if manually added and empty
    const isReadOnly = !isManual && keyValue !== '';
    keyInput.readOnly = isReadOnly; 

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'del-btn';
    deleteBtn.textContent = 'X';
    deleteBtn.onclick = () => {
        if (confirm("Delete this row?")) {
            row.remove();
            setStatus("Row deleted. Click 'Save'.");
        }
    };

    row.appendChild(selectorInput);
    row.appendChild(keyInput);
    row.appendChild(deleteBtn);
    listContainer.appendChild(row);
}

// --- Load, Save, and Reset Functions ---
function loadShortcuts() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const host = getDomain(tabs[0].url);
        if (!host) return;

        chrome.storage.local.get(STORAGE_KEY, (data) => {
            const allSites = data[STORAGE_KEY] || {};
            const shortcuts = allSites[host] || {}; // Only load for THIS site
            
            const listContainer = document.getElementById(SHORTCUT_LIST_ID);
            if (listContainer) listContainer.innerHTML = ''; 
            
            // Handle both old format (string) and new format (object with selector/name)
            Object.entries(shortcuts).forEach(([key, value]) => {
                const selector = typeof value === 'object' ? value.selector : value;
                createShortcutRow(selector, key.toUpperCase());
            });
            
            if (Object.keys(shortcuts).length === 0) createShortcutRow('', '', true);
            setStatus(`Loaded ${Object.keys(shortcuts).length} shortcuts for ${host}.`);
        });
    });
}

function saveShortcuts() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const host = getDomain(tabs[0].url);
        if (!host) return;

        const listContainer = document.getElementById(SHORTCUT_LIST_ID);
        const newSiteShortcuts = {};
        const rows = listContainer.querySelectorAll('.shortcut-row-item');
        
        rows.forEach(row => {
            const selector = row.querySelector('.selector-input').value.trim();
            const key = row.querySelector('.key-input').value.trim().toLowerCase();
            if (selector && key) {
                // Store minimal info. Content script will handle names on auto-capture.
                newSiteShortcuts[key] = { selector: selector, name: 'Custom Shortcut' };
            }
        });
        
        chrome.storage.local.get(STORAGE_KEY, (data) => {
            const allSites = data[STORAGE_KEY] || {};
            allSites[host] = newSiteShortcuts; // Update only this site

            chrome.storage.local.set({ [STORAGE_KEY]: allSites }, () => {
                setStatus(`Saved shortcuts for ${host}.`);
                loadShortcuts(); 
                sendContentMessage({ action: 'RELOAD_SHORTCUTS' });
            });
        });
    });
}

function resetShortcuts() {
    if (!confirm("Delete ALL shortcuts for THIS website?")) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const host = getDomain(tabs[0].url);
        if (!host) return;

        chrome.storage.local.get(STORAGE_KEY, (data) => {
            const allSites = data[STORAGE_KEY] || {};
            delete allSites[host]; // Delete only this site

            chrome.storage.local.set({ [STORAGE_KEY]: allSites }, () => {
                setStatus("Deleted shortcuts for this site.");
                loadShortcuts(); 
                sendContentMessage({ action: 'RELOAD_SHORTCUTS' });
            });
        });
    });
}

// --- Toggle & Listener ---
function toggleCaptureMode(isActive) {
    const button = document.getElementById(CAPTURE_TOGGLE_ID);
    if (!button) return;
    button.classList.toggle('capture-active', isActive);
    button.classList.toggle('inactive', !isActive);
    button.textContent = isActive ? 'Stop Capture Mode' : 'Start Capture Mode';
    setStatus(isActive ? 'Capture Active. Click element -> Press Key.' : 'Capture Inactive.');
    sendContentMessage({ action: 'TOGGLE_CAPTURE', state: isActive });
}

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'SET_POPUP_STATUS') setStatus(message.message);
    else if (message.action === 'NEW_ASSIGNMENT_READY') {
        createShortcutRow(message.selector, message.key.toUpperCase());
        saveShortcuts(); // Auto-save
    } else if (message.action === 'RETURN_STATE') {
        const button = document.getElementById(CAPTURE_TOGGLE_ID);
        if (button) {
            button.classList.toggle('capture-active', message.state);
            button.classList.toggle('inactive', !message.state);
            button.textContent = message.state ? 'Stop Capture Mode' : 'Start Capture Mode';
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadShortcuts();
    sendContentMessage({ action: 'GET_STATE' });
    document.getElementById(CAPTURE_TOGGLE_ID)?.addEventListener('click', () => {
        const currentState = document.getElementById(CAPTURE_TOGGLE_ID).classList.contains('capture-active');
        toggleCaptureMode(!currentState);
    });
    document.getElementById(ADD_ROW_ID)?.addEventListener('click', () => createShortcutRow('', '', true));
    document.getElementById(SAVE_BUTTON_ID)?.addEventListener('click', saveShortcuts);
    document.getElementById(RESET_BUTTON_ID)?.addEventListener('click', resetShortcuts);
});