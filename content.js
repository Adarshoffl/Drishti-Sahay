const STORAGE_KEY = 'accessibleShortcutsMap';
const STATE_KEY = 'isCaptureModeActive';
const HOSTNAME = window.location.hostname;

let isCaptureModeActive = false;
let currentSiteShortcuts = {}; 
let globalHoveredElement = null; 

// --- 1. SELECTOR LOGIC ---
function getElementName(el) {
    if (el.innerText && el.innerText.trim().length > 0) return el.innerText.trim().substring(0, 20);
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    if (el.getAttribute('title')) return el.getAttribute('title');
    if (el.tagName === 'INPUT') return el.placeholder || 'Input';
    return 'Element'; 
}

function getOptimalSelector(el) {
    if (!el) return null;
    if (el.id && document.querySelectorAll(`#${el.id}`).length === 1) return `#${el.id}`;
    const attrs = ['data-testid', 'name', 'aria-label', 'role', 'title'];
    for (let attr of attrs) {
        if (el.getAttribute(attr)) {
            const sel = `${el.tagName.toLowerCase()}[${attr}="${el.getAttribute(attr)}"]`;
            if (document.querySelectorAll(sel).length === 1) return sel;
        }
    }
    if (el.className && typeof el.className === 'string') {
        const classes = el.className.split(/\s+/).filter(c => c.length > 0 && !['active', 'focus', 'hover', 'highlight'].includes(c));
        if (classes.length > 0) {
            let sel = `${el.tagName.toLowerCase()}.${classes[0]}`;
            if (document.querySelectorAll(sel).length === 1) return sel;
        }
    }
    let path = [], cur = el;
    while (cur.parentElement) {
        let tag = cur.tagName.toLowerCase();
        let siblings = cur.parentElement.children;
        if (siblings.length > 1) tag += `:nth-child(${Array.from(siblings).indexOf(cur)+1})`;
        path.unshift(tag);
        cur = cur.parentElement;
        if (cur.tagName === 'BODY') break;
        if (cur.id) { path.unshift(`#${cur.id}`); break; }
    }
    return path.join(' > ');
}

// --- 2. STORAGE (Site Specific) ---
function loadShortcuts() {
    chrome.storage.local.get(STORAGE_KEY, (res) => {
        const allSites = res[STORAGE_KEY] || {};
        currentSiteShortcuts = allSites[HOSTNAME] || {};
        
        // Update Help Popup if open
        if(document.querySelector('.help-overlay.visible')) renderHelpList();
    });
}

function saveShortcut(key, selector, name) {
    chrome.storage.local.get(STORAGE_KEY, (res) => {
        const allSites = res[STORAGE_KEY] || {};
        if (!allSites[HOSTNAME]) allSites[HOSTNAME] = {};
        
        allSites[HOSTNAME][key] = { selector: selector, name: name };
        currentSiteShortcuts[key] = { selector: selector, name: name };

        chrome.storage.local.set({ [STORAGE_KEY]: allSites }, () => {
            alert(`Saved: Ctrl+Shift+${key.toUpperCase()}`);
            renderHelpList();
            sendPopupMessage({ action: 'RELOAD_SHORTCUTS' }); // Sync Popup UI
        });
    });
}

