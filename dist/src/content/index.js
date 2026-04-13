(function(){"use strict";const y={START_RECORDING:"START_RECORDING",STOP_RECORDING:"STOP_RECORDING",START_CAPTURE:"START_CAPTURE",STOP_CAPTURE:"STOP_CAPTURE",CAPTURE_DONE:"CAPTURE_DONE",CAPTURE_FAILED:"CAPTURE_FAILED",CAPTURE_ERROR:"CAPTURE_ERROR",DOM_EVENT_BATCH:"DOM_EVENT_BATCH",DOM_EVENT:"DOM_EVENT",CONSOLE_ERROR:"CONSOLE_ERROR",NOTE_ADDED:"NOTE_ADDED",NEW_RECORDING:"NEW_RECORDING",QUERY_STATUS:"QUERY_STATUS",SHOW_NOTE_DIALOG:"SHOW_NOTE_DIALOG",START_COUNTDOWN:"START_COUNTDOWN",CANCEL_COUNTDOWN:"CANCEL_COUNTDOWN",START_RECORDING_REQUEST:"START_RECORDING_REQUEST",STOP_RECORDING_REQUEST:"STOP_RECORDING_REQUEST",TAKE_SCREENSHOT:"TAKE_SCREENSHOT",EXPORT_SESSION:"EXPORT_SESSION",FLUSH_EVENTS:"FLUSH_EVENTS"},C=EventTarget.prototype.addEventListener.bind(document),_=EventTarget.prototype.removeEventListener.bind(document);let m=!1,M=null,N=[],O=[],A=0,L=null,D=null;const X=5e3,k={},I={},U={},q=50,J=50,Z=300,tt=400;let S={},x=null,R={};const et=150;let $=!1;function nt(){if($)return;$=!0;const t=document.createElement("script");t.src=chrome.runtime.getURL("src/content/page-console-capture.js"),(document.head||document.documentElement).appendChild(t),t.onload=()=>t.remove()}function F(t){var e;t.source===window&&(!((e=t.data)!=null&&e.__vcap__)||t.data.type!=="CONSOLE_ERROR"||m&&O.push({timestamp:W(),message:t.data.message,source:"console"}))}function G(){m||(m=!0,M=Date.now(),N=[],O=[],A=0,C.call(document,"click",K,!0),C.call(document,"change",V,!0),C.call(document,"input",H,!0),C.call(document,"submit",B,!0),C.call(document,"keydown",z,!0),L=st(),ct(),nt(),window.addEventListener("message",F),D=setInterval(()=>{const t=P();if(t.steps.length>0||t.consoleErrors.length>0)try{chrome.runtime.sendMessage({type:y.FLUSH_EVENTS,payload:{steps:t.steps,consoleErrors:t.consoleErrors}})}catch{}},X))}function ot(){m&&(m=!1,_.call(document,"click",K,!0),_.call(document,"change",V,!0),_.call(document,"input",H,!0),_.call(document,"submit",B,!0),_.call(document,"keydown",z,!0),L&&(L(),L=null),window.removeEventListener("message",F),D&&(clearInterval(D),D=null),Object.values(S).forEach(({timer:t,flush:e})=>{clearTimeout(t);try{e()}catch{}}),S={},Object.values(R).forEach(clearTimeout),R={},lt())}function P(){const t={steps:[...N],consoleErrors:[...O]};return N=[],O=[],A=0,t}function K(t){var s;const e=t.target,o=(s=e.tagName)==null?void 0:s.toLowerCase(),n=(e.type||"").toLowerCase();if(o==="input"&&(n==="checkbox"||n==="radio")||o==="select")return;const a=w(e),r=Date.now();if(k[a]&&r-k[a]<q)return;k[a]=r;const l=at(e);g({type:"click",target:a,value:l,url:window.location.href})}function at(t){var r,l,s,d,c,p,u;if(!t)return;const e=(r=t.getAttribute)==null?void 0:r.call(t,"role");if(e==="option"||e==="menuitem"||e==="menuitemradio"||e==="menuitemcheckbox"||e==="treeitem"){const i=(t.innerText||t.textContent||"").trim().replace(/\s+/g," ");return i?i.slice(0,100):void 0}if(((l=t.closest)==null?void 0:l.call(t,"[role=listbox]"))||((s=t.closest)==null?void 0:s.call(t,"[role=menu]"))||((d=t.closest)==null?void 0:d.call(t,"[role=menubar]"))||((c=t.closest)==null?void 0:c.call(t,"[role=tree]"))){const i=(t.innerText||t.textContent||"").trim().replace(/\s+/g," ");return i?i.slice(0,100):void 0}if(((p=t.tagName)==null?void 0:p.toLowerCase())==="li"){const i=(t.innerText||t.textContent||"").trim().replace(/\s+/g," ");return i?i.slice(0,100):void 0}const a=(u=t.tagName)==null?void 0:u.toLowerCase();if(a==="button"||a==="a"){const i=(t.innerText||t.textContent||"").trim().replace(/\s+/g," ");return i?i.slice(0,100):void 0}}function V(t){var c,p,u,i,v;const e=t.target;if(!e)return;const o=(c=e.tagName)==null?void 0:c.toLowerCase(),n=(e.type||"").toLowerCase(),a=w(e),r=Date.now();if(U[a]&&r-U[a]<J)return;U[a]=r;let l="change",s;if(o==="input"&&n==="checkbox")l="checkbox",s=e.checked?"✓ checked":"✗ unchecked";else if(o==="input"&&n==="radio")l="radio",s=e.value||((i=(u=(p=e.labels)==null?void 0:p[0])==null?void 0:u.textContent)==null?void 0:i.trim())||"selected";else if(o==="select"){l="select";const h=e.options[e.selectedIndex];s=((v=h==null?void 0:h.text)==null?void 0:v.trim())||e.value}else if(o==="input"&&n==="file"){l="file";const h=Array.from(e.files||[]).map(f=>f.name);s=h.length>0?h.join(", "):"no file"}else o==="input"&&n==="range"?(l="range",s=e.value):s=Y(e);const d=j(e);g({type:l,target:a,value:s,labelText:d,url:window.location.href})}function H(t){var s;const e=t.target,o=(s=e.tagName)==null?void 0:s.toLowerCase(),n=(e.type||"").toLowerCase();if(o==="input"&&!new Set(["","text","search","email","url","tel","number","password","textarea"]).has(n)||o!=="input"&&o!=="textarea")return;const r=w(e);S[r]&&clearTimeout(S[r].timer);const l=()=>{const d=Y(e),c=j(e);g({type:"input",target:r,value:d,labelText:c,url:window.location.href}),delete S[r]};S[r]={timer:setTimeout(l,tt),flush:l}}function B(t){const e=t.target,o=w(e);g({type:"submit",target:o,url:window.location.href})}const rt=new Set(["Enter","Escape","Tab","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12"]),it=new Set(["s","z","y","f","a","c","v","x","/"]);function z(t){var v;const e=t.target,o=(v=e.tagName)==null?void 0:v.toLowerCase(),n=(e.type||"").toLowerCase(),a=t.key,r=t.ctrlKey||t.metaKey||t.altKey;if((o==="input"&&!["checkbox","radio","range","file","submit","button"].includes(n)||o==="textarea")&&a!=="Enter"&&a!=="Escape")return;const s=rt.has(a),d=r&&it.has(a.toLowerCase());if(!s&&!d)return;const c=w(e),p=r?`${t.ctrlKey?"Ctrl+":""}${t.metaKey?"Cmd+":""}${t.altKey?"Alt+":""}${a}`:a,u=Date.now(),i=`${c}::${p}`;I[i]&&u-I[i]<Z||(I[i]=u,g({type:"keydown",target:c,value:p,url:window.location.href}))}function st(){const t=history.pushState.bind(history),e=history.replaceState.bind(history);history.pushState=function(...n){t(...n),m&&g({type:"navigate",target:"pushState",value:String(n[2]||window.location.href),url:window.location.href})},history.replaceState=function(...n){e(...n),m&&g({type:"navigate",target:"replaceState",value:String(n[2]||window.location.href),url:window.location.href})};const o=()=>{m&&g({type:"navigate",target:"back/forward",value:window.location.href,url:window.location.href})};return window.addEventListener("popstate",o),()=>{history.pushState=t,history.replaceState=e,window.removeEventListener("popstate",o)}}function ct(){if(!x){x=new MutationObserver(t=>{for(const e of t){if(e.type!=="attributes")continue;const o=e.target;if(!o||o.nodeType!==Node.ELEMENT_NODE)continue;const n=e.attributeName,a=o.getAttribute(n),r=e.oldValue;if(a===r)continue;const l=`${w(o)}::${n}`;if(R[l])continue;const s=o,d=n,c=a;R[l]=setTimeout(()=>{if(delete R[l],!m)return;const p=w(s);let u,i;if(d==="aria-checked")u=s.getAttribute("role")==="switch"?"switch":"checkbox",i=c==="true"?"✓ on":c==="false"?"✗ off":c;else if(d==="aria-selected"){if(c!=="true")return;u="select",i=ut(s)}u&&g({type:u,target:p,value:i,url:window.location.href})},et)}});try{x.observe(document.body,{subtree:!0,attributes:!0,attributeOldValue:!0,attributeFilter:["aria-checked","aria-selected"]})}catch{x=null}}}function lt(){x&&(x.disconnect(),x=null)}function ut(t){if(!t)return null;const e=t.getAttribute("aria-label");if(e)return e.trim().slice(0,100);const o=(t.innerText||t.textContent||"").trim().replace(/\s+/g," ");return o?o.slice(0,100):null}function j(t){var l,s,d,c,p,u,i,v,h;if(!t)return null;if(t.labels&&t.labels.length>0){const f=(l=t.labels[0].textContent)==null?void 0:l.trim().replace(/\s+/g," ");if(f)return f.slice(0,80)}const e=(s=t.getAttribute)==null?void 0:s.call(t,"aria-label");if(e)return e.trim().slice(0,80);const o=(d=t.getAttribute)==null?void 0:d.call(t,"aria-labelledby");if(o){const f=document.getElementById(o),T=(c=f==null?void 0:f.textContent)==null?void 0:c.trim().replace(/\s+/g," ");if(T)return T.slice(0,80)}let n=t.parentElement,a=0;for(;n&&a<5;){if(((p=n.tagName)==null?void 0:p.toLowerCase())==="label"){const T=(u=n.textContent)==null?void 0:u.trim().replace(/\s+/g," ");if(T)return T.slice(0,80)}let f=n.previousElementSibling;for(;f;){if(((i=f.tagName)==null?void 0:i.toLowerCase())==="label"){const T=(v=f.textContent)==null?void 0:v.trim().replace(/\s+/g," ");if(T)return T.slice(0,80)}f=f.previousElementSibling}n=n.parentElement,a++}const r=(h=t.getAttribute)==null?void 0:h.call(t,"placeholder");return r?r.trim().slice(0,80):null}function g(t){m&&(A++,N.push({index:A,timestamp:W(),...t}))}const dt=new Set(["svg","path","img","i","span","em","strong","b","small","use","circle","rect","line","polyline","polygon","g","symbol","ellipse","text","tspan","defs","clippath","mask","lineargradient","radialgradient","stop","fecomposite"]);function w(t){var a,r,l,s,d;if(!t||!t.tagName)return"unknown";let e=t;for(;e&&e!==document.body;){const c=e.tagName.toLowerCase(),p=((a=e.getAttribute)==null?void 0:a.call(e,"data-testid"))||((r=e.getAttribute)==null?void 0:r.call(e,"data-test-id"));if(p)return`${c}[testid=${p.slice(0,40)}]`;if(e.id)return`${c}#${e.id}`;const u=((l=e.getAttribute)==null?void 0:l.call(e,"aria-label"))||((s=e.getAttribute)==null?void 0:s.call(e,"name"))||e.title||((d=e.getAttribute)==null?void 0:d.call(e,"placeholder"));if(u)return`${c}[${u.slice(0,40)}]`;const i=(e.innerText||e.textContent||"").trim().replace(/\s+/g," ");if(i&&i.length>0)return i.length<=30?`${c} ("${i}")`:`${c} ("${i.slice(0,30)}...")`;if(dt.has(c))e=e.parentElement;else break}const o=t.tagName.toLowerCase(),n=Array.from(t.classList).filter(c=>c.length<=20).slice(0,2).join(".");return n?`${o}.${n}`:o}function Y(t){var r;if(!t)return;const e=(t.type||"").toLowerCase(),o=(t.name||t.id||((r=t.getAttribute)==null?void 0:r.call(t,"aria-label"))||"").toLowerCase();if(e==="password"||/password|secret|token|credit|card|cvv|ssn|otp|pin/i.test(o))return"[REDACTED]";const a=t.value;if(!(a==null||a===""))return String(a).slice(0,200)}function W(){const t=Math.floor((Date.now()-M)/1e3),e=String(Math.floor(t/60)).padStart(2,"0"),o=String(t%60).padStart(2,"0");return`${e}:${o}`}let E=null;function Q(){if(E)return;const t=document.title?` • ${document.title.slice(0,20)}`:"";E=document.createElement("div"),E.id="vcap-host";const e=E.attachShadow({mode:"closed"});e.innerHTML=`
    <style>
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
        50% { box-shadow: 0 4px 24px rgba(250,82,15,.8); }
      }
    </style>
    <div id="vcap-badge">REC${t}</div>
  `,document.body.appendChild(E)}function pt(){E==null||E.remove(),E=null}let b=null;function ft(){if(b)return;b=document.createElement("div"),b.id="vcap-note-dialog-host";const t=b.attachShadow({mode:"closed"});t.innerHTML=`
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
  `;function e(){b==null||b.remove(),b=null}function o(){var r;const n=t.getElementById("vcap-textarea"),a=(r=n==null?void 0:n.value)==null?void 0:r.trim();if(!a){e();return}chrome.runtime.sendMessage({type:y.NOTE_ADDED,payload:{text:a,timestamp:Date.now()}}).catch(()=>{}),e()}t.getElementById("vcap-close-btn").addEventListener("click",e),t.getElementById("vcap-cancel-btn").addEventListener("click",e),t.getElementById("vcap-save-btn").addEventListener("click",o),t.getElementById("vcap-textarea").addEventListener("keydown",n=>{n.key==="Enter"&&!n.shiftKey&&(n.preventDefault(),o()),n.key==="Escape"&&(n.preventDefault(),e())}),t.getElementById("vcap-overlay").addEventListener("click",n=>{n.target===t.getElementById("vcap-overlay")&&e()}),document.body.appendChild(b),requestAnimationFrame(()=>{var n;(n=t.getElementById("vcap-textarea"))==null||n.focus()})}chrome.runtime.onMessage.addListener((t,e,o)=>{if(t.type===y.START_RECORDING&&(G(),Q()),t.type===y.STOP_RECORDING){ot(),pt();const{steps:n,consoleErrors:a}=P();return o({steps:n,consoleErrors:a}),!0}t.type===y.SHOW_NOTE_DIALOG&&ft()}),chrome.runtime.sendMessage({type:y.QUERY_STATUS},t=>{chrome.runtime.lastError||(t==null?void 0:t.status)==="recording"&&(G(),Q())}),window.addEventListener("beforeunload",()=>{const{steps:t,consoleErrors:e}=P();if(!(t.length===0&&e.length===0))try{chrome.runtime.sendMessage({type:y.FLUSH_EVENTS,payload:{steps:t,consoleErrors:e}})}catch{}})})();
