/* CMB AI — Batch 2 workspace layer
   Ten isolated UI/workspace improvements. No framework or build step required.
*/
(()=>{
  "use strict";
  if(window.__cmbBatch2Loaded)return;
  window.__cmbBatch2Loaded=true;

  const $=id=>document.getElementById(id);
  const esc=s=>String(s??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const toast=msg=>{const t=$("toast");if(!t)return;t.textContent=msg;t.classList.add("show");clearTimeout(window.__cmbB2Toast);window.__cmbB2Toast=setTimeout(()=>t.classList.remove("show"),2200)};
  const event=(title,detail,icon="✦")=>window.cmbEvent?.(title,detail,icon);
  const editor=()=>$("code");

  const style=document.createElement("style");
  style.textContent=`
  .cmb-b2-panel{border:1px solid var(--line);background:var(--panel);border-radius:12px;padding:10px;margin:0 0 12px}
  .cmb-b2-row{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
  .cmb-b2-row+.cmb-b2-row{margin-top:8px}
  .cmb-b2-label{font-size:10px;color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.06em}
  .cmb-b2-select,.cmb-b2-number{background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:7px 9px}
  .cmb-b2-number{width:70px}
  .cmb-b2-status{margin-left:auto;color:var(--muted);font-size:10px}
  .cmb-b2-recent{display:flex;gap:6px;overflow:auto;padding-top:5px}
  .cmb-b2-chip{white-space:nowrap;border:1px solid var(--line);background:var(--panel2);color:var(--text);border-radius:999px;padding:6px 9px;cursor:pointer;font-size:10px}
  .cmb-b2-modal{position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.62);backdrop-filter:blur(8px);display:grid;place-items:center;padding:20px}
  .cmb-b2-modal.hidden{display:none}
  .cmb-b2-dialog{width:min(720px,94vw);max-height:82vh;overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:16px;box-shadow:0 30px 90px rgba(0,0,0,.55);padding:18px}
  .cmb-b2-dialog h3{margin:0 0 10px}.cmb-b2-dialog p{color:var(--muted);font-size:12px}
  .cmb-b2-help{display:grid;grid-template-columns:1fr auto;gap:7px;font-size:11px}.cmb-b2-help span{padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--panel2)}
  .cmb-b2-notice{position:fixed;right:18px;bottom:18px;z-index:85;width:min(360px,90vw);background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:12px;box-shadow:0 20px 60px rgba(0,0,0,.45)}
  .cmb-b2-notice.hidden{display:none}.cmb-b2-notice strong{display:block}.cmb-b2-notice small{display:block;color:var(--muted);margin-top:3px}
  .cmb-b2-editor-fullscreen{position:fixed!important;inset:12px!important;z-index:88!important;margin:0!important;width:auto!important;height:auto!important;background:var(--panel)!important;padding:12px!important;border:1px solid var(--line)!important;border-radius:12px!important}
  .cmb-b2-editor-fullscreen textarea,.cmb-b2-editor-fullscreen #code{height:calc(100vh - 90px)!important;min-height:calc(100vh - 90px)!important}
  body.cmb-b2-compact *{--cmb-b2-gap:4px}.cmb-b2-compact .card,.cmb-b2-compact .panel,.cmb-b2-compact section{gap:var(--cmb-b2-gap)!important}
  `;
  document.head.appendChild(style);

  // 1. Editor font-size controls
  function fontControls(){
    const ed=editor(); if(!ed||$("cmbB2FontSize"))return;
    const panel=document.createElement("div");panel.className="cmb-b2-panel";panel.id="cmbB2Tools";
    panel.innerHTML='<div class="cmb-b2-row"><span class="cmb-b2-label">Editor</span><button class="small" id="cmbB2FontDown">A−</button><input id="cmbB2FontSize" class="cmb-b2-number" type="number" min="10" max="28" value="14" aria-label="Editor font size"><button class="small" id="cmbB2FontUp">A+</button><button class="small" id="cmbB2Wrap">↔ Wrap: on</button><button class="small" id="cmbB2Full">⛶ Fullscreen</button><span id="cmbB2ToolStatus" class="cmb-b2-status">Workspace tools ready</span></div>';
    ed.parentNode?.parentNode?.insertBefore(panel,ed.parentNode);
    const stored=Number(localStorage.getItem("cmbB2FontSize")||14);
    const applySize=n=>{const v=Math.max(10,Math.min(28,Number(n)||14));ed.style.fontSize=v+"px";$("cmbB2FontSize").value=v;localStorage.setItem("cmbB2FontSize",v)};
    applySize(stored);
    $("cmbB2FontDown").onclick=()=>applySize(Number($("cmbB2FontSize").value)-1);
    $("cmbB2FontUp").onclick=()=>applySize(Number($("cmbB2FontSize").value)+1);
    $("cmbB2FontSize").onchange=()=>applySize($("cmbB2FontSize").value);
    $("cmbB2Wrap").onclick=()=>{const on=ed.style.whiteSpace!=="pre";ed.style.whiteSpace=on?"pre-wrap":"pre";$("cmbB2Wrap").textContent="↔ Wrap: "+(on?"on":"off");localStorage.setItem("cmbB2Wrap",on?"on":"off")};
    if(localStorage.getItem("cmbB2Wrap")==="off"){$("cmbB2Wrap").click()}
    $("cmbB2Full").onclick=toggleFullscreen;
  }

  // 2. Editor fullscreen
  function toggleFullscreen(){
    const ed=editor();if(!ed)return;
    const box=ed.closest(".editor,.code-editor,.panel,.card")||ed.parentElement;
    if(!box)return;
    const on=box.classList.toggle("cmb-b2-editor-fullscreen");
    document.body.style.overflow=on?"hidden":"";
    const b=$("cmbB2Full");if(b)b.textContent=on?"⛶ Exit fullscreen":"⛶ Fullscreen";
    toast(on?"Editor fullscreen on":"Editor fullscreen off");event(on?"Editor fullscreen enabled":"Editor fullscreen disabled","The code editor view was resized for focused work.","⛶");
  }

  // 3. Recent editor files
  function recentFiles(){
    const title=$("editorTitle");if(!title)return;
    const key="cmbB2RecentFiles";
    const read=()=>{try{return JSON.parse(localStorage.getItem(key)||"[]")}catch{return[]}};
    const write=a=>localStorage.setItem(key,JSON.stringify(a.slice(0,8)));
    const remember=name=>{if(!name)return;const a=read().filter(x=>x!==name);a.unshift(name);write(a);render()};
    const wrap=document.createElement("div");wrap.className="cmb-b2-panel";wrap.innerHTML='<div class="cmb-b2-label">Recent files</div><div id="cmbB2Recent" class="cmb-b2-recent"></div>';
    title.parentElement?.parentElement?.insertBefore(wrap,title.parentElement.parentElement.firstChild);
    function render(){const r=$("cmbB2Recent");if(!r)return;const a=read();r.innerHTML=a.length?a.map(n=>'<button class="cmb-b2-chip" data-file="'+esc(n)+'">'+esc(n)+'</button>').join(""): '<span class="cmb-b2-status">Files opened in this session will appear here.</span>';r.querySelectorAll("button").forEach(b=>b.onclick=()=>{const target=[...document.querySelectorAll(".file-item,[data-file]")].find(x=>x.textContent.trim()===b.dataset.file||x.dataset.file===b.dataset.file);target?.click();remember(b.dataset.file)})}
    render();
    document.addEventListener("click",e=>{const item=e.target.closest(".file-item,[data-file]");if(item&&item!==wrap){const name=(item.dataset.file||item.textContent||"").trim();if(name)remember(name)}});
  }

  // 4. Compact workspace density
  function density(){
    if($("cmbB2Density"))return;
    const target=$("cmbB2Tools");if(!target)return;
    const b=document.createElement("button");b.id="cmbB2Density";b.className="small";b.textContent="▦ Compact";target.querySelector(".cmb-b2-row")?.appendChild(b);
    const on=localStorage.getItem("cmbB2Compact")==="1";if(on)document.body.classList.add("cmb-b2-compact");
    b.onclick=()=>{const active=document.body.classList.toggle("cmb-b2-compact");localStorage.setItem("cmbB2Compact",active?"1":"0");b.textContent=active?"▦ Comfortable":"▦ Compact";event("Workspace density changed",active?"Compact spacing is enabled.":"Comfortable spacing is enabled.","▦")};
    b.textContent=on?"▦ Comfortable":"▦ Compact";
  }

  // 5. Help / shortcut reference
  function help(){
    const b=document.createElement("button");b.className="small";b.id="cmbB2HelpButton";b.textContent="? Help";$("cmbB2Tools")?.querySelector(".cmb-b2-row")?.appendChild(b);
    const modal=document.createElement("div");modal.id="cmbB2Help";modal.className="cmb-b2-modal hidden";modal.innerHTML='<div class="cmb-b2-dialog"><div class="cmb-b2-row"><h3>CMB AI Workspace Help</h3><button class="small" id="cmbB2HelpClose">Close</button></div><p>Quick controls for the current workspace.</p><div class="cmb-b2-help"><span><b>Ctrl/Cmd + S</b><br>Save code</span><span><b>Ctrl/Cmd + K</b><br>Open command palette</span><span><b>Escape</b><br>Close overlays</span><span><b>A− / A+</b><br>Change editor size</span><span><b>Wrap</b><br>Toggle long-line wrapping</span><span><b>Fullscreen</b><br>Expand the editor</span></div></div>';
    document.body.appendChild(modal);b.onclick=()=>modal.classList.remove("hidden");$("cmbB2HelpClose").onclick=()=>modal.classList.add("hidden");modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.add("hidden")});
  }

  // 6. Lightweight notification center
  function notifications(){
    const b=document.createElement("button");b.className="small";b.id="cmbB2NoticeButton";b.textContent="🔔 Events";$("cmbB2Tools")?.querySelector(".cmb-b2-row")?.appendChild(b);
    const box=document.createElement("div");box.id="cmbB2Notice";box.className="cmb-b2-notice hidden";box.innerHTML='<div class="cmb-b2-row"><strong>CMB AI Event Center</strong><button class="small" id="cmbB2NoticeClose">×</button></div><small id="cmbB2NoticeText">No new events.</small>';
    document.body.appendChild(box);
    b.onclick=()=>box.classList.toggle("hidden");$("cmbB2NoticeClose").onclick=()=>box.classList.add("hidden");
    window.cmbBatch2Notify=(title,detail)=>{$("cmbB2NoticeText").innerHTML="<b>"+esc(title)+"</b><br>"+esc(detail);b.textContent="🔔 New event";box.classList.remove("hidden");clearTimeout(window.__cmbB2NoticeTimer);window.__cmbB2NoticeTimer=setTimeout(()=>{b.textContent="🔔 Events"},3500)};
  }

  // 7. Backend health quick check
  async function health(){
    const base=localStorage.getItem("cmbApiBase")||localStorage.getItem("apiBase")||"";
    if(!base){toast("Backend URL is not configured");event("Health check skipped","No saved backend URL was found in this browser.","!");return}
    try{const res=await fetch(base.replace(/\/$/,"")+"/api/health",{cache:"no-store"});if(!res.ok)throw new Error(String(res.status));toast("Backend health: online");event("Backend health verified","The configured backend responded successfully.","♥")}catch{toast("Backend health: offline");event("Backend health failed","The configured backend did not respond successfully.","!")}
  }
  function healthButton(){const b=document.createElement("button");b.className="small";b.textContent="♥ Backend";b.onclick=health;$("cmbB2Tools")?.querySelector(".cmb-b2-row")?.appendChild(b)}

  // 8. Deployment refresh helper
  function deploymentRefresh(){
    const b=document.createElement("button");b.className="small";b.textContent="↻ Deploy status";b.onclick=()=>{$("cmbDeployMonitorRefresh")?.click();toast("Deployment status refreshed")};$("cmbB2Tools")?.querySelector(".cmb-b2-row")?.appendChild(b)
  }

  // 9. Restore editor tool preferences safely
  function restorePrefs(){
    const ed=editor();if(!ed)return;
    const wrap=localStorage.getItem("cmbB2Wrap");if(wrap==="off")ed.style.whiteSpace="pre";
    const size=Number(localStorage.getItem("cmbB2FontSize"));if(size)ed.style.fontSize=Math.max(10,Math.min(28,size))+"px";
  }

  // 10. Session status marker
  function sessionStatus(){
    const s=document.createElement("span");s.id="cmbB2Session";s.className="cmb-b2-status";s.textContent="Session active";$("cmbB2Tools")?.querySelector(".cmb-b2-row")?.appendChild(s);
    event("Batch 2 workspace layer ready","Editor controls, recent files, compact mode, help, notifications, health and deployment shortcuts are active.","✦");
  }

  function wire(){
    if(!editor())return;
    fontControls();density();help();notifications();healthButton();deploymentRefresh();recentFiles();restorePrefs();sessionStatus();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(wire,100),{once:true});else setTimeout(wire,100);
  window.cmbBatch2={toggleFullscreen,health};
})();
