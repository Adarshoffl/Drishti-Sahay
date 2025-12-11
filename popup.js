// popup.js - FINAL COMBINED VERSION (Auto-Detect + Manual + Fixed List)

const STORAGE_KEY = 'accessibleShortcutsMap_V4'; // Matched with content.js
const SHORTCUT_LIST_ID = 'shortcutList';
const CAPTURE_TOGGLE_ID = 'captureToggle';
const SAVE_BUTTON_ID = 'save';
const RESET_BUTTON_ID = 'reset';
const ADD_ROW_ID = 'addRow';
const ANNOUNCE_ID = 'announce';

// --- 1. TRANSLATIONS ---
const translations = {
    en: {
        headerTitle: "Shortcut Settings",
        instructions: "Toggle Capture Mode, <b>TAB or click</b> element, press <b>ALT + S</b>.<br>Trigger: <b>CTRL + SHIFT + Key</b>.",
        startCapture: "Start Capture Mode",
        stopCapture: "Stop Capture Mode",
        colSelector: "Action Name",
        colKey: "Key",
        addRow: "+ Add Shortcut",
        saveBtn: "Save Shortcuts",
        resetBtn: "Reset This Site",
        statusLoading: "Status: Loading..."
    },
    hi: {
        headerTitle: "शॉर्टकट सेटिंग्स",
        instructions: "कैप्चर मोड टॉगल करें, <b>क्लिक</b> करें, फिर <b>ALT + S</b> दबाएं।<br>ट्रिगर: <b>CTRL + SHIFT + Key</b>",
        startCapture: "कैप्चर मोड शुरू करें",
        stopCapture: "कैप्चर मोड रोकें",
        colSelector: "कार्य का नाम",
        colKey: "की (Key)",
        addRow: "+ शॉर्टकट जोड़ें",
        saveBtn: "सेव करें",
        resetBtn: "इस साइट को रीसेट करें",
        statusLoading: "स्थिति: लोड हो रहा है..."
    },
    mr: {
        headerTitle: "शॉर्टकट सेटिंग्ज",
        instructions: "कॅप्चर मोड वापरा, <b>क्लिक</b> करा, नंतर <b>ALT + S</b> दाबा.<br>वापरण्यासाठी: <b>CTRL + SHIFT + Key</b>",
        startCapture: "कॅप्चर मोड सुरू करा",
        stopCapture: "कॅप्चर मोड थांबवा",
        colSelector: "कृतीचे नाव",
        colKey: "की (Key)",
        addRow: "+ शॉर्टकट जोडा",
        saveBtn: "सेव्ह करा",
        resetBtn: "ही साइट रीसेट करा",
        statusLoading: "स्थिती: लोड होत आहे..."
    },
    te: {
        headerTitle: "షార్ట్‌కట్ సెట్టింగ్‌లు",
        instructions: "క్యాప్చర్ మోడ్ ఆన్ చేయండి, ఎలిమెంట్ పై <b>క్లిక్</b> చేసి, <b>ALT + S</b> నొక్కండి.",
        startCapture: "క్యాప్చర్ మోడ్ ప్రారంభించండి",
        stopCapture: "క్యాప్చర్ మోడ్ ఆపండి",
        colSelector: "చర్య పేరు",
        colKey: "కీ (Key)",
        addRow: "+ షార్ట్‌కట్ జోడించు",
        saveBtn: "సేవ్ చేయండి",
        resetBtn: "సైట్‌ను రీసెట్ చేయండి",
        statusLoading: "లోడ్ అవుతోంది..."
    }
};

// --- 2. AUTO-DETECT LOGIC (Added Feature) ---
function getBrowserLanguage() {
    const lang = navigator.language || navigator.userLanguage; 
    const code = lang.split('-')[0]; // e.g. "hi-IN" -> "hi"
    return translations[code] ? code : 'en'; // Default to English if not found
}

// --- 3. UTILITY FUNCTIONS ---
function getDomain(url) {
    try { return new URL(url).hostname; } catch (e) { return 'unknown'; }
}

