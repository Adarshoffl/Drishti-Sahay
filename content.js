// content.js - V9.0: RECORD MODE + ROBUST FINGERPRINTING + NVDA PRIORITY

const STORAGE_KEY = 'accessibleShortcutsMap_V4';
const STATE_KEY = 'isCaptureModeActive';
const HOSTNAME = window.location.hostname;

let isCaptureModeActive = false;
let currentSiteShortcuts = {}; 
let currentLang = 'en'; 

// --- 1. NVDA ANNOUNCER (Priority Voice) ---
const announcer = document.createElement('div');
announcer.id = 'drishti-announcer';
announcer.setAttribute('aria-live', 'assertive');
Object.assign(announcer.style, { position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' });
document.body.appendChild(announcer);

function announce(text) {
    announcer.textContent = ''; 
    setTimeout(() => { announcer.textContent = text; }, 50);
}

// --- 2. TRANSLATIONS (Auto-Detect Support) ---
const helpTranslations = {
    en: { title: "Shortcuts for", key: "Key", action: "Action Name", noShortcuts: "No shortcuts yet.<br>Press <b>Alt + S</b> to add.", close: "Close" },
    hi: { title: "शॉर्टकट इसके लिए", key: "की (Key)", action: "कार्य का नाम", noShortcuts: "कोई शॉर्टकट नहीं।<br>जोड़ने के लिए <b>Alt + S</b> दबाएं।", close: "बंद करें" },
    mr: { title: "यासाठी शॉर्टकट", key: "की (Key)", action: "कृतीचे नाव", noShortcuts: "शॉर्टकट नाहीत.<br>जोडण्यासाठी <b>Alt + S</b> दाबा.", close: "बंद" },
    te: { title: "షార్ట్‌కట్‌లు", key: "కీ", action: "చర్య పేరు", noShortcuts: "షార్ట్‌కట్‌లు లేవు.<br>జోడించడానికి <b>Alt + S</b> నొక్కండి.", close: "మూసివేయి" }
};

function getBrowserLanguage() {
    const lang = navigator.language.split('-')[0]; 
    return helpTranslations[lang] ? lang : 'en';
}

// --- 3. ROBUST FINGERPRINTING (Immortality Engine) ---
function getElementName(el) {
    if (el.innerText && el.innerText.trim().length > 0) return el.innerText.trim().substring(0, 20);
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    if (el.getAttribute('title')) return el.getAttribute('title');
    if (el.tagName === 'INPUT') return el.placeholder || 'Input';
    return 'Button'; 
}

function getOptimalSelector(el) {
    if (!el) return null;
    if (el.id) return `#${el.id}`;
    // Stable attributes
    const attrs = ['data-testid', 'name', 'aria-label', 'role', 'title'];
    for (let attr of attrs) {
        if (el.getAttribute(attr)) return `[${attr}="${el.getAttribute(attr)}"]`;
    }
    // Fallback path
    let path = [], cur = el;
    while (cur.parentElement) {
        let tag = cur.tagName.toLowerCase();
        let siblings = Array.from(cur.parentElement.children);
        if (siblings.length > 1) tag += `:nth-child(${siblings.indexOf(cur)+1})`;
        path.unshift(tag);
        cur = cur.parentElement;
        if (cur.tagName === 'BODY') break;
    }
    return path.join(' > ');
}

function createFingerprint(el) {
    return {
        selector: getOptimalSelector(el), 
        name: getElementName(el),         
        text: el.innerText ? el.innerText.trim() : "", 
        aria: el.getAttribute('aria-label') || "",     
        tagName: el.tagName.toLowerCase()
    };
}

function findTargetByFingerprint(data) {
    if (!data) return null;
    // 1. Primary Selector
    let el = document.querySelector(data.selector);
    if (el && isVisible(el)) return el;

    // 2. Self-Healing (Text Match)
    if (data.text) {
        const xpath = `//*[text()="${data.text}"]`;
        const res = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (res && isVisible(res)) { healShortcut(data, res); return res; }
    }
    // 3. Self-Healing (ARIA)
    if (data.aria) {
        el = document.querySelector(`[aria-label="${data.aria}"]`);
        if (el && isVisible(el)) { healShortcut(data, el); return el; }
    }
    return null;
}

function isVisible(el) { return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); }

function healShortcut(oldData, newElement) {
    oldData.selector = getOptimalSelector(newElement);
    chrome.storage.local.get(STORAGE_KEY, (res) => {
        const allSites = res[STORAGE_KEY] || {};
        if (allSites[HOSTNAME]) {
            for (const [key, val] of Object.entries(allSites[HOSTNAME])) {
                if (val.name === oldData.name) {
                    allSites[HOSTNAME][key] = oldData;
                    chrome.storage.local.set({ [STORAGE_KEY]: allSites });
                    break;
                }
            }
        }
    });
}

// --- 4. STORAGE ---
function loadData(callback) {
    chrome.storage.local.get([STORAGE_KEY, 'drishti_lang'], (res) => {
        const allSites = res[STORAGE_KEY] || {};
        currentSiteShortcuts = allSites[HOSTNAME] || {};
        currentLang = res['drishti_lang'] || getBrowserLanguage();
        if(document.querySelector('.help-overlay.visible')) renderHelpList();
        if (callback) callback();
    });
}

function saveShortcut(key, element) {
    const fingerprint = createFingerprint(element);
    chrome.storage.local.get(STORAGE_KEY, (res) => {
        const allSites = res[STORAGE_KEY] || {};
        if (!allSites[HOSTNAME]) allSites[HOSTNAME] = {};
        allSites[HOSTNAME][key] = fingerprint;
        currentSiteShortcuts[key] = fingerprint;
        chrome.storage.local.set({ [STORAGE_KEY]: allSites }, () => {
            announce(`Saved Ctrl Shift ${key.toUpperCase()}`);
            renderHelpList();
        });
    });
}

// --- 5. HELP POPUP (Ctrl + 1) ---
function createHelpModal() {
    if (document.getElementById('customHelpOverlay')) return;
    const txt = helpTranslations[currentLang] || helpTranslations['en'];
    const overlay = document.createElement('div');
    overlay.className = 'help-overlay';
    overlay.id = 'customHelpOverlay';
    overlay.innerHTML = `
        <div class="help-box">
            <div class="help-header">
                <div id="helpTitle">${txt.title} ${HOSTNAME}</div>
                <button class="help-close" id="helpCloseBtn">&times;</button>
            </div>
            <div class="help-content">
                <table class="help-table">
                    <thead><tr id="helpTableHeader"><th>${txt.key}</th><th>${txt.action}</th></tr></thead>
                    <tbody id="helpTableBody"></tbody>
                </table>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    document.getElementById('helpCloseBtn').onclick = toggleHelp;
    overlay.addEventListener('click', (e) => { if(e.target===overlay) toggleHelp(); });
}

function renderHelpList() {
    const tbody = document.getElementById('helpTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const txt = helpTranslations[currentLang] || helpTranslations['en'];
    
    document.getElementById('helpTitle').textContent = `${txt.title} ${HOSTNAME}`;
    document.getElementById('helpTableHeader').innerHTML = `<th>${txt.key}</th><th>${txt.action}</th>`;

    const keys = Object.keys(currentSiteShortcuts);
    if (keys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" class="empty-msg">${txt.noShortcuts}</td></tr>`;
    } else {
        keys.forEach(key => {
            const d = currentSiteShortcuts[key];
            const name = (typeof d === 'string') ? 'Action' : d.name;
            tbody.innerHTML += `<tr><td><span class="badge-key">Ctrl+Shift+${key.toUpperCase()}</span></td><td>${name}</td></tr>`;
        });
    }
}

