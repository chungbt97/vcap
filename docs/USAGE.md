# User Guide

This guide covers how to install (import) the VCAP extension into your browser and how to use it for QA workflows.

## 1. Installation (Importing to Chrome)

To use VCAP during development or testing, you must load it as an unpacked extension:

1.  **Prepare the Build**:
    ```bash
    npm install
    npm run build
    ```
2.  **Open Extensions Manager**: In your Chrome browser, navigate to `chrome://extensions`.
3.  **Enable Developer Mode**: Toggle the **Developer mode** switch at the top-right corner of the page.
4.  **Load the Extension**: Click the **Load unpacked** button.
5.  **Select the Directory**: In the file picker, navigate to the VCAP project folder and select the `dist` directory.
6.  **Verify**: You should now see the VCAP extension card in the list. Pin it to your toolbar for easy access.

---

## 2. How to Use

Follow these steps to record and export a bug report:

### Step 1: Start Recording
- Click the VCAP icon in your browser toolbar.
- (Optional) Enter a **Ticket Name** or ID to help identify the report later.
- Click the **Start Recording** button. The icon will change to indicate recording state.

### Step 2: Capture Evidence
- Perform the actions on the website that you wish to document.
- VCAP automatically records:
    - Active tab video
    - Console logs (errors, warnings)
    - Network requests/responses
    - DOM mutations (interaction timeline)
- If you need to capture a specific moment, click the **Screenshot** icon in the popup.

### Step 3: Review the Session
- When finished, click **Stop Recording** in the popup.
- The **Side Panel** will automatically open, showing a summary of the session.
- You can browse the **Timeline**, **Console**, and **Network** tabs to verify the captured data.

### Step 4: Export the Report
- Go to the **Network** tab in the side panel.
- Select any critical API requests you want to include as cURL files.
- Click the **Export ZIP** button.
- A ZIP file will be downloaded containing the video, a markdown report for JIRA/GitHub, screenshots, and cURL files.
