// content.js - MERGED VERSION

const STORAGE_KEY = 'accessibleShortcutsMap';
const STATE_KEY = 'isCaptureModeActive'; 
let isCaptureModeActive = false;
let shortcutMap = {};
let currentKeydownListener = null;

// New: Global tracker for Alt+S functionality
let globalHoveredElement = null; 

// --- 1. SMART SELECTOR LOGIC (WaterFall Priority) ---
function getOptimalSelector(element) {
    if (!element) return null;

    // A. ID (Best)
    if (element.id && document.querySelectorAll(`#${element.id}`).length === 1) {
        return `#${element.id}`;
    }

    // B. Unique Attributes (Modern Frameworks)
    const attrs = ['data-testid', 'data-cy', 'name', 'aria-label', 'role', 'title', 'placeholder'];
    for (let attr of attrs) {
        if (element.hasAttribute(attr)) {
            const val = element.getAttribute(attr);
            // Skip empty attributes
            if (!val) continue; 
            const selector = `${element.tagName.toLowerCase()}[${attr}="${val}"]`;
            if (document.querySelectorAll(selector).length === 1) return selector;
        }
    }

    // C. Class Combinations
    if (element.className && typeof element.className === 'string') {
        const classes = element.className.split(/\s+/).filter(c => 
            c.length > 0 && !['active', 'focus', 'hover', 'btn', 'button', 'visible', 'hidden', 'highlight'].includes(c)
        );
        
        if (classes.length > 0) {
            let sel = `${element.tagName.toLowerCase()}.${classes[0]}`;
            if (document.querySelectorAll(sel).length === 1) return sel;
            
            if (classes.length > 1) {
                sel += `.${classes[1]}`;
                if (document.querySelectorAll(sel).length === 1) return sel;
            }
        }
    }

    // D. Fallback: Structural Path (Nth-Child)
    let path = [];
    let current = element;
    while (current.parentElement) {
        let tag = current.tagName.toLowerCase();
        let siblings = current.parentElement.children;
        
        if (siblings.length > 1) {
            let index = Array.from(siblings).indexOf(current) + 1;
            tag += `:nth-child(${index})`;
        }
        
        path.unshift(tag);
        current = current.parentElement;
        if (current.tagName === 'BODY') break;
        if (current.id) {
            path.unshift(`#${current.id}`);
            break;
        }
    }
    return path.join(' > ');
}

// --- 2. GLOBAL EVENT TRACKERS ---

// Always track what the mouse is hovering over (for Alt+S)
document.addEventListener('mouseover', (event) => {
    globalHoveredElement = event.target;
    
    // Also handle visual highlight if in "Popup Capture Mode"
    if (isCaptureModeActive) {
        handleElementHover(event);
    }
}, true);


// --- 3. MAIN SHORTCUT LISTENER (Trigger & Quick Capture) ---

function handleGlobalKeydown(event) {
    // === A. TRIGGER MODE: Ctrl + Shift + Key ===
    if (event.ctrlKey && event.shiftKey && !event.altKey) {
        if (event.key.length === 1 && /[a-z0-9]/i.test(event.key)) {
            const pressedKey = event.key.toLowerCase();
            const selector = shortcutMap[pressedKey];

            if (selector) {
                event.preventDefault(); 
                const targetElement = document.querySelector(selector);
                
                if (targetElement) {
                    targetElement.focus();
                    targetElement.click();
                    
                    // Visual Feedback
                    targetElement.classList.add('highlight');
                    setTimeout(() => targetElement.classList.remove('highlight'), 200);

                    sendPopupMessage({ action: 'SET_POPUP_STATUS', message: `Triggered: Ctrl+Shift+${pressedKey.toUpperCase()}` });
                }
            }
        }
    }

    // === B. QUICK CAPTURE MODE: Alt + S ===
    if (event.altKey && event.key.toLowerCase() === 's') {
        if (!globalHoveredElement) return;

        event.preventDefault();
        event.stopPropagation();

        const target = globalHoveredElement;
        
        // Visual Feedback for Capture
        target.classList.add('highlight');
        
        // Use timeout to allow UI update before blocking alert/prompt
        setTimeout(() => {
            const keyChar = prompt("Quick Capture!\nEnter a letter for Ctrl + Shift + [?]");
            target.classList.remove('highlight'); // Remove highlight immediately

            if (keyChar && keyChar.length === 1 && /[a-z0-9]/i.test(keyChar)) {
                // Save to the same storage structure as the popup
                const key = keyChar.toLowerCase();
                const selector = getOptimalSelector(target);
                
                // Update local map immediately
                shortcutMap[key] = selector;
                
                // Save to Chrome Storage
                chrome.storage.local.set({ [STORAGE_KEY]: shortcutMap }, () => {
                    alert(`Saved!\nTarget: ${selector}\nTrigger: Ctrl + Shift + ${key.toUpperCase()}`);
                    sendPopupMessage({ action: 'RELOAD_SHORTCUTS' }); // Tell popup to refresh if open
                });
            } else if (keyChar !== null) {
                alert("Invalid key. Cancelled.");
            }
        }, 50);
    }
}


// --- 4. POPUP CAPTURE MODE LOGIC (Active Mode) ---

function handleElementSelect(event) {
    let element = event.type === 'click' ? event.target : document.activeElement;

    if (!element || element.tagName === 'BODY' || element.tagName === 'HTML' || (element.matches(':focus') === false && event.type === 'focusin')) {
        return;
    }
    
    // Highlight logic for Popup Mode
    if (event.type === 'focusin' || event.type === 'mouseover') {
         document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
         element.classList.add('highlight');
         return;
    }
    
    // Final Selection (Click)
    if (event.type === 'click') {
        event.preventDefault();
        event.stopPropagation();
        
        const selector = getOptimalSelector(element); // Use the new Smart Selector
        
        // Turn off selection listeners
        toggleCaptureListeners(false);
        
        sendPopupMessage({ action: 'SET_POPUP_STATUS', message: `Selected: ${selector}. Press ALT + Key to assign...` });

        // Wait for Alt + Key
        document.addEventListener('keydown', (e) => handlePopupAssignment(e, selector), { once: true, capture: true });
    }
}

function handleElementHover(event) {
    document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
    const target = event.target;
    if (target && target.tagName !== 'BODY' && target.tagName !== 'HTML') {
        target.classList.add('highlight');
    }
}

function handlePopupAssignment(e, selector) {
    if (e.altKey && e.key.length === 1 && /[a-z0-9]/i.test(e.key) && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        
        const key = e.key.toLowerCase();
        
        // Send to popup (which handles the saving for Popup Mode)
        sendPopupMessage({ 
            action: 'NEW_ASSIGNMENT_READY', 
            selector: selector, 
            key: key 
        });
        
        toggleCaptureMode(false); 
    } else {
        // Retry if they pressed wrong key, or cancel
        toggleCaptureMode(false);
        sendPopupMessage({ action: 'SET_POPUP_STATUS', message: 'Assignment cancelled or invalid key.' });
    }
}

function toggleCaptureListeners(state) {
    document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
    document.body.style.cursor = state ? 'crosshair' : '';

    if (state) {
        document.addEventListener('focusin', handleElementSelect, true);
        document.addEventListener('click', handleElementSelect, true); 
    } else {
        document.removeEventListener('focusin', handleElementSelect, true);
        document.removeEventListener('click', handleElementSelect, true);
    }
}

function toggleCaptureMode(state) {
    isCaptureModeActive = state;
    chrome.storage.local.set({ [STATE_KEY]: state });
    toggleCaptureListeners(state);
    sendPopupMessage({ action: 'RETURN_STATE', state: state });
}

// --- 5. INITIALIZATION & UTILS ---

function loadShortcuts() {
    chrome.storage.local.get(STORAGE_KEY, (data) => {
        shortcutMap = data[STORAGE_KEY] || {};
        
        // Refresh Global Listener
        if (currentKeydownListener) document.removeEventListener('keydown', currentKeydownListener, true);
        currentKeydownListener = handleGlobalKeydown;
        document.addEventListener('keydown', currentKeydownListener, true);
    });
}

function loadCurrentState() {
    chrome.storage.local.get(STATE_KEY, (data) => {
        isCaptureModeActive = data[STATE_KEY] || false;
        if (isCaptureModeActive) toggleCaptureListeners(true);
    });
}

function sendPopupMessage(message) {
    try { chrome.runtime.sendMessage(message); } catch (e) {}
}

// Startup
loadShortcuts();
loadCurrentState();

// Message Listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'TOGGLE_CAPTURE') {
        toggleCaptureMode(message.state);
    } else if (message.action === 'RELOAD_SHORTCUTS') {
        loadShortcuts();
    } else if (message.action === 'GET_STATE') {
        sendResponse({ action: 'RETURN_STATE', state: isCaptureModeActive });
    }
});