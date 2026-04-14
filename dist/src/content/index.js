(function(){"use strict";const x={START_RECORDING:"START_RECORDING",STOP_RECORDING:"STOP_RECORDING",START_CAPTURE:"START_CAPTURE",STOP_CAPTURE:"STOP_CAPTURE",CAPTURE_DONE:"CAPTURE_DONE",CAPTURE_FAILED:"CAPTURE_FAILED",CAPTURE_ERROR:"CAPTURE_ERROR",DOM_EVENT_BATCH:"DOM_EVENT_BATCH",DOM_EVENT:"DOM_EVENT",CONSOLE_ERROR:"CONSOLE_ERROR",NOTE_ADDED:"NOTE_ADDED",NEW_RECORDING:"NEW_RECORDING",QUERY_STATUS:"QUERY_STATUS",SHOW_NOTE_DIALOG:"SHOW_NOTE_DIALOG",START_COUNTDOWN:"START_COUNTDOWN",CANCEL_COUNTDOWN:"CANCEL_COUNTDOWN",START_RECORDING_REQUEST:"START_RECORDING_REQUEST",STOP_RECORDING_REQUEST:"STOP_RECORDING_REQUEST",TAKE_SCREENSHOT:"TAKE_SCREENSHOT",EXPORT_SESSION:"EXPORT_SESSION",FLUSH_EVENTS:"FLUSH_EVENTS"},rt={SYNC_INTERVAL_MS:5e3},_=EventTarget.prototype.addEventListener.bind(document),N=EventTarget.prototype.removeEventListener.bind(document);let b=!1,B=null,A=[],O=[],U=0,L=null,D=null;const it=rt.SYNC_INTERVAL_MS,P={},M={},$={},at=50,st=50,ct=300,lt=400;let S={},y=null,R={};const ut=150;let G=!1;function dt(){if(G)return;G=!0;const t=document.createElement("script");t.src=chrome.runtime.getURL("src/content/page-console-capture.js"),(document.head||document.documentElement).appendChild(t),t.onload=()=>t.remove()}function H(t){var e;t.source===window&&(!((e=t.data)!=null&&e.__vcap__)||t.data.type!=="CONSOLE_ERROR"||b&&O.push({timestamp:q(),message:t.data.message,source:"console"}))}function K(){b||(b=!0,B=Date.now(),A=[],O=[],U=0,_.call(document,"click",Y,!0),_.call(document,"change",z,!0),_.call(document,"input",j,!0),_.call(document,"submit",W,!0),_.call(document,"keydown",Q,!0),L=bt(),Et(),dt(),window.addEventListener("message",H),D=setInterval(()=>{const t=F();if(t.steps.length>0||t.consoleErrors.length>0)try{chrome.runtime.sendMessage({type:x.FLUSH_EVENTS,payload:{steps:t.steps,consoleErrors:t.consoleErrors}})}catch{}},it))}function pt(){b&&(b=!1,N.call(document,"click",Y,!0),N.call(document,"change",z,!0),N.call(document,"input",j,!0),N.call(document,"submit",W,!0),N.call(document,"keydown",Q,!0),L&&(L(),L=null),window.removeEventListener("message",H),D&&(clearInterval(D),D=null),Object.values(S).forEach(({timer:t,flush:e})=>{clearTimeout(t);try{e()}catch{}}),S={},Object.values(R).forEach(clearTimeout),R={},vt())}function F(){const t={steps:[...A],consoleErrors:[...O]};return A=[],O=[],t}function Y(t){var u;const e=t.target;if(!e)return;const n=(u=e.tagName)==null?void 0:u.toLowerCase(),o=(e.type||"").toLowerCase();if(n==="input"&&(o==="checkbox"||o==="radio")||n==="select")return;const r=w(e),i=Date.now();if(P[r]&&i-P[r]<at)return;P[r]=i;const l=ft(e),s=V(e);E({type:"click",target:r,value:l,labelText:s,url:window.location.href})}function ft(t){var i,l,s,u,c,f,d;if(!t)return;const e=(i=t.getAttribute)==null?void 0:i.call(t,"role");if(e==="option"||e==="menuitem"||e==="menuitemradio"||e==="menuitemcheckbox"||e==="treeitem"){const a=(t.innerText||t.textContent||"").trim().replace(/\s+/g," ");return a?a.slice(0,100):void 0}if(((l=t.closest)==null?void 0:l.call(t,"[role=listbox]"))||((s=t.closest)==null?void 0:s.call(t,"[role=menu]"))||((u=t.closest)==null?void 0:u.call(t,"[role=menubar]"))||((c=t.closest)==null?void 0:c.call(t,"[role=tree]"))){const a=(t.innerText||t.textContent||"").trim().replace(/\s+/g," ");return a?a.slice(0,100):void 0}if(((f=t.tagName)==null?void 0:f.toLowerCase())==="li"){const a=(t.innerText||t.textContent||"").trim().replace(/\s+/g," ");return a?a.slice(0,100):void 0}const r=(d=t.tagName)==null?void 0:d.toLowerCase();if(r==="button"||r==="a"){const a=(t.innerText||t.textContent||"").trim().replace(/\s+/g," ");return a?a.slice(0,100):void 0}}function z(t){var c,f,d,a,h;const e=t.target;if(!e)return;const n=(c=e.tagName)==null?void 0:c.toLowerCase(),o=(e.type||"").toLowerCase(),r=w(e),i=Date.now();if($[r]&&i-$[r]<st)return;$[r]=i;let l="change",s;if(n==="input"&&o==="checkbox")l="checkbox",s=e.checked?"✓ checked":"✗ unchecked";else if(n==="input"&&o==="radio")l="radio",s=e.value||((a=(d=(f=e.labels)==null?void 0:f[0])==null?void 0:d.textContent)==null?void 0:a.trim())||"selected";else if(n==="select"){l="select";const T=e.options[e.selectedIndex];s=((h=T==null?void 0:T.text)==null?void 0:h.trim())||e.value}else if(n==="input"&&o==="file"){l="file";const T=Array.from(e.files||[]).map(k=>k.name);s=T.length>0?T.join(", "):"no file"}else n==="input"&&o==="range"?(l="range",s=e.value):s=X(e);const u=V(e);E({type:l,target:r,value:s,labelText:u,url:window.location.href})}function j(t){var s;const e=t.target,n=(s=e.tagName)==null?void 0:s.toLowerCase(),o=(e.type||"").toLowerCase();if(n==="input"&&!new Set(["","text","search","email","url","tel","number","password","textarea"]).has(o)||n!=="input"&&n!=="textarea")return;const i=w(e);S[i]&&clearTimeout(S[i].timer);const l=()=>{const u=X(e),c=V(e);E({type:"input",target:i,value:u,labelText:c,url:window.location.href}),delete S[i]};S[i]={timer:setTimeout(l,lt),flush:l}}function W(t){const e=t.target,n=w(e);E({type:"submit",target:n,url:window.location.href})}const mt=new Set(["Enter","Escape","Tab","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12"]),gt=new Set(["s","z","y","f","a","c","v","x","/"]);function Q(t){var h;const e=t.target,n=(h=e.tagName)==null?void 0:h.toLowerCase(),o=(e.type||"").toLowerCase(),r=t.key,i=t.ctrlKey||t.metaKey||t.altKey;if((n==="input"&&!["checkbox","radio","range","file","submit","button"].includes(o)||n==="textarea")&&r!=="Enter"&&r!=="Escape")return;const s=mt.has(r),u=i&&gt.has(r.toLowerCase());if(!s&&!u)return;const c=w(e),f=i?`${t.ctrlKey?"Ctrl+":""}${t.metaKey?"Cmd+":""}${t.altKey?"Alt+":""}${r}`:r,d=Date.now(),a=`${c}::${f}`;M[a]&&d-M[a]<ct||(M[a]=d,E({type:"keydown",target:c,value:f,url:window.location.href}))}function bt(){const t=history.pushState.bind(history),e=history.replaceState.bind(history);history.pushState=function(...o){t(...o),b&&E({type:"navigate",target:"pushState",value:String(o[2]||window.location.href),url:window.location.href})},history.replaceState=function(...o){e(...o),b&&E({type:"navigate",target:"replaceState",value:String(o[2]||window.location.href),url:window.location.href})};const n=()=>{b&&E({type:"navigate",target:"back/forward",value:window.location.href,url:window.location.href})};return window.addEventListener("popstate",n),()=>{history.pushState=t,history.replaceState=e,window.removeEventListener("popstate",n)}}function Et(){if(!y){y=new MutationObserver(t=>{for(const e of t){if(e.type!=="attributes")continue;const n=e.target;if(!n||n.nodeType!==Node.ELEMENT_NODE)continue;const o=e.attributeName,r=n.getAttribute(o),i=e.oldValue;if(r===i)continue;const l=`${w(n)}::${o}`;if(R[l])continue;const s=n,u=o,c=r;R[l]=setTimeout(()=>{if(delete R[l],!b)return;const f=w(s);let d,a;if(u==="aria-checked")d=s.getAttribute("role")==="switch"?"switch":"checkbox",a=c==="true"?"✓ on":c==="false"?"✗ off":c;else if(u==="aria-selected"){if(c!=="true")return;d="select",a=ht(s)}d&&E({type:d,target:f,value:a,url:window.location.href})},ut)}});try{y.observe(document.body,{subtree:!0,attributes:!0,attributeOldValue:!0,attributeFilter:["aria-checked","aria-selected"]})}catch{y=null}}}function vt(){y&&(y.disconnect(),y=null)}function ht(t){if(!t)return null;const e=t.getAttribute("aria-label");if(e)return e.trim().slice(0,100);const n=(t.innerText||t.textContent||"").trim().replace(/\s+/g," ");return n?n.slice(0,100):null}function V(t){var c,f,d,a,h,T,k,Z,tt,et,nt,ot;if(!t)return null;if(t.labels&&t.labels.length>0){const p=(c=t.labels[0].textContent)==null?void 0:c.trim().replace(/\s+/g," ");if(p)return p.slice(0,80)}const e=(f=t.getAttribute)==null?void 0:f.call(t,"aria-label");if(e)return e.trim().slice(0,80);const n=(d=t.getAttribute)==null?void 0:d.call(t,"aria-labelledby");if(n){const p=n.split(/\s+/).find(Boolean),m=p?document.getElementById(p):null,C=(a=m==null?void 0:m.textContent)==null?void 0:a.trim().replace(/\s+/g," ");if(C)return C.slice(0,80)}let o=t.parentElement,r=0;for(;o&&r<8;){if(((h=o.tagName)==null?void 0:h.toLowerCase())==="label"){const m=(T=o.textContent)==null?void 0:T.trim().replace(/\s+/g," ");if(m)return m.slice(0,80)}let p=o.previousElementSibling;for(;p;){if(((k=p.tagName)==null?void 0:k.toLowerCase())==="label"){const m=(Z=p.textContent)==null?void 0:Z.trim().replace(/\s+/g," ");if(m)return m.slice(0,80)}p=p.previousElementSibling}o=o.parentElement,r++}const i=t.previousElementSibling;if(i&&["SPAN","DIV","P","STRONG","B"].includes(i.tagName)){const p=(tt=i.textContent)==null?void 0:tt.trim().replace(/\s+/g," ");if(p&&p.length>=2)return p.slice(0,80)}const l=t.parentElement;if(l)for(const p of l.children){if(p===t)break;const m=p.tagName;if(!m||["SCRIPT","STYLE"].includes(m))continue;const C=(et=p.textContent)==null?void 0:et.trim().replace(/\s+/g," ");if(C&&C.length>=2)return C.slice(0,80)}const s=(nt=t.getAttribute)==null?void 0:nt.call(t,"title");if(s)return s.trim().slice(0,80);const u=(ot=t.getAttribute)==null?void 0:ot.call(t,"placeholder");return u?u.trim().slice(0,80):null}function E(t){b&&(U++,A.push({index:U,timestamp:q(),...t}))}const Tt=new Set(["svg","path","img","i","span","em","strong","b","small","use","circle","rect","line","polyline","polygon","g","symbol","ellipse","text","tspan","defs","clippath","mask","lineargradient","radialgradient","stop","fecomposite"]);function w(t){var r,i,l,s,u;if(!t||!t.tagName)return"unknown";let e=t;for(;e&&e!==document.body;){const c=e.tagName.toLowerCase(),f=((r=e.getAttribute)==null?void 0:r.call(e,"data-testid"))||((i=e.getAttribute)==null?void 0:i.call(e,"data-test-id"));if(f)return`${c}[testid=${f.slice(0,40)}]`;if(e.id)return`${c}#${e.id}`;const d=((l=e.getAttribute)==null?void 0:l.call(e,"aria-label"))||((s=e.getAttribute)==null?void 0:s.call(e,"name"))||e.title||((u=e.getAttribute)==null?void 0:u.call(e,"placeholder"));if(d)return`${c}[${d.slice(0,40)}]`;const a=(e.innerText||e.textContent||"").trim().replace(/\s+/g," ");if(a&&a.length>0)return a.length<=30?`${c} ("${a}")`:`${c} ("${a.slice(0,30)}...")`;if(Tt.has(c))e=e.parentElement;else break}const n=t.tagName.toLowerCase(),o=Array.from(t.classList).filter(c=>c.length<=20).slice(0,2).join(".");return o?`${n}.${o}`:n}function X(t){var i;if(!t)return;const e=(t.type||"").toLowerCase(),n=(t.name||t.id||((i=t.getAttribute)==null?void 0:i.call(t,"aria-label"))||"").toLowerCase();if(e==="password"||/password|secret|token|credit|card|cvv|ssn|otp|pin/i.test(n))return"[REDACTED]";const r=t.value;if(!(r==null||r===""))return String(r).slice(0,200)}function q(){const t=Math.floor((Date.now()-B)/1e3),e=String(Math.floor(t/60)).padStart(2,"0"),n=String(t%60).padStart(2,"0");return`${e}:${n}`}let v=null;function J(){if(v)return;const t=document.title?` • ${document.title.slice(0,20)}`:"";v=document.createElement("div"),v.id="vcap-host";const e=v.attachShadow({mode:"closed"});e.innerHTML=`
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
  `,document.body.appendChild(v)}function xt(){v==null||v.remove(),v=null}let g=null,I=[];function yt(){I=[];const t=['[role="presentation"]','[role="dialog"]',".MuiModal-root",".modal.show",'[aria-modal="true"]'];document.querySelectorAll(t.join(", ")).forEach(n=>{!n||n===g||n.contains(g)||n.tagName==="HTML"||n.tagName==="BODY"||n.hasAttribute("inert")||(n.setAttribute("inert",""),I.push(n))})}function wt(){I.forEach(t=>{t!=null&&t.isConnected&&t.removeAttribute("inert")}),I=[]}function St(){if(g)return;g=document.createElement("div"),g.id="vcap-note-dialog-host";const t=g.attachShadow({mode:"closed"});t.innerHTML=`
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
  `;function e(){wt(),g==null||g.remove(),g=null}function n(){var i;const o=t.getElementById("vcap-textarea"),r=(i=o==null?void 0:o.value)==null?void 0:i.trim();if(!r){e();return}chrome.runtime.sendMessage({type:x.NOTE_ADDED,payload:{text:r,timestamp:Date.now()}}).catch(()=>{}),e()}t.getElementById("vcap-close-btn").addEventListener("click",e),t.getElementById("vcap-cancel-btn").addEventListener("click",e),t.getElementById("vcap-save-btn").addEventListener("click",n),t.getElementById("vcap-textarea").addEventListener("keydown",o=>{o.key==="Enter"&&!o.shiftKey&&(o.preventDefault(),n()),o.key==="Escape"&&(o.preventDefault(),e())}),t.getElementById("vcap-overlay").addEventListener("click",o=>{o.target===t.getElementById("vcap-overlay")&&e()}),document.body.appendChild(g),yt(),requestAnimationFrame(()=>{var o;(o=t.getElementById("vcap-textarea"))==null||o.focus()})}chrome.runtime.onMessage.addListener((t,e,n)=>{if(t.type===x.START_RECORDING&&(K(),J()),t.type===x.STOP_RECORDING){pt(),xt();const{steps:o,consoleErrors:r}=F();return n({steps:o,consoleErrors:r}),!0}t.type===x.SHOW_NOTE_DIALOG&&St()}),chrome.runtime.sendMessage({type:x.QUERY_STATUS},t=>{chrome.runtime.lastError||(t==null?void 0:t.status)==="recording"&&(K(),J())}),window.addEventListener("beforeunload",()=>{const{steps:t,consoleErrors:e}=F();if(!(t.length===0&&e.length===0))try{chrome.runtime.sendMessage({type:x.FLUSH_EVENTS,payload:{steps:t,consoleErrors:e}})}catch{}})})();
