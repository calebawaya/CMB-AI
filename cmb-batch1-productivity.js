/* CMB AI — Batch 1 productivity layer
   Ten safe frontend-only improvements that build on the existing workspace.
*/
(()=>{
  "use strict";
  if(window.__cmbBatch1Loaded)return;
  window.__cmbBatch1Loaded=true;

  const $=id=>document.getElementById(id);
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const toast=(msg)=>{const t=$("toast");if(!t)return;t.textContent=msg;t.classList.add("show");clearTimeout(window.__cmbToastTimer);window.__cmbToastTimer=setTimeout(()=>t.classList.remove("show"),2200)};
  const event=(title,detail,icon="✦")=>window.cmbEvent?.(title,detail,icon);

  const style=document.createElement("style");
  style.textContent=`
  .cmb-b1-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:0 0 14px;padding:10px 12px;border:1px solid var(--line);background:var(--panel);border-radius:12px}
  .cmb-b1-status{font-size:11px;color:var(--muted);margin-left:auto}
  .cmb-b1-dirty{color:#fbbf24;font-weight:800}
  .cmb-b1-clean{color:#4ade80;font-weight:800}
  .cmb-command{position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.58);backdrop-filter:blur(7px);display:grid;place-items:start center;padding-top:12vh}
  .cmb-command.hidden{display:none}
  .cmb-command-box{width:min(680px,92vw);background:var(--panel);border:1px solid var(--line);border-radius:16px;box-shadow:0 30px 90px rgba(0,0,0,.5);overflow:hidden}
  .cmb-command-box input{width:100%;border:0;border-bottom:1px solid var(--line);outline:0;background:var(--panel2);color:var(--text);padding:17px;font:inherit}
  .cmb-command-list{max-height:390px;overflow:auto;padding:8px}
  .cmb-command-item{display:flex;align-items:center;gap:12px;width:100%;border:0;background:transparent;color:var(--text);text-align:left;border-radius:10px;padding:12px;cursor:pointer}
  .cmb-command-item:hover,.cmb-command-item.active{background:var(--panel2)}
  .cmb-command-item b{min-width:24px}.cmb-command-item span{color:var(--muted);font-size:11px;margin-left:auto}
  .cmb-editor-stats{display:flex;gap:14px;flex-wrap:wrap;padding:8px 10px;color:var(--muted);font-size:10px;border:1px solid var(--line);border-top:0;border-radius:0 0 9px 9px;background:var(--panel2)}
  .cmb-focus-mode .sidebar,.cmb-focus-mode .main>header{display:none!important}
  .cmb-focus-mode .main{margin-left:0!important;padding:18px!important;max-width:1500px;margin-right:auto!important;margin-left:auto!important}
  .cmb-focus-exit{position:fixed;top:14px;right:14px;z-index:70}
  .cmb-search-wrap{display:flex;gap:8px;margin-bottom:10px}.cmb-search-wrap input{flex:1}
  .cmb-backup-input{display:none}
  `;
  document.head.appendChild(style);

  const findEditor=()=>$("code");
  const getFiles=()=>Array.isArray(window.state?.files)?window.state.files:[];
  const saveEditor=()=>{const ed=findEditor();if(!ed)return false;try{window.__cmbB1LastCode=ed.value;window.__cmbB1LastSave=Date.now();localStorage.setItem("cmbB1EditorDraft",JSON.stringify({file:$("editorTitle")?.textContent||"index.html",code:ed.value,time:Date.now()}));return true}catch{return false}};

  // 1. Keyboard shortcuts
  function shortcuts(){
    document.addEventListener("keydown",e=>{
      const mod=e.ctrlKey||e.metaKey;
      if(mod&&e.key.toLowerCase()==="s"){e.preventDefault();$("saveCode")?.click();saveEditor();toast("Code saved");event("Keyboard save","The current editor file was saved.","✓")}
      if(mod&&e.key.toLowerCase()==="k"){e.preventDefault();openPalette()}
      if(e.key==="Escape"&&document.querySelector(".cmb-command:not(.hidden)"))closePalette();
    });
  }

  // 2. Command palette
  let palette,commandInput,commandList,activeIndex=0;
  const commands=[
    ["Open workspace","Go to the project workspace","▣",()=>document.querySelector('[data-open="workspace"]')?.click()],
    ["Open builder","Open the website builder","✦",()=>document.querySelector('[data-open="builder"]')?.click()],
    ["Run project","Run the current project","▶",()=>$("runProject")?.click()],
    ["Preview project","Open the live preview","◉",()=>$("preview")?.click()],
    ["AI Fix","Ask AI to fix the current file","AI",()=>$("fixWithAI")?.click()],
    ["Save code","Save the current editor file","✓",()=>{$("saveCode")?.click();saveEditor()}],
    ["Run health check","Check frontend and backend health","♥",()=>$("runHealthCheck")?.click()],
    ["Run preflight","Check required deployment files","⚡",()=>$("runDeploymentCheck")?.click()],
    ["Focus mode","Hide navigation for focused editing","⌗",()=>toggleFocus()],
    ["Export workspace backup","Download a JSON workspace backup","↓",()=>exportBackup()]
  ];
  function buildPalette(){
    palette=document.createElement("div");palette.className="cmb-command hidden";palette.innerHTML='<div class="cmb-command-box"><input id="cmbCommandInput" placeholder="Search CMB AI commands…" autocomplete="off"><div id="cmbCommandList" class="cmb-command-list"></div></div>';
    document.body.appendChild(palette);commandInput=$("cmbCommandInput");commandList=$("cmbCommandList");
    palette.addEventListener("click",e=>{if(e.target===palette)closePalette()});
    commandInput.addEventListener("input",renderCommands);
    commandInput.addEventListener("keydown",e=>{const rows=[...commandList.querySelectorAll("button")];if(e.key==="ArrowDown"){e.preventDefault();activeIndex=Math.min(activeIndex+1,rows.length-1);markActive(rows)}if(e.key==="ArrowUp"){e.preventDefault();activeIndex=Math.max(activeIndex-1,0);markActive(rows)}if(e.key==="Enter"){e.preventDefault();rows[activeIndex]?.click()}});
    renderCommands();
  }
  function renderCommands(){const q=(commandInput?.value||"").toLowerCase();const rows=commands.filter(x=>x[0].toLowerCase().includes(q)||x[1].toLowerCase().includes(q));activeIndex=0;commandList.innerHTML=rows.map((x,i)=>'<button class="cmb-command-item '+(i===0?"active":"")+'" data-cmd="'+esc(x[0])+'"><b>'+esc(x[2])+'</b><strong>'+esc(x[0])+'</strong><span>'+esc(x[1])+'</span></button>').join("")||'<div class="builder-empty">No matching commands.</div>';commandList.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{const c=commands.find(x=>x[0]===b.dataset.cmd);closePalette();c?.[3]?.()}))}
  function markActive(rows){rows.forEach((r,i)=>r.classList.toggle("active",i===activeIndex));rows[activeIndex]?.scrollIntoView({block:"nearest"})}
  function openPalette(){if(!palette)buildPalette();palette.classList.remove("hidden");commandInput.value="";renderCommands();setTimeout(()=>commandInput.focus(),0)}
  function closePalette(){palette?.classList.add("hidden")}

  // 3. Autosave
  function autosave(){
    const ed=findEditor();if(!ed)return;
    let last=ed.value;
    ed.addEventListener("input",()=>{markDirty(true);clearTimeout(window.__cmbAutoSave);window.__cmbAutoSave=setTimeout(()=>{saveEditor();markDirty(false);event("Autosave completed","The current editor draft was saved locally.","✓")},900)});
    const draft=localStorage.getItem("cmbB1EditorDraft");
    if(draft){try{const d=JSON.parse(draft);if(d.code&&d.code!==ed.value&&confirm("CMB AI found a newer local draft for this editor. Restore it?")){ed.value=d.code;markDirty(false);toast("Local draft restored");event("Draft restored","A newer local editor draft was restored.","↻")}}catch{}}
  }
  function markDirty(dirty){const s=$("cmbB1SaveStatus");if(!s)return;s.textContent=dirty?"● Unsaved changes":"✓ Saved locally";s.className="cmb-b1-status "+(dirty?"cmb-b1-dirty":"cmb-b1-clean")}

  // 4. Editor statistics
  function editorStats(){const ed=findEditor();if(!ed)return;let box=$("cmbEditorStats");if(!box){box=document.createElement("div");box.id="cmbEditorStats";box.className="cmb-editor-stats";ed.parentNode.appendChild(box)}const update=()=>{const v=ed.value||"";const lines=v? v.split(/\n/).length:0;const words=(v.match(/\b[\w'-]+\b/g)||[]).length;const chars=v.length;const pos=ed.selectionStart||0;const before=v.slice(0,pos);const line=before.split(/\n/).length;const col=pos-before.lastIndexOf("\n");box.innerHTML='<span>Lines: <b>'+lines+'</b></span><span>Words: <b>'+words+'</b></span><span>Chars: <b>'+chars+'</b></span><span>Ln: <b>'+line+'</b> Col: <b>'+col+'</b></span>'};["input","keyup","click","select"].forEach(e=>ed.addEventListener(e,update));update()}

  // 5. File quick search
  function fileSearch(){const root=$("fileList");if(!root||$("cmbFileSearch"))return;const wrap=document.createElement("div");wrap.className="cmb-search-wrap";wrap.innerHTML='<input id="cmbFileSearch" class="input" placeholder="Search project files…">';root.parentNode.insertBefore(wrap,root);const input=$("cmbFileSearch");input.addEventListener("input",()=>{const q=input.value.toLowerCase();root.querySelectorAll(".file-item,.folder").forEach(x=>x.style.display=x.textContent.toLowerCase().includes(q)?"":"none")})}

  // 6. Workspace backup export
  function collectBackup(){const ed=findEditor();return {version:1,createdAt:new Date().toISOString(),project:$("projectName")?.textContent||"Untitled Project",idea:$("idea")?.value||"",files:getFiles().map(f=>({name:f.name,content:f.content||"",type:f.type||"file"})),editor:{file:$("editorTitle")?.textContent||"",content:ed?.value||""},settings:{theme:document.body.classList.contains("light")?"light":"dark"}}}
  function exportBackup(){const data=JSON.stringify(collectBackup(),null,2);const blob=new Blob([data],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="cmb-ai-workspace-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast("Backup exported");event("Workspace backup exported","A JSON backup was downloaded from the current workspace.","↓")}

  // 7. Workspace backup restore
  function restoreBackup(){let input=$("cmbBackupInput");if(!input){input=document.createElement("input");input.id="cmbBackupInput";input.type="file";input.accept="application/json,.json";input.className="cmb-backup-input";document.body.appendChild(input);input.addEventListener("change",async()=>{const file=input.files?.[0];if(!file)return;try{const d=JSON.parse(await file.text());if(!d||d.version!==1)throw new Error("Unsupported backup");if($("idea"))$("idea").value=d.idea||"";if($("projectName")&&d.project)$("projectName").textContent=d.project;if(findEditor()&&d.editor?.content)findEditor().value=d.editor.content;saveEditor();markDirty(false);toast("Backup restored");event("Workspace backup restored","The selected JSON backup restored the project idea and editor state.","↻")}catch(e){toast("Backup could not be restored");event("Backup restore failed","The selected file is not a valid CMB AI workspace backup.","!")}input.value=""})}input.click()}

  // 8. Focus mode
  function toggleFocus(){document.body.classList.toggle("cmb-focus-mode");const on=document.body.classList.contains("cmb-focus-mode");let b=$("cmbFocusExit");if(on&&!b){b=document.createElement("button");b.id="cmbFocusExit";b.className="small cmb-focus-exit";b.textContent="Exit focus mode";b.onclick=toggleFocus;document.body.appendChild(b)}if(b)b.classList.toggle("hidden",!on);toast(on?"Focus mode on":"Focus mode off");event(on?"Focus mode enabled":"Focus mode disabled",on?"Navigation is hidden for focused editing.":"Normal workspace layout restored.","⌗")}

  // 9. Activity stream filter
  function activityFilter(){const root=$("activityStream");const list=$("eventStreamList");if(!root||!list||$("cmbEventFilter"))return;const wrap=document.createElement("div");wrap.className="cmb-search-wrap";wrap.innerHTML='<input id="cmbEventFilter" class="input" placeholder="Filter events…">';list.parentNode.insertBefore(wrap,list);$("cmbEventFilter").addEventListener("input",()=>{const q=$("cmbEventFilter").value.toLowerCase();list.querySelectorAll("article,.as-item,.event-item").forEach(x=>x.style.display=x.textContent.toLowerCase().includes(q)?"":"none")})}

  // 10. Backup/restore controls + status bar
  function addControls(){const editor=$("code");const target=editor?.parentElement?.parentElement;const workspace=$("workspace");if(!workspace||$("cmbBatch1Bar"))return;const bar=document.createElement("div");bar.id="cmbBatch1Bar";bar.className="cmb-b1-bar";bar.innerHTML='<button class="small" id="cmbBackupExport">↓ Export backup</button><button class="small" id="cmbBackupRestore">↻ Restore backup</button><button class="small" id="cmbFocusButton">⌗ Focus mode</button><button class="small" id="cmbCommandButton">⌘ Commands</button><span id="cmbB1SaveStatus" class="cmb-b1-status cmb-b1-clean">✓ Saved locally</span>';workspace.parentElement.insertBefore(bar,workspace);$("cmbBackupExport").onclick=exportBackup;$("cmbBackupRestore").onclick=restoreBackup;$("cmbFocusButton").onclick=toggleFocus;$("cmbCommandButton").onclick=openPalette;}

  function wire(){
    addControls();shortcuts();autosave();editorStats();fileSearch();activityFilter();buildPalette();
    event("Batch 1 productivity layer ready","Keyboard shortcuts, autosave, command palette, backup tools, editor statistics, file search, focus mode, and event filtering are active.","✦");
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",wire,{once:true});else setTimeout(wire,0);

  window.cmbBatch1={exportBackup,restoreBackup,toggleFocus,openPalette};
})();