function setStatus(msg) {
    const el = document.getElementById(ANNOUNCE_ID);
    if(el) el.textContent = msg;
}

function sendContentMessage(message) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, message, () => {
                if (chrome.runtime.lastError) {} 
            });
        }
    });
}

function updateLanguageUI(lang) {
    const textData = translations[lang] || translations['en'];
    
    // Update Static Text
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (textData[key]) {
            if (el.classList.contains('desc')) el.innerHTML = textData[key];
            else el.textContent = textData[key];
        }
    });

    // Update Button State Text
    const capBtn = document.getElementById(CAPTURE_TOGGLE_ID);
    if (capBtn) {
        const isActive = capBtn.classList.contains('capture-active');
        capBtn.textContent = isActive ? textData.stopCapture : textData.startCapture;
    }
}

// --- 4. ROW CREATION ---
function createShortcutRow(selectorValue = '', keyValue = '', isManual = false) {
    const listContainer = document.getElementById(SHORTCUT_LIST_ID);
    if (!listContainer) return;
    
    const row = document.createElement('div');
    row.className = 'row shortcut-row-item';
    
    // Styling to ensure visibility
    row.style.cssText = "display:flex; align-items:center; background:#fff; border-bottom:1px solid #eee; padding:8px 0;";

    // Action Name Input
    const selectorInput = document.createElement('input');
    selectorInput.type = 'text';
    selectorInput.className = 'selector-input';
    selectorInput.value = selectorValue;
    selectorInput.placeholder = 'Action Name';
    selectorInput.style.flex = '1';
    selectorInput.style.marginRight = '5px';

    // Key Input
    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.className = 'key-input';
    keyInput.value = keyValue;
    keyInput.placeholder = 'Key';
    keyInput.style.width = '50px';
    keyInput.style.textAlign = 'center';
    keyInput.style.fontWeight = 'bold';
    
    // Lock key if it's an auto-captured one
    const isReadOnly = !isManual && keyValue !== '';
    keyInput.readOnly = isReadOnly; 

    // Delete Button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'X';
    deleteBtn.className = 'del-btn';
    deleteBtn.style.marginLeft = '5px';
    deleteBtn.style.color = 'red';
    deleteBtn.style.border = 'none';
    deleteBtn.style.background = 'none';
    deleteBtn.style.fontWeight = 'bold';
    deleteBtn.style.cursor = 'pointer';
    
    deleteBtn.onclick = () => {
        if (confirm("Delete this shortcut?")) {
            row.remove();
            // Trigger save to remove from storage
            document.getElementById(SAVE_BUTTON_ID).click(); 
        }
    };

    row.appendChild(selectorInput);
    row.appendChild(keyInput);
    row.appendChild(deleteBtn);
    listContainer.appendChild(row);
}

// --- 5. LOAD SHORTCUTS (Fixes the "Not Showing" issue) ---
function loadShortcuts(host) {
    const list = document.getElementById(SHORTCUT_LIST_ID);
    list.innerHTML = '';

    chrome.storage.local.get(STORAGE_KEY, (res) => {
        const allData = res[STORAGE_KEY] || {};
        const siteData = allData[host] || {};

        if (Object.keys(siteData).length === 0) {
            list.innerHTML = '<div style="text-align:center; padding:15px; color:#888; font-size:12px;">No shortcuts.<br>Press <b>Alt+S</b> on page.</div>';
            return;
        }

        Object.entries(siteData).forEach(([key, data]) => {
            // FIX: Handle New (Object) vs Old (String) data formats
            let displayVal = "Action";
            if (typeof data === 'object') {
                displayVal = data.name || data.text || "Unnamed";
            } else if (typeof data === 'string') {
                displayVal = "Saved Action"; 
            }
            createShortcutRow(displayVal, key.toUpperCase());
        });
        
        setStatus(`Loaded shortcuts for ${host}`);
    });
}

