(function(){"use strict";const x={START_RECORDING:"START_RECORDING",STOP_RECORDING:"STOP_RECORDING",START_CAPTURE:"START_CAPTURE",STOP_CAPTURE:"STOP_CAPTURE",CAPTURE_DONE:"CAPTURE_DONE",CAPTURE_FAILED:"CAPTURE_FAILED",CAPTURE_ERROR:"CAPTURE_ERROR",DOM_EVENT_BATCH:"DOM_EVENT_BATCH",DOM_EVENT:"DOM_EVENT",CONSOLE_ERROR:"CONSOLE_ERROR",NOTE_ADDED:"NOTE_ADDED",NEW_RECORDING:"NEW_RECORDING",QUERY_STATUS:"QUERY_STATUS",SHOW_NOTE_DIALOG:"SHOW_NOTE_DIALOG",START_COUNTDOWN:"START_COUNTDOWN",CANCEL_COUNTDOWN:"CANCEL_COUNTDOWN",START_RECORDING_REQUEST:"START_RECORDING_REQUEST",STOP_RECORDING_REQUEST:"STOP_RECORDING_REQUEST",TAKE_SCREENSHOT:"TAKE_SCREENSHOT",EXPORT_SESSION:"EXPORT_SESSION",FLUSH_EVENTS:"FLUSH_EVENTS"},X={SYNC_INTERVAL_MS:5e3},_=EventTarget.prototype.addEventListener.bind(document),C=EventTarget.prototype.removeEventListener.bind(document);let m=!1,M=null,N=[],O=[],D=0,A=null,L=null;const q=X.SYNC_INTERVAL_MS,k={},I={},U={},J=50,Z=50,tt=300,et=400;let S={},y=null,R={};const nt=150;let $=!1;function ot(){if($)return;$=!0;const t=document.createElement("script");t.src=chrome.runtime.getURL("src/content/page-console-capture.js"),(document.head||document.documentElement).appendChild(t),t.onload=()=>t.remove()}function F(t){var e;t.source===window&&(!((e=t.data)!=null&&e.__vcap__)||t.data.type!=="CONSOLE_ERROR"||m&&O.push({timestamp:W(),message:t.data.message,source:"console"}))}function V(){m||(m=!0,M=Date.now(),N=[],O=[],D=0,_.call(document,"click",G,!0),_.call(document,"change",K,!0),_.call(document,"input",H,!0),_.call(document,"submit",B,!0),_.call(document,"keydown",z,!0),A=ct(),lt(),ot(),window.addEventListener("message",F),L=setInterval(()=>{const t=P();if(t.steps.length>0||t.consoleErrors.length>0)try{chrome.runtime.sendMessage({type:x.FLUSH_EVENTS,payload:{steps:t.steps,consoleErrors:t.consoleErrors}})}catch{}},q))}function rt(){m&&(m=!1,C.call(document,"click",G,!0),C.call(document,"change",K,!0),C.call(document,"input",H,!0),C.call(document,"submit",B,!0),C.call(document,"keydown",z,!0),A&&(A(),A=null),window.removeEventListener("message",F),L&&(clearInterval(L),L=null),Object.values(S).forEach(({timer:t,flush:e})=>{clearTimeout(t);try{e()}catch{}}),S={},Object.values(R).forEach(clearTimeout),R={},dt())}function P(){const t={steps:[...N],consoleErrors:[...O]};return N=[],O=[],t}function G(t){var s;const e=t.target,o=(s=e.tagName)==null?void 0:s.toLowerCase(),n=(e.type||"").toLowerCase();if(o==="input"&&(n==="checkbox"||n==="radio")||o==="select")return;const r=w(e),a=Date.now();if(k[r]&&a-k[r]<J)return;k[r]=a;const l=at(e);g({type:"click",target:r,value:l,url:window.location.href})}function at(t){var a,l,s,u,c,p,d;if(!t)return;const e=(a=t.getAttribute)==null?void 0:a.call(t,"role");if(e==="option"||e==="menuitem"||e==="menuitemradio"||e==="menuitemcheckbox"||e==="treeitem"){const i=(t.innerText||t.textContent||"").trim().replace(/\s+/g," ");return i?i.slice(0,100):void 0}if(((l=t.closest)==null?void 0:l.call(t,"[role=listbox]"))||((s=t.closest)==null?void 0:s.call(t,"[role=menu]"))||((u=t.closest)==null?void 0:u.call(t,"[role=menubar]"))||((c=t.closest)==null?void 0:c.call(t,"[role=tree]"))){const i=(t.innerText||t.textContent||"").trim().replace(/\s+/g," ");return i?i.slice(0,100):void 0}if(((p=t.tagName)==null?void 0:p.toLowerCase())==="li"){const i=(t.innerText||t.textContent||"").trim().replace(/\s+/g," ");return i?i.slice(0,100):void 0}const r=(d=t.tagName)==null?void 0:d.toLowerCase();if(r==="button"||r==="a"){const i=(t.innerText||t.textContent||"").trim().replace(/\s+/g," ");return i?i.slice(0,100):void 0}}function K(t){var c,p,d,i,v;const e=t.target;if(!e)return;const o=(c=e.tagName)==null?void 0:c.toLowerCase(),n=(e.type||"").toLowerCase(),r=w(e),a=Date.now();if(U[r]&&a-U[r]<Z)return;U[r]=a;let l="change",s;if(o==="input"&&n==="checkbox")l="checkbox",s=e.checked?"✓ checked":"✗ unchecked";else if(o==="input"&&n==="radio")l="radio",s=e.value||((i=(d=(p=e.labels)==null?void 0:p[0])==null?void 0:d.textContent)==null?void 0:i.trim())||"selected";else if(o==="select"){l="select";const h=e.options[e.selectedIndex];s=((v=h==null?void 0:h.text)==null?void 0:v.trim())||e.value}else if(o==="input"&&n==="file"){l="file";const h=Array.from(e.files||[]).map(f=>f.name);s=h.length>0?h.join(", "):"no file"}else o==="input"&&n==="range"?(l="range",s=e.value):s=j(e);const u=Y(e);g({type:l,target:r,value:s,labelText:u,url:window.location.href})}function H(t){var s;const e=t.target,o=(s=e.tagName)==null?void 0:s.toLowerCase(),n=(e.type||"").toLowerCase();if(o==="input"&&!new Set(["","text","search","email","url","tel","number","password","textarea"]).has(n)||o!=="input"&&o!=="textarea")return;const a=w(e);S[a]&&clearTimeout(S[a].timer);const l=()=>{const u=j(e),c=Y(e);g({type:"input",target:a,value:u,labelText:c,url:window.location.href}),delete S[a]};S[a]={timer:setTimeout(l,et),flush:l}}function B(t){const e=t.target,o=w(e);g({type:"submit",target:o,url:window.location.href})}const it=new Set(["Enter","Escape","Tab","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12"]),st=new Set(["s","z","y","f","a","c","v","x","/"]);function z(t){var v;const e=t.target,o=(v=e.tagName)==null?void 0:v.toLowerCase(),n=(e.type||"").toLowerCase(),r=t.key,a=t.ctrlKey||t.metaKey||t.altKey;if((o==="input"&&!["checkbox","radio","range","file","submit","button"].includes(n)||o==="textarea")&&r!=="Enter"&&r!=="Escape")return;const s=it.has(r),u=a&&st.has(r.toLowerCase());if(!s&&!u)return;const c=w(e),p=a?`${t.ctrlKey?"Ctrl+":""}${t.metaKey?"Cmd+":""}${t.altKey?"Alt+":""}${r}`:r,d=Date.now(),i=`${c}::${p}`;I[i]&&d-I[i]<tt||(I[i]=d,g({type:"keydown",target:c,value:p,url:window.location.href}))}function ct(){const t=history.pushState.bind(history),e=history.replaceState.bind(history);history.pushState=function(...n){t(...n),m&&g({type:"navigate",target:"pushState",value:String(n[2]||window.location.href),url:window.location.href})},history.replaceState=function(...n){e(...n),m&&g({type:"navigate",target:"replaceState",value:String(n[2]||window.location.href),url:window.location.href})};const o=()=>{m&&g({type:"navigate",target:"back/forward",value:window.location.href,url:window.location.href})};return window.addEventListener("popstate",o),()=>{history.pushState=t,history.replaceState=e,window.removeEventListener("popstate",o)}}function lt(){if(!y){y=new MutationObserver(t=>{for(const e of t){if(e.type!=="attributes")continue;const o=e.target;if(!o||o.nodeType!==Node.ELEMENT_NODE)continue;const n=e.attributeName,r=o.getAttribute(n),a=e.oldValue;if(r===a)continue;const l=`${w(o)}::${n}`;if(R[l])continue;const s=o,u=n,c=r;R[l]=setTimeout(()=>{if(delete R[l],!m)return;const p=w(s);let d,i;if(u==="aria-checked")d=s.getAttribute("role")==="switch"?"switch":"checkbox",i=c==="true"?"✓ on":c==="false"?"✗ off":c;else if(u==="aria-selected"){if(c!=="true")return;d="select",i=ut(s)}d&&g({type:d,target:p,value:i,url:window.location.href})},nt)}});try{y.observe(document.body,{subtree:!0,attributes:!0,attributeOldValue:!0,attributeFilter:["aria-checked","aria-selected"]})}catch{y=null}}}function dt(){y&&(y.disconnect(),y=null)}function ut(t){if(!t)return null;const e=t.getAttribute("aria-label");if(e)return e.trim().slice(0,100);const o=(t.innerText||t.textContent||"").trim().replace(/\s+/g," ");return o?o.slice(0,100):null}function Y(t){var l,s,u,c,p,d,i,v,h;if(!t)return null;if(t.labels&&t.labels.length>0){const f=(l=t.labels[0].textContent)==null?void 0:l.trim().replace(/\s+/g," ");if(f)return f.slice(0,80)}const e=(s=t.getAttribute)==null?void 0:s.call(t,"aria-label");if(e)return e.trim().slice(0,80);const o=(u=t.getAttribute)==null?void 0:u.call(t,"aria-labelledby");if(o){const f=document.getElementById(o),T=(c=f==null?void 0:f.textContent)==null?void 0:c.trim().replace(/\s+/g," ");if(T)return T.slice(0,80)}let n=t.parentElement,r=0;for(;n&&r<5;){if(((p=n.tagName)==null?void 0:p.toLowerCase())==="label"){const T=(d=n.textContent)==null?void 0:d.trim().replace(/\s+/g," ");if(T)return T.slice(0,80)}let f=n.previousElementSibling;for(;f;){if(((i=f.tagName)==null?void 0:i.toLowerCase())==="label"){const T=(v=f.textContent)==null?void 0:v.trim().replace(/\s+/g," ");if(T)return T.slice(0,80)}f=f.previousElementSibling}n=n.parentElement,r++}const a=(h=t.getAttribute)==null?void 0:h.call(t,"placeholder");return a?a.trim().slice(0,80):null}function g(t){m&&(D++,N.push({index:D,timestamp:W(),...t}))}const pt=new Set(["svg","path","img","i","span","em","strong","b","small","use","circle","rect","line","polyline","polygon","g","symbol","ellipse","text","tspan","defs","clippath","mask","lineargradient","radialgradient","stop","fecomposite"]);function w(t){var r,a,l,s,u;if(!t||!t.tagName)return"unknown";let e=t;for(;e&&e!==document.body;){const c=e.tagName.toLowerCase(),p=((r=e.getAttribute)==null?void 0:r.call(e,"data-testid"))||((a=e.getAttribute)==null?void 0:a.call(e,"data-test-id"));if(p)return`${c}[testid=${p.slice(0,40)}]`;if(e.id)return`${c}#${e.id}`;const d=((l=e.getAttribute)==null?void 0:l.call(e,"aria-label"))||((s=e.getAttribute)==null?void 0:s.call(e,"name"))||e.title||((u=e.getAttribute)==null?void 0:u.call(e,"placeholder"));if(d)return`${c}[${d.slice(0,40)}]`;const i=(e.innerText||e.textContent||"").trim().replace(/\s+/g," ");if(i&&i.length>0)return i.length<=30?`${c} ("${i}")`:`${c} ("${i.slice(0,30)}...")`;if(pt.has(c))e=e.parentElement;else break}const o=t.tagName.toLowerCase(),n=Array.from(t.classList).filter(c=>c.length<=20).slice(0,2).join(".");return n?`${o}.${n}`:o}function j(t){var a;if(!t)return;const e=(t.type||"").toLowerCase(),o=(t.name||t.id||((a=t.getAttribute)==null?void 0:a.call(t,"aria-label"))||"").toLowerCase();if(e==="password"||/password|secret|token|credit|card|cvv|ssn|otp|pin/i.test(o))return"[REDACTED]";const r=t.value;if(!(r==null||r===""))return String(r).slice(0,200)}function W(){const t=Math.floor((Date.now()-M)/1e3),e=String(Math.floor(t/60)).padStart(2,"0"),o=String(t%60).padStart(2,"0");return`${e}:${o}`}let b=null;function Q(){if(b)return;const t=document.title?` • ${document.title.slice(0,20)}`:"";b=document.createElement("div"),b.id="vcap-host";const e=b.attachShadow({mode:"closed"});e.innerHTML=`
    <style>
      #vcap-border-top,
      #vcap-border-right,
      #vcap-border-bottom,
      #vcap-border-left {
        position: fixed;
        pointer-events: none;
        z-index: 2147483646;
        background: rgba(227,69,10,0.9);
      }

      #vcap-border-top {
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
      }

      #vcap-border-right {
        top: 0;
        right: 0;
        bottom: 0;
        width: 3px;
      }

      #vcap-border-bottom {
        left: 0;
        right: 0;
        bottom: 0;
        height: 3px;
      }

      #vcap-border-left {
        top: 0;
        left: 0;
        bottom: 0;
        width: 3px;
      }

      /* ── Floating badge (bottom-right) ── */
      #vcap-badge {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        height: 28px;
        padding: 0 12px;
        border-radius: 20px;
        background: #fa520f;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-family: system-ui, sans-serif;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(250,82,15,.4);
        animation: vcap-pulse 1.4s ease-in-out infinite;
        cursor: default;
        user-select: none;
      }
      @keyframes vcap-pulse {
        0%, 100% { box-shadow: 0 4px 12px rgba(250,82,15,.4); }
        50%       { box-shadow: 0 4px 24px rgba(250,82,15,.8); }
      }
    </style>
    <div id="vcap-border-top"></div>
    <div id="vcap-border-right"></div>
    <div id="vcap-border-bottom"></div>
    <div id="vcap-border-left"></div>
    <div id="vcap-badge">REC${t}</div>
  `,document.body.appendChild(b)}function ft(){b==null||b.remove(),b=null}let E=null;function mt(){if(E)return;E=document.createElement("div"),E.id="vcap-note-dialog-host";const t=E.attachShadow({mode:"closed"});t.innerHTML=`
    <style>
      :host { all: initial; }

      .vcap-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        background: rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: system-ui, -apple-system, sans-serif;
      }

      .vcap-dialog {
        background: #1f1f1f;
        border: 1px solid #3a3028;
        border-radius: 10px;
        padding: 16px;
        width: 340px;
        max-width: calc(100vw - 32px);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
        animation: vcap-slide-up 0.2s ease-out;
      }

      @keyframes vcap-slide-up {
        from { transform: translateY(10px); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }

      .vcap-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }

      .vcap-title {
        font-size: 12px;
        font-weight: 700;
        color: #f5f0eb;
        letter-spacing: 0.02em;
      }

      .vcap-close {
        background: none;
        border: none;
        color: #b0a89e;
        font-size: 16px;
        line-height: 1;
        cursor: pointer;
        padding: 2px 4px;
        border-radius: 4px;
        transition: background 0.15s;
      }
      .vcap-close:hover { background: #3a3028; color: #f5f0eb; }

      .vcap-textarea {
        width: 100%;
        box-sizing: border-box;
        background: #2a2a2a;
        border: 1px solid #3a3028;
        border-radius: 6px;
        color: #f5f0eb;
        font-family: system-ui, sans-serif;
        font-size: 12px;
        line-height: 1.5;
        padding: 8px 10px;
        resize: vertical;
        min-height: 72px;
        outline: none;
        transition: border-color 0.15s;
      }
      .vcap-textarea:focus { border-color: #fa520f; }
      .vcap-textarea::placeholder { color: #6b5f52; }

      .vcap-hint {
        font-size: 9px;
        color: #6b5f52;
        margin-top: 4px;
        margin-bottom: 10px;
      }

      .vcap-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }

      .vcap-btn {
        padding: 5px 14px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.05em;
        border-radius: 5px;
        border: none;
        cursor: pointer;
        transition: opacity 0.15s;
      }
      .vcap-btn:hover { opacity: 0.85; }

      .vcap-btn-cancel {
        background: #3a3028;
        color: #b0a89e;
      }

      .vcap-btn-save {
        background: #fa520f;
        color: #fff;
      }
    </style>

    <div class="vcap-overlay" id="vcap-overlay">
      <div class="vcap-dialog" role="dialog" aria-modal="true" aria-label="Add VCAP Note">
        <div class="vcap-header">
          <span class="vcap-title">📝 Quick Note</span>
          <button class="vcap-close" id="vcap-close-btn" aria-label="Close">✕</button>
        </div>
        <textarea
          class="vcap-textarea"
          id="vcap-textarea"
          placeholder="Describe the bug or observation…"
          rows="3"
        ></textarea>
        <p class="vcap-hint">Enter to save · Shift+Enter for newline · Esc to cancel</p>
        <div class="vcap-actions">
          <button class="vcap-btn vcap-btn-cancel" id="vcap-cancel-btn">Cancel</button>
          <button class="vcap-btn vcap-btn-save" id="vcap-save-btn">Save</button>
        </div>
      </div>
    </div>
  `;function e(){E==null||E.remove(),E=null}function o(){var a;const n=t.getElementById("vcap-textarea"),r=(a=n==null?void 0:n.value)==null?void 0:a.trim();if(!r){e();return}chrome.runtime.sendMessage({type:x.NOTE_ADDED,payload:{text:r,timestamp:Date.now()}}).catch(()=>{}),e()}t.getElementById("vcap-close-btn").addEventListener("click",e),t.getElementById("vcap-cancel-btn").addEventListener("click",e),t.getElementById("vcap-save-btn").addEventListener("click",o),t.getElementById("vcap-textarea").addEventListener("keydown",n=>{n.key==="Enter"&&!n.shiftKey&&(n.preventDefault(),o()),n.key==="Escape"&&(n.preventDefault(),e())}),t.getElementById("vcap-overlay").addEventListener("click",n=>{n.target===t.getElementById("vcap-overlay")&&e()}),document.body.appendChild(E),requestAnimationFrame(()=>{var n;(n=t.getElementById("vcap-textarea"))==null||n.focus()})}chrome.runtime.onMessage.addListener((t,e,o)=>{if(t.type===x.START_RECORDING&&(V(),Q()),t.type===x.STOP_RECORDING){rt(),ft();const{steps:n,consoleErrors:r}=P();return o({steps:n,consoleErrors:r}),!0}t.type===x.SHOW_NOTE_DIALOG&&mt()}),chrome.runtime.sendMessage({type:x.QUERY_STATUS},t=>{chrome.runtime.lastError||(t==null?void 0:t.status)==="recording"&&(V(),Q())}),window.addEventListener("beforeunload",()=>{const{steps:t,consoleErrors:e}=P();if(!(t.length===0&&e.length===0))try{chrome.runtime.sendMessage({type:x.FLUSH_EVENTS,payload:{steps:t,consoleErrors:e}})}catch{}})})();
