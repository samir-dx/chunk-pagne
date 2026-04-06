# Privacy Policy for Track Network Chunks

**Effective Date:** April 7, 2026

This Privacy Policy describes how the "Track Network Chunks" Chrome Extension ("the Extension") handles your data. We are committed to protecting your privacy. 

**The short version: We do not collect, transmit, distribute, or sell any of your personal data. Everything happens locally on your device.**

## 1. Data Collection and Usage
The Extension is designed to be a local developer tool. It monitors network traffic strictly on `*.sprinklr.com` domains to identify Next.js JavaScript chunks being loaded by the browser. 

* **Local Storage:** Any data captured by the Extension (such as captured chunk names, timestamps, and your custom saved lists) is saved strictly on your local machine using Chrome's native `chrome.storage.local` API. 
* **No Telemetry or Analytics:** The Extension does not include any tracking scripts, telemetry, or analytics software.
* **No External Servers:** The Extension does not send, transmit, or sync any data to our servers or any third-party servers. All data remains completely isolated within your browser.

## 2. Chrome Permissions Justification
To function, the Extension requires specific browser permissions. Here is exactly how they are used:
* **`webRequest` & `*://*.sprinklr.com/*`:** Used solely to intercept and read the file names of Next.js static chunks loaded during your Sprinklr session. It does not read your passwords, personal information, or page content.
* **`webNavigation`:** Used to detect when a Sprinklr tab is refreshed or navigated away from, allowing the Extension to automatically clear its temporary memory.
* **`tabs`:** Used exclusively to isolate chunk counts to specific active tabs, ensuring accurate debugging.
* **`storage`:** Used to save your custom chunk lists locally to your hard drive so they persist between browser sessions.

## 3. Data Sharing and Disclosure
Because we do not collect or transmit your data, **we do not and cannot share, sell, or disclose your data to any third parties.** ## 4. Data Retention and Deletion
You have full control over your data. 
* **Temporary Data:** Live tracking data is automatically deleted from your local storage the moment you close or navigate away from a Sprinklr tab.
* **Saved Data:** You can delete your saved chunk lists at any time using the "Delete" button inside the Extension's interface.
* **Complete Removal:** Uninstalling the Extension from your Chrome browser will immediately and permanently delete all local data associated with it.

## 5. Changes to this Privacy Policy
We may update this Privacy Policy from time to time if the functionality of the Extension changes. If any updates require new data collection practices, we will prompt you for explicit consent through the Chrome Web Store update mechanism.

## 6. Contact
If you have any questions, concerns, or feedback regarding this Privacy Policy or the Extension, please reach out via our GitHub repository issues page: 
**[Insert your GitHub Repo URL here, e.g., https://github.com/samir-dx/chunk-pagne/issues]**