// --- 6. SAVE SHORTCUTS ---
function saveShortcuts() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const host = getDomain(tabs[0].url);
        if (!host) return;

        const listContainer = document.getElementById(SHORTCUT_LIST_ID);
        const rows = listContainer.querySelectorAll('.shortcut-row-item');
        
        chrome.storage.local.get(STORAGE_KEY, (res) => {
            const allData = res[STORAGE_KEY] || {};
            const existingSiteData = allData[host] || {};
            const newSiteData = {};

            rows.forEach(row => {
                const name = row.querySelector('.selector-input').value;
                const key = row.querySelector('.key-input').value.toLowerCase();
                
                // Preserve the selector fingerprint if it exists
                if (existingSiteData[key]) {
                    newSiteData[key] = existingSiteData[key];
                    newSiteData[key].name = name; // Allow renaming
                } else {
                    // Manual entry backup
                    newSiteData[key] = { selector: name, name: name };
                }
            });
            
            allData[host] = newSiteData;
            chrome.storage.local.set({ [STORAGE_KEY]: allData }, () => {
                setStatus("Saved!");
                loadShortcuts(host);
                sendContentMessage({ action: 'RELOAD_SHORTCUTS' });
            });
        });
    });
}

// --- 7. INITIALIZATION (Combined Logic) ---
document.addEventListener('DOMContentLoaded', () => {
    
    // A. Language Logic (Auto-Detect + Manual)
    chrome.storage.local.get('drishti_lang', (data) => {
        // Priority: Saved Setting -> Browser Auto-Detect -> English
        let currentLang = data.drishti_lang || getBrowserLanguage();
        
        const langSelector = document.getElementById('languageSelector');
        if (langSelector) {
            langSelector.value = currentLang;
            
            // Listen for manual changes
            langSelector.addEventListener('change', (e) => {
                const newLang = e.target.value;
                chrome.storage.local.set({ 'drishti_lang': newLang });
                updateLanguageUI(newLang);
                location.reload(); 
            });
        }
        updateLanguageUI(currentLang);
    });

    // B. Data Logic
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        const currentHost = getDomain(tabs[0].url);
        
        loadShortcuts(currentHost);

        // Buttons
        document.getElementById(CAPTURE_TOGGLE_ID).onclick = () => {
            const btn = document.getElementById(CAPTURE_TOGGLE_ID);
            const isActive = btn.classList.contains('capture-active');
            
            const lang = document.getElementById('languageSelector').value;
            const txt = translations[lang] || translations['en'];
            
            btn.textContent = isActive ? txt.startCapture : txt.stopCapture;
            btn.classList.toggle('capture-active', !isActive);
            btn.classList.toggle('inactive', isActive);
            
            sendContentMessage({ action: 'TOGGLE_CAPTURE', state: !isActive });
        };

        document.getElementById(SAVE_BUTTON_ID).onclick = saveShortcuts;
        document.getElementById(ADD_ROW_ID).onclick = () => createShortcutRow('', '', true);

        document.getElementById(RESET_BUTTON_ID).onclick = () => {
            if(!confirm("Delete ALL shortcuts for " + currentHost + "?")) return;
            chrome.storage.local.get(STORAGE_KEY, (res) => {
                const allData = res[STORAGE_KEY] || {};
                delete allData[currentHost];
                chrome.storage.local.set({ [STORAGE_KEY]: allData }, () => {
                    loadShortcuts(currentHost);
                    sendContentMessage({ action: 'RELOAD_SHORTCUTS' });
                });
            });
        };
        
        sendContentMessage({ action: 'GET_STATE' });
    });
});

// Update listener
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'NEW_ASSIGNMENT_READY') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            loadShortcuts(getDomain(tabs[0].url));
        });
    } else if (message.action === 'RETURN_STATE') {
        const btn = document.getElementById(CAPTURE_TOGGLE_ID);
        const lang = document.getElementById('languageSelector').value;
        const txt = translations[lang] || translations['en'];
        
        if (message.state) {
            btn.textContent = txt.stopCapture;
            btn.classList.add('capture-active');
            btn.classList.remove('inactive');
        }
    }
});