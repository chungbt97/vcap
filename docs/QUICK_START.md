# VCAP Quick Start For Testers

This is the shortest path to using VCAP in QA. If you need the full guide, see [User Guide](./USAGE.md).

## 1. Install It In Chrome

There are 2 common cases:

### Case A: You already have a `dist` folder

You do not need to run `npm install` or `npm run build`.

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select the `dist` folder
5. Pin VCAP to the toolbar

### Case B: You do not have `dist`, or `dist` is outdated

Build it first:

```bash
npm install
npm run build
```

Then:

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked**
4. Select the `dist` folder
5. If the extension was already loaded, click **Reload** to refresh it

## 2. Fast Workflow

1. Open the page where you want to reproduce the bug.
2. Click the VCAP toolbar icon.
3. Fill in **Ticket Info** if you want a custom export filename.
4. Keep or disable **5s countdown before recording**.
5. Click **Start Recording**.
6. Reproduce the issue.
7. If needed, click the camera icon to capture a screenshot.
8. If needed, right-click the page and use **Vcap Flash Action** > **Add Note**.
9. When finished, reopen the popup and click **Stop Recording**.
10. Click **Open Full Panel** to review the captured data.
11. Keep only the requests or console messages you want to export.
12. Click **ZIP** in the side panel to download the report.

## 3. What VCAP Captures

- Active-tab video, up to 5 minutes
- DOM events
- REST and GraphQL network requests
- Console errors and warnings
- Manual screenshots
- Quick notes added by the tester

## 4. Important Notes

- All data is processed locally on the machine.
- The side panel does not open automatically after stopping a recording. You must click **Open Full Panel**.
- The **Export Markdown** button in the popup currently exports the ZIP for the current session.
- You can export the same session multiple times. Data is cleared only when a new recording starts.

## 5. If Something Fails

### Recording does not start

Check these first:

- You are not on a browser-internal page such as `chrome://...`
- DevTools or Lighthouse is not already attached to the tab debugger
- If you changed the source code, rebuild and reload the extension

### Export fails

This usually means the session has no video yet or not enough captured data. Record a new session and export again.

### The panel does not open by itself

That is expected in the current version. Open the popup and click **Open Full Panel**.