function toggleHelp() {
    createHelpModal();
    const overlay = document.getElementById('customHelpOverlay');
    if (overlay.classList.contains('visible')) {
        overlay.classList.remove('visible');
        announce("Help Closed.");
    } else {
        loadData(() => {
            renderHelpList();
            overlay.classList.add('visible');
            setTimeout(() => document.getElementById('helpCloseBtn').focus(), 50);
            announce("Help Open.");
        });
    }
}

// --- 6. RECORD ASSIGNMENT LOGIC (Your Requested Feature) ---
function startAssignment(targetElement) {
    targetElement.classList.add('highlight');
    announce("Press Ctrl, Shift, and your Key.");

    const recordListener = (e) => {
        // Only trigger if Ctrl AND Shift are held
        if (e.ctrlKey && e.shiftKey) {
            e.preventDefault(); e.stopPropagation();
            const keyChar = e.key.toLowerCase();

            // Ignore modifier keys
            if (['control','shift','alt'].includes(keyChar)) return;

            if (/^[a-z0-9]$/i.test(keyChar)) {
                document.removeEventListener('keydown', recordListener, true);
                targetElement.classList.remove('highlight');
                
                // Save using Robust Fingerprint
                saveShortcut(keyChar, targetElement);
                
                if (isCaptureModeActive) toggleCapture(false);
            } else {
                announce("Invalid key. Use a letter or number.");
            }
        } else if (e.key === "Escape") {
            document.removeEventListener('keydown', recordListener, true);
            targetElement.classList.remove('highlight');
            announce("Cancelled.");
        }
    };
    document.addEventListener('keydown', recordListener, true);
}

// --- 7. LISTENERS ---
document.addEventListener('keydown', (e) => {
    // Ctrl+1: Help
    if (e.ctrlKey && e.key === '1') { e.preventDefault(); toggleHelp(); return; }
    if (e.key === 'Escape') { 
        const ol = document.getElementById('customHelpOverlay');
        if(ol && ol.classList.contains('visible')) toggleHelp();
    }

    // Alt+S: Capture
    if (e.altKey && e.key.toLowerCase() === 's') {
        const target = document.activeElement && document.activeElement !== document.body ? document.activeElement : globalHoveredElement;
        if (!target) { announce("Select an element first."); return; }
        e.preventDefault(); e.stopPropagation();
        startAssignment(target);
        return;
    }

    // Trigger: Ctrl+Shift+Key
    if (e.ctrlKey && e.shiftKey && !e.altKey) {
        const key = e.key.toLowerCase();
        const data = currentSiteShortcuts[key];
        if (data) {
            // Use Robust Finder
            const el = findTargetByFingerprint(data);
            if (el) {
                e.preventDefault(); el.focus(); el.click();
                announce(`Clicked ${data.name}`);
                el.classList.add('highlight');
                setTimeout(() => el.classList.remove('highlight'), 300);
            } else {
                announce("Button not found.");
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

document.addEventListener('click', (e) => {
    if (!isCaptureModeActive) return;
    e.preventDefault(); e.stopPropagation();
    startAssignment(e.target);
}, true);

function toggleCapture(state) {
    isCaptureModeActive = state;
    document.body.style.cursor = state ? 'crosshair' : '';
    if(!state) document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
    chrome.storage.local.set({ [STATE_KEY]: state });
}

function sendPopupMessage(msg) { try { chrome.runtime.sendMessage(msg); } catch(e){} }

// Init
loadData();
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'TOGGLE_CAPTURE') toggleCapture(msg.state);
    if (msg.action === 'RELOAD_SHORTCUTS') loadData();
    if (msg.action === 'GET_STATE') sendResponse({state: isCaptureModeActive});
});