// --- 3. HELP POPUP (Ctrl + 1) ---
function createHelpModal() {
    if (document.getElementById('customHelpOverlay')) return;
    const overlay = document.createElement('div');
    overlay.className = 'help-overlay';
    overlay.id = 'customHelpOverlay';
    overlay.innerHTML = `
        <div class="help-box">
            <div class="help-header">
                <div>Shortcuts: ${HOSTNAME}</div>
                <button class="help-close" id="helpCloseBtn">&times;</button>
            </div>
            <div class="help-content">
                <table class="help-table">
                    <thead><tr><th>Key</th><th>Action</th></tr></thead>
                    <tbody id="helpTableBody"></tbody>
                </table>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('helpCloseBtn').onclick = toggleHelp;
    overlay.addEventListener('click', (e) => { if(e.target===overlay) toggleHelp(); });
}

function renderHelpList() {
    const tbody = document.getElementById('helpTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const keys = Object.keys(currentSiteShortcuts);
    if (keys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" class="empty-msg">No shortcuts found.<br>Press <b>Alt+S</b> to add.</td></tr>`;
        return;
    }
    keys.forEach(key => {
        // Handle backward compatibility (if stored as string)
        const val = currentSiteShortcuts[key];
        const name = typeof val === 'string' ? 'Saved Action' : val.name;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><span class="badge-key">Ctrl+Shift+${key.toUpperCase()}</span></td><td>${name}</td>`;
        tbody.appendChild(tr);
    });
}

function toggleHelp() {
    createHelpModal();
    const overlay = document.getElementById('customHelpOverlay');
    const isVisible = overlay.classList.contains('visible');
    if (isVisible) overlay.classList.remove('visible');
    else {
        renderHelpList();
        overlay.classList.add('visible');
    }
}

// --- 4. ACTIONS & LISTENERS ---
function startAssignment(targetElement) {
    targetElement.classList.add('highlight');
    // Simple prompt for key to avoid complex UI injection
    // (You can replace this with the "Voice/No-Type" logic if preferred, 
    // but here I use prompt for simplicity in this merged version)
    setTimeout(() => {
        const keyChar = prompt("Enter a letter for Ctrl+Shift+Key:");
        targetElement.classList.remove('highlight');
        
        if (keyChar && /^[a-z0-9]$/i.test(keyChar)) {
            const name = getElementName(targetElement);
            saveShortcut(keyChar.toLowerCase(), getOptimalSelector(targetElement), name);
            if (isCaptureModeActive) toggleCapture(false);
        }
    }, 50);
}

document.addEventListener('keydown', (e) => {
    // Ctrl + 1 : Help
    if (e.ctrlKey && e.key === '1') { e.preventDefault(); toggleHelp(); return; }
    if (e.key === 'Escape') { 
        const ol = document.getElementById('customHelpOverlay');
        if(ol && ol.classList.contains('visible')) toggleHelp();
    }

    // Alt + S : Quick Capture
    if (e.altKey && e.key.toLowerCase() === 's') {
        const target = document.activeElement && document.activeElement !== document.body ? document.activeElement : globalHoveredElement;
        if (!target) return;
        e.preventDefault(); e.stopPropagation();
        startAssignment(target);
        return;
    }

    // Trigger : Ctrl + Shift + Key
    if (e.ctrlKey && e.shiftKey && !e.altKey) {
        const key = e.key.toLowerCase();
        const data = currentSiteShortcuts[key];
        if (data) {
            const selector = typeof data === 'string' ? data : data.selector;
            const el = document.querySelector(selector);
            if (el) {
                e.preventDefault(); el.focus(); el.click();
                el.classList.add('highlight');
                setTimeout(() => el.classList.remove('highlight'), 200);
            }
        }
    }
}, true);

document.addEventListener('mouseover', (e) => {
    globalHoveredElement = e.target;
    if (isCaptureModeActive && e.target.tagName !== 'BODY') {
        document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
        e.target.classList.add('highlight');
    }
}, true);

// Popup Click-to-Capture Handler
document.addEventListener('click', (e) => {
    if (!isCaptureModeActive) return;
    e.preventDefault(); e.stopPropagation();
    
    // Send back to popup to fill the inputs (User's UI flow)
    const selector = getOptimalSelector(e.target);
    sendPopupMessage({ action: 'NEW_ASSIGNMENT_READY', selector: selector, key: '' }); // Key empty, user types in popup
    toggleCapture(false);
}, true);

function toggleCapture(state) {
    isCaptureModeActive = state;
    document.body.style.cursor = state ? 'crosshair' : '';
    if(!state) document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
    chrome.storage.local.set({ [STATE_KEY]: state });
}

function sendPopupMessage(msg) { try { chrome.runtime.sendMessage(msg); } catch(e){} }

// Init
loadShortcuts();
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'TOGGLE_CAPTURE') toggleCapture(msg.state);
    if (msg.action === 'RELOAD_SHORTCUTS') loadShortcuts();
    if (msg.action === 'GET_STATE') sendResponse({state: isCaptureModeActive});
});