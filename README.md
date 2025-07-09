# Local Prompt Chains Vault
A privacy-first extension to manage local prompt chains securely on your device.

## Publishing to the Chrome Web Store

To prepare the extension for publishing, follow these steps:

1.  **Install Dependencies:**
    Make sure you have [7-Zip](https://www.7-zip.org/download.html) installed and added to your system's PATH.

2.  **Update the Version:**
    Before publishing a new version, update the `version` number in the `manifest.json` file.

3.  **Package the Extension:**
    Run the following command to create an `easyprompt.zip` file containing all the necessary files for the extension:

    ```bash
    npm run package
    ```

4.  **Upload to the Chrome Web Store:**
    - Open the [Chrome Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard).
    - Select your item and upload the `easyprompt.zip` file.
    - Fill out the necessary store listing information and submit for review.
