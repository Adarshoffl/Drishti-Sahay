
👁️ Drishti Sahay (दृष्टि सहाय)
Version: 5.0 | Focus: Accessibility & Visual Impairment Support

Drishti Sahay is a specialized Chrome Extension designed to empower visually impaired and keyboard-first users. It bridges the gap between complex web layouts and simple keyboard navigation by allowing users to assign custom, voice-confirmed shortcuts to any button or link on the web.

🌟 Why Drishti Sahay Matters
For visually impaired users, navigating modern websites can be tedious. Tab-navigation often requires pressing Tab dozens of times to reach a specific button.

Drishti Sahay solves this:

Direct Access: Jump to a specific button (e.g., "Checkout") with one simple key combo (e.g., Ctrl+Shift+C) instead of 50 tabs.

No Guesswork: The extension Speaks to you. It confirms when you save a shortcut and when you trigger it.

Memory Aid: The "Heads-Up" Help Menu (Ctrl+1) reads out your saved keys so you don't have to memorize them.

Key Accessibility Features
🗣️ Voice Feedback System
Every action triggers a spoken confirmation using the browser's Native Text-to-Speech engine:

"Press any key to assign."

"Assigned 'L' to Login Button."

"Clicked Submit."

"Button not found."

⚡Assignment Workflow

Users simply Tab to an element and press Alt + S.

The system asks for a single key press.

The name of the button is automatically detected from the HTML (ARIA labels, Title, or Text).

🔍 High-Contrast Visual Cues
For users with low vision:

Selection: A thick, high-contrast Yellow Border (4px solid #ffeb3b) wraps the focused element.

Help Menu: A full-screen, dark-mode overlay lists shortcuts clearly.

User Manual (For Screen Reader Users)
1. Assigning a New Shortcut
Navigate to the button you want using Tab.

Press Alt + S.

You will hear: "Press any key to assign."

Press a single letter (e.g., L).

You will hear: "Assigned L to [Button Name]."

2. Using Your Shortcut
At any time, press Ctrl + Shift + [Your Key].

Drishti Sahay will focus and click that button for you.

You will hear: "Clicked [Button Name]."

3. Checking Saved Shortcuts
Press Ctrl + 1.

A Help Menu will open.

Screen readers can traverse this table to hear your saved keys.

Press Esc to close.

🛠️ Installation Guide
Download: Save the project folder containing manifest.json, content.js, popup.js, popup.html, and Styles.css.

Open Chrome: Go to chrome://extensions.

Developer Mode: Turn on the toggle in the top-right corner.

Load: Click Load Unpacked and select your Drishti Sahay folder.

Voice Permissions: The first time you use it, Chrome may ask for permission to play audio. Allow it.

⚙️ Technical Architecture
The "Smart Selector" Engine
To assist users who cannot visually inspect code, Drishti Sahay automatically finds the most reliable way to target a button. It uses a Waterfall Priority Algorithm:

ID Check: Looks for a unique #id.

Accessibility Check: Prioritizes aria-label, role, and title attributes (crucial for screen readers).

Modern Attribute Check: Looks for data-testid (common in React/Vue apps).

Structure Fallback: If all else fails, it calculates the element's position in the list.

Site-Specific Storage
Shortcuts are "sandboxed" by domain.

A shortcut set for amazon.com is stored separately from google.com.

This prevents accidental clicks when switching tabs.

*File	     *Role
content.js	-The Core. Handles key listeners, TTS (Speech), Element detection, and Help Popup injection.
Styles.css	-The Look. Defines the high-contrast yellow focus ring and the dark-mode Help overlay.
popup.html	-The Manager. A visual menu to view or reset shortcuts for the current site.
popup.js	-The Logic. Loads saved shortcuts into the popup menu and handles "Reset" functionality.
manifest.json	-The Config. Declares permissions (activeTab, storage, scripting).