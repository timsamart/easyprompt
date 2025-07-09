# Chrome Web Store Listing Information

This file contains all the text and asset information needed to publish the "Local Prompt Chains Vault" extension to the Chrome Web Store.

---

## Product Details

### Title (from manifest)
Local Prompt Chains Vault

### Summary (from manifest)
Save and insert prompts and prompt chains at your cursor position. All data is stored locally.

### Detailed Description
**Draft:**

**Your Private Prompt Library - Local, Secure, and Offline!**

Tired of cloud-based services that require logins and track your data? **Local Prompt Chains Vault** is the privacy-first solution for managing your text snippets and complex prompt chains. Everything is stored securely on your own device—no accounts, no tracking, just you and your data.

**Why You'll Love Local Prompt Chains Vault:**

*   **100% Local Storage:** Your data never leaves your computer. Period.
*   **No Login Required:** Install and start using it instantly. No accounts, no passwords.
*   **Save Anything:** From simple text snippets to multi-step prompt chains, save it all in your private, offline library.
*   **Instant Access:** Open the side panel on any website to quickly search and find the prompt you need.
*   **One-Click Insert:** Click to insert your saved text directly at your cursor's position—no more copy-pasting!
*   **Easy Backup:** Your library is yours. Back it up or transfer it with the simple import and export feature.

Whether you're a developer, writer, or researcher, Local Prompt Chains Vault gives you the power to manage your prompts with the peace of mind that your data remains private. Install now and create your own secure prompt vault!

### Category
Productivity

### Language
English (United States)

---

## Graphic Assets

### Store Icon (128x128)
- **File:** `icons/icon128.png`
- **Status:** **Ready**

### Screenshots (1280x800 or 640x400)
*You have several good options in the `/screenshots` folder. You can choose up to 5.*

**Recommended Screenshots:**
1. `screenshots/02-with-sample-data.png` (Shows the main panel with data)
2. `screenshots/03-add-prompt-dialog.png` (Shows the add/edit prompt dialog)
3. `screenshots/04-search-results.png` (Demonstrates the search functionality)
4. `screenshots/06-final-state.png` (Another view of the final UI)
5. `screenshots/05-mobile-view.png` (Optional, if you want to show responsive design)

### Small Promo Tile (440x280)
- **Status:** **Needs to be created.**
- **Suggestion:** Create a simple image with the extension logo and name on a solid background.

### Marquee Promo Tile (1400x560)
- **Status:** **Needs to be created.**
- **Suggestion:** A wider banner image, perhaps showing the extension UI alongside a compelling tagline.

### Global Promo Video (YouTube URL)
- **Status:** **Optional.**
- **URL:** `(Enter YouTube video URL here if you create one)`

---

## Additional Fields

### Official URL / Homepage URL
- **Status:** **Optional.**
- **URL:** `(Enter your project's website or GitHub repository URL here)`
- **Suggestion:** `https://github.com/your-username/local-prompt-chains-vault`

### Support URL
- **Status:** **Optional.**
- **URL:** `(Enter a URL for users to get support)`
- **Suggestion:** `https://github.com/your-username/local-prompt-chains-vault/issues`

### Mature Content
- **Answer:** No

---

## Privacy Practices

### Single Purpose Description
The extension's single purpose is to allow users to save, manage, and quickly insert text snippets and multi-step prompt chains into editable fields on any webpage. All data is stored securely and privately on the user's local device.

### Justification for Permissions

**1. `storage`**
- **Justification:** This permission is essential for the core functionality of the extension. It is used to securely store the user's saved prompts, prompt chains, and settings locally on their own device. No data is transmitted externally.

**2. `activeTab` & Host Permission (`<all_urls>`)**
- **Justification:** These permissions are required to insert text into web pages. The `activeTab` permission, combined with broad host permissions, allows the user to insert their saved prompts into input fields on any website they are currently visiting. The extension only injects its content script to perform this action and does not read or alter any other page content. This functionality is central to the user experience, as it enables the "insert at cursor" feature everywhere.

**3. `contextMenus`**
- **Justification:** This permission is used to provide quick access to the user's prompts and to open the main panel. It adds a "Local Prompt Chains Vault" menu to the right-click context menu, allowing users to insert their most-used prompts or open the side panel without having to click the extension icon.

**4. `sidePanel`**
- **Justification:** This permission is used to display the extension's main user interface in the browser's side panel. This allows the user to view, manage, and search their library of prompts and chains without leaving the current page.

### Justification for Remote Code Use

- **Library:** `feather.min.js`
- **Justification:** The extension uses `feather.min.js`, a well-known and reputable open-source library for displaying icons. This library is bundled with the extension and is not fetched from a remote server at runtime. It is used solely for rendering the user interface icons within the extension's panel and popup to provide a clean and intuitive user experience.

--- 