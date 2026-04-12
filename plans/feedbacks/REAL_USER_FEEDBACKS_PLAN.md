# Real User Feedback — Implementation Plan

Dựa trên 6 feedback items từ [REAL_USER_FEEDBACKS.md](file:///Users/nicholasbien/Desktop/workspace/12.mvp/vcap/plans/feedbacks/REAL_USER_FEEDBACKS.md), plan được chia theo priority và mức ảnh hưởng.

---

## Tổng quan các Feedback

| # | Feedback | Mức độ | Ảnh hưởng |
|---|----------|--------|-----------|
| 1 | Click dropdown → innerText chưa hiển thị đúng | 🔴 Bug | Data accuracy |
| 2 | Loại bỏ URL `?rsc=...` (Next.js RSC) khỏi Network | 🟡 UX | Noise reduction |
| 3 | Nút All/None → Checkbox "Select All" | 🟡 UX | Consistency |
| 4 | Badge count trên tab → Màu trắng khi active + Console badge bị thiếu | 🟡 UI | Visual polish |
| 5 | DOM Steps phân chia theo URL (cả UI lẫn Markdown) | 🟠 Feature | Readability |
| 6 | Toggle Dark/Light mode bên cạnh Status | 🟢 Feature | User preference |

---

## Feedback 1: Click Dropdown → innerText chưa đúng

**Vấn đề**: Khi user click vào một dropdown rồi chọn item trong list, step chỉ ghi `click: li#_r_3a_-option-6` mà **không** ghi lại innerText (nội dung hiển thị) của option đó.

**Nguyên nhân gốc**: Trong [eventCollector.js](file:///Users/nicholasbien/Desktop/workspace/12.mvp/vcap/src/content/eventCollector.js#L161-L176), `onClickEvent()` chỉ gọi `pushStep({ type: 'click', target, url })` — **không bao gồm `value`**. Với dropdown custom (dùng `<li>` có role), click event không capture innerText của element được click.

**Giải pháp**: Trong `onClickEvent`, detect khi element là một listbox option (role=option, hoặc `<li>` inside `[role=listbox]`), capture innerText vào `value`.

#### [MODIFY] [eventCollector.js](file:///Users/nicholasbien/Desktop/workspace/12.mvp/vcap/src/content/eventCollector.js)

```diff
 function onClickEvent(e) {
   const el = e.target
   const tag = el.tagName?.toLowerCase()
   const type = (el.type || '').toLowerCase()
 
   if ((tag === 'input' && (type === 'checkbox' || type === 'radio')) || tag === 'select') return
 
   const target = buildSelector(el)
   const now = Date.now()
   if (_lastClickTime[target] && now - _lastClickTime[target] < CLICK_THROTTLE_MS) return
   _lastClickTime[target] = now
 
-  pushStep({ type: 'click', target, url: window.location.href })
+  // Detect listbox option clicks — capture innerText as value
+  const value = getClickValue(el)
+  pushStep({ type: 'click', target, value, url: window.location.href })
 }
```

Thêm helper `getClickValue(el)`:
- Check `el.role === 'option'` hoặc `el.closest('[role=listbox]')` hoặc `el.closest('[role=menu]')`
- Nếu match → return `el.innerText.trim().slice(0, 100)`
- Nếu element là `<li>` inside `<ul>` / `<ol>` with role → return innerText
- Nếu element là button/link/tab → return innerText (hữu ích cho debug)
- Fallback → `undefined` (không thay đổi behavior cũ)

#### [MODIFY] [markdownBuilder.js](file:///Users/nicholasbien/Desktop/workspace/12.mvp/vcap/src/utils/markdownBuilder.js)

Thêm `'click'` vào `VALUE_EVENT_TYPES` set để cột Value trong markdown hiển thị giá trị khi có:

```diff
 const VALUE_EVENT_TYPES = new Set([
-  'input', 'change', 'checkbox', 'radio', 'select', 'file', 'range',
+  'click', 'input', 'change', 'checkbox', 'radio', 'select', 'file', 'range',
   'switch', 'keydown', 'navigate',
 ])
```

---

## Feedback 2: Loại bỏ URL `?rsc=...` của Next.js

**Vấn đề**: Next.js RSC (React Server Components) generates requests dạng `?rsc=...`, `?_rsc=...` — đây là internal framework requests, không phải API calls thật sự.

**Giải pháp**: Thêm patterns vào `IGNORED_REQUEST_PATTERNS` trong [background/index.js](file:///Users/nicholasbien/Desktop/workspace/12.mvp/vcap/src/background/index.js#L177-L187).

#### [MODIFY] [index.js](file:///Users/nicholasbien/Desktop/workspace/12.mvp/vcap/src/background/index.js)

```diff
 const IGNORED_REQUEST_PATTERNS = [
   /\.(?:js|css|png|jpg|jpeg|gif|svg|woff2?|ttf|eot|ico|webp|avif|mp4|webm|mp3|wav|ogg|pdf|wasm)(\?|#|$)/i,
   /^chrome-extension:\/\//,
   /^data:/,
   /^blob:/,
   /\/favicon\./i,
   /\/hot-update\./i,
   /\/__webpack_hmr/i,
   /\/sockjs-node/i,
   /\/livereload/i,
+  // Next.js RSC internal requests
+  /[?&]_?rsc=/i,
+  // Next.js internal data requests
+  /\/_next\/data\//i,
+  // Next.js static assets
+  /\/_next\/static\//i,
 ]
```

---

## Feedback 3: Nút All/None → Checkbox "Select All"

**Vấn đề**: Hiện tại có 2 nút riêng biệt `✓ All` và `✗ None`. User muốn gom thành 1 checkbox `Select All` duy nhất.

**Giải pháp**: Replace 2 buttons bằng 1 checkbox + label "Select All". Checkbox sẽ ở trạng thái:
- ✅ Checked: tất cả đã selected → click = uncheck all
- ⬜ Unchecked: không item nào selected → click = check all
- ➖ Indeterminate: một phần selected → click = check all

#### [MODIFY] [NetworkPanel.jsx](file:///Users/nicholasbien/Desktop/workspace/12.mvp/vcap/src/panel/NetworkPanel.jsx)

```diff
-          {/* Check All / Uncheck All */}
-          <div className="ml-auto flex items-center gap-1">
-            <button onClick={() => onCheckAll?.(apiRequests.map(r => r.requestId))} ...>✓ All</button>
-            <button onClick={() => onUncheckAll?.()} ...>✗ None</button>
-          </div>
+          {/* Select All checkbox */}
+          <label className="ml-auto flex items-center gap-1.5 cursor-pointer select-none">
+            <input
+              type="checkbox"
+              ref={selectAllRef}  // useRef for indeterminate state
+              checked={allChecked}
+              onChange={() => allChecked ? onUncheckAll?.() : onCheckAll?.(apiRequests.map(r => r.requestId))}
+              className="..."
+            />
+            <span className="font-label text-[9px] font-bold text-on-surface-variant">Select All</span>
+          </label>
```

Tính toán `allChecked` và `indeterminate`:
```js
const allChecked = selected?.size === apiRequests.length && apiRequests.length > 0
const noneChecked = !selected || selected.size === 0
// Set ref.current.indeterminate = !allChecked && !noneChecked via useEffect
```

#### [MODIFY] [ConsolePanel.jsx](file:///Users/nicholasbien/Desktop/workspace/12.mvp/vcap/src/panel/ConsolePanel.jsx)

Áp dụng logic tương tự cho ConsolePanel.

---

## Feedback 4: Badge Count trên Tab → Màu trắng khi Active + Console badge bị thiếu

**Vấn đề**: 
- Con số (badge) ở góc trên bên phải của tab (ví dụ: Network count, Console count) không đổi màu trắng khi tab đang active → khó đọc trên nền `#fa520f`.
- Tab Console **không hiển thị badge count**.

**Giải pháp**: Trong [App.jsx](file:///Users/nicholasbien/Desktop/workspace/12.mvp/vcap/src/panel/App.jsx#L178-L202), sửa tab rendering:

#### [MODIFY] [App.jsx](file:///Users/nicholasbien/Desktop/workspace/12.mvp/vcap/src/panel/App.jsx)

```diff
 {TABS.map((tab) => {
+  // Compute badge count per tab
+  const badgeCount = tab === 'Network' ? errCount
+    : tab === 'Console' ? (session.consoleErrors?.length || 0)
+    : tab === 'DOM' ? (session.steps?.length || 0)
+    : 0
+
   return (
     <button key={tab} ...>
       {tab}
-      {tab === 'Network' && errCount > 0 && (
-        <span className="ml-1 bg-error/20 text-error px-1 rounded text-[8px]">
-          {errCount}
+      {badgeCount > 0 && (
+        <span className={`ml-1 px-1 rounded text-[8px] ${
+          activeTab === tab
+            ? 'bg-white/20 text-white'
+            : 'bg-error/20 text-error'
+        }`}>
+          {badgeCount}
         </span>
       )}
     </button>
   )
 })}
```

> [!NOTE]
> Badge sẽ hiển thị cho cả DOM (step count), Network (error count), Console (error count). Khi tab active → badge chuyển sang trắng để dễ đọc trên nền cam.

---

## Feedback 5: DOM Steps Phân Chia Theo URL

**Vấn đề**: Khi user navigate giữa các trang, tất cả steps hiện đang hiện thành 1 list phẳng — không phân biệt đâu là steps ở trang nào.

**Giải pháp**: Group steps theo `step.url`, chèn URL divider giữa các nhóm. Áp dụng cho cả 3 nơi:
1. **Panel UI** (DOM Steps section)
2. **Markdown (Quick Copy)**  
3. **ZIP export (jira-ticket.md)**

#### [MODIFY] [App.jsx](file:///Users/nicholasbien/Desktop/workspace/12.mvp/vcap/src/panel/App.jsx) — DOM Steps section

Thay vì render flat list, detect URL change giữa các steps liên tiếp và chèn divider:

```jsx
{(session.steps || []).map((step, i, arr) => {
  const prevUrl = i > 0 ? arr[i - 1].url : null
  const showUrlDivider = step.url && step.url !== prevUrl
  
  return (
    <React.Fragment key={i}>
      {showUrlDivider && (
        <div className="flex items-center gap-2 my-2 py-1.5 px-2 bg-surface-container-highest/50 rounded" 
             style={{ borderLeft: '2px solid #ffa110' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 10, color: '#ffa110' }}>link</span>
          <span className="font-label text-[9px] text-on-surface-variant truncate">{step.url}</span>
        </div>
      )}
      {/* existing step card */}
    </React.Fragment>
  )
})}
```

#### [MODIFY] [markdownBuilder.js](file:///Users/nicholasbien/Desktop/workspace/12.mvp/vcap/src/utils/markdownBuilder.js)

Markdown output sẽ chèn URL heading khi URL thay đổi:

```diff
+  let lastUrl = null
   for (const s of steps) {
+    // Insert URL divider when page changes
+    if (s.url && s.url !== lastUrl) {
+      lastUrl = s.url
+      lines.push('')
+      lines.push(`**📍 Page: ${escapePipe(s.url)}**`)
+      lines.push('')
+      lines.push('| # | Time | Action | Value | Note |')
+      lines.push('|---|------|--------|-------|------|')
+    }
     // ... existing row logic
   }
```

> [!IMPORTANT]
> Mỗi URL group sẽ có table header riêng để Jira render đúng khi paste. Nếu chỉ 1 URL duy nhất (không navigate), output sẽ giống hệt hiện tại — không breaking change.

---

## Feedback 6: Toggle Dark/Light Mode

**Vấn đề**: User muốn có nút toggle Dark/Light mode bên cạnh "Status ready".

**Giải pháp**: Thêm theme toggle button vào header bar của panel. Lưu preference vào `chrome.storage.local`.

#### [MODIFY] [App.jsx](file:///Users/nicholasbien/Desktop/workspace/12.mvp/vcap/src/panel/App.jsx)

Thêm state + toggle button trong header:

```jsx
const [isDark, setIsDark] = useState(true) // default dark

useEffect(() => {
  // Load saved preference
  chrome.storage?.local.get('vcapTheme', (d) => {
    if (d.vcapTheme === 'light') setIsDark(false)
  })
}, [])

const toggleTheme = () => {
  const next = !isDark
  setIsDark(next)
  document.documentElement.classList.toggle('dark', next)
  document.documentElement.classList.toggle('light', !next)
  chrome.storage?.local.set({ vcapTheme: next ? 'dark' : 'light' })
}
```

Trong header, bên cạnh status indicator:

```jsx
<button onClick={toggleTheme} className="..." title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
    {isDark ? 'light_mode' : 'dark_mode'}
  </span>
</button>
```

#### [MODIFY] [panel.css](file:///Users/nicholasbien/Desktop/workspace/12.mvp/vcap/src/panel/panel.css) + [tailwind.config.js](file:///Users/nicholasbien/Desktop/workspace/12.mvp/vcap/tailwind.config.js)

Thêm light mode color overrides:

```css
html.light, html.light body {
  background-color: #faf8f5;
  color: #1f1f1f;
}
```

Tailwind config đã có `darkMode: 'class'` — tương thích sẵn. Cần thêm light-mode utility overrides cho các surface/text colors.

> [!WARNING]
> Light mode cần test kỹ vì toàn bộ design system hiện tại hướng dark. Approach: override CSS variables cho `.light` class trên `<html>`, giữ dark làm default.

---

## Thứ tự thực hiện (Execution Order)

| Phase | Feedback | Lý do ưu tiên |
|-------|----------|----------------|
| **A** | #1 (Dropdown innerText) | Bug — data accuracy |
| **B** | #2 (Filter RSC URLs) | Quick fix — 3 dòng regex |
| **C** | #4 (Badge colors + Console badge) | Quick fix — UI |
| **D** | #3 (Select All checkbox) | UX improvement |
| **E** | #5 (URL grouping in Steps) | Feature — requires UI + Markdown |
| **F** | #6 (Dark/Light toggle) | Feature — requires design work |

---

## Verification Plan

### Automated Tests
- Update `markdownBuilder.test.js` — verify URL grouping output + click value in table
- Run `npm test` to ensure no regressions

### Manual Verification
- Build extension (`npm run build`) and load vào Chrome
- Record session trên Next.js app (có RSC URLs) → verify #2
- Click dropdown → verify innerText hiển thị trong step → verify #1
- Kiểm tra tab badges khi active/inactive → verify #4
- Navigate giữa 2+ pages → verify URL dividers → verify #5
- Toggle theme → verify #6
