/* CMB AI — Batch 3 editor operations layer
   Ten safe frontend-only editor and workspace improvements.
*/
(()=>{
  "use strict";
  if(window.__cmbBatch3Loaded)return;
  window.__cmbBatch3Loaded=true;

  const $=id=>document.getElementById(id);
  const editor=()=>$("code");
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const toast=msg=>{const t=$("toast");if(!t)return;t.textContent=msg;t.classList.add("show");clearTimeout(window.__cmbB3Toast);window.__cmbB3Toast=setTimeout(()=>t.classList.remove("show"),2200)};
  const event=(title,detail,icon="✦")=>window.cmbEvent?.(title,detail,icon);

  const style=document.createElement("style");
  style.textContent=`
  .cmb-b3-panel{border:1px solid var(--line);background:var(--panel);border-radius:12px;padding:10px;margin:0 0 12px}
  .cmb-b3-row{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
  .cmb-b3-label{font-size:10px;color:var(--muted);font-weight:800;text-transform:uppercase;letter-spacing:.06em}
  .cmb-b3-status{margin-left:auto;color:var(--muted);font-size:10px}
  .cmb-b3-jump{width:82px;background:var(--panel2);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:7px}
  .cmb-b3-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:7px;margin-top:8px}
  .cmb-b3-meta span{padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--panel2);font-size:10px;color:var(--muted)}
  .cmb-b3-meta b{display:block;color:var(--text);font-size:12px;margin-top:2px}
  .cmb-b3-session{font-variant-numeric:tabular-nums}
  `;
  document.head.appendChild(style);

  // 1. Quick duplicate current line
  function duplicateLine(){
    const ed=editor();if(!ed)return;
    const pos=ed.selectionStart||0;const start=ed.value.lastIndexOf("\n",Math.max(0,pos-1))+1;let end=ed.value.indexOf("\n",pos);if(end<0)end=ed.value.length;
    const line=ed.value.slice(start,end);ed.value=ed.value.slice(0,end)+"\n"+line+ed.value.slice(end);const next=end+1+line.length;ed.selectionStart=ed.selectionEnd=next;ed.dispatchEvent(new Event("input",{bubbles:true}));toast("Line duplicated");event("Editor line duplicated","The current editor line was duplicated.","+");
  }

  // 2. Jump to a line number
  function jumpToLine(){
    const ed=editor();if(!ed)return;const input=$("cmbB3JumpLine");const n=Math.max(1,Number(input?.value)||1);const lines=ed.value.split("\n");const target=Math.min(n,lines.length);let pos=0;for(let i=0;i<target-1;i++)pos+=lines[i].length+1;ed.focus();ed.selectionStart=ed.selectionEnd=pos;toast("Jumped to line "+target);event("Editor navigation","Cursor moved to line "+target+".","↗");
  }

  // 3. Quick comment/uncomment for selected lines
  function toggleComment(){
    const ed=editor();if(!ed)return;const a=ed.selectionStart,b=ed.selectionEnd;const start=ed.value.lastIndexOf("\n",Math.max(0,a-1))+1;let end=ed.value.indexOf("\n",b);if(end<0)end=ed.value.length;const block=ed.value.slice(start,end);const lines=block.split("\n");const trimmed=lines.filter(x=>x.trim()).length;const commented=trimmed>0&&lines.filter(x=>x.trim()).every(x=>x.trim().startsWith("//"));const out=lines.map(line=>{const indent=line.match(/^\s*/)?.[0]||"";const rest=line.slice(indent.length);return commented?(rest.startsWith("//")?indent+rest.slice(2).replace(/^ /,""):line):indent+"// "+rest}).join("\n");ed.value=ed.value.slice(0,start)+out+ed.value.slice(end);ed.selectionStart=start;ed.selectionEnd=start+out.length;ed.dispatchEvent(new Event("input",{bubbles:true}));toast(commented?"Comments removed":"Lines commented");event("Editor comment toggle",commented?"Selected lines were uncommented.":"Selected lines were commented.","//");
  }

  // 4. Copy current file code
  async function copyCode(){
    const ed=editor();if(!ed)return;try{await navigator.clipboard.writeText(ed.value);toast("Code copied");event("Code copied","The current editor file was copied to the clipboard.","⧉")}catch{toast("Clipboard access unavailable");event("Clipboard unavailable","The browser did not allow clipboard access.","!")}}

  // 5. Editor file-type indicator
  function fileType(){
    const title=$("editorTitle");if(!title)return;const box=document.createElement("span");box.id="cmbB3FileType";box.className="cmb-b3-status";title.parentElement?.appendChild(box);const update=()=>{const name=title.textContent.trim()||"untitled";const ext=(name.split(".").pop()||"file").toUpperCase();box.textContent="Type: "+ext};update();new MutationObserver(update).observe(title,{childList:true,subtree:true,characterData:true})
  }

  // 6. Unsaved-change protection
  function unloadGuard(){
    const ed=editor();if(!ed)return;let clean=ed.value;ed.addEventListener("input",()=>{window.__cmbB3Dirty=ed.value!==clean});window.addEventListener("beforeunload",e=>{if(window.__cmbB3Dirty){e.preventDefault();e.returnValue=""}});window.cmbBatch3MarkClean=()=>{clean=ed.value;window.__cmbB3Dirty=false}}

  // 7. Workspace session timer
  function sessionTimer(){
    const box=document.createElement("span");box.id="cmbB3SessionTimer";box.className="cmb-b3-status cmb-b3-session";const start=Number(localStorage.getItem("cmbB3SessionStart")||Date.now());localStorage.setItem("cmbB3SessionStart",start);const update=()=>{let s=Math.max(0,Math.floor((Date.now()-start)/1000));const h=Math.floor(s/3600);s%=3600;const m=Math.floor(s/60);s%=60;box.textContent="Session: "+String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")};$("cmbB2Tools")?.querySelector(".cmb-b2-row")?.appendChild(box);update();setInterval(update,1000)
  }

  // 8. Project workspace metadata card
  function metadata(){
    const workspace=$("workspace");if(!workspace||$("cmbB3Metadata"))return;const card=document.createElement("div");card.id="cmbB3Metadata";card.className="cmb-b3-panel";card.innerHTML='<div class="cmb-b3-label">Workspace snapshot</div><div class="cmb-b3-meta"><span>Project<b id="cmbB3Project">—</b></span><span>File<b id="cmbB3File">—</b></span><span>Lines<b id="cmbB3Lines">0</b></span><span>State<b id="cmbB3State">Ready</b></span></div>';workspace.parentElement?.insertBefore(card,workspace);const update=()=>{const ed=editor();$("cmbB3Project").textContent=$("projectName")?.textContent?.trim()||"Untitled";$("cmbB3File").textContent=$("editorTitle")?.textContent?.trim()||"Untitled";$("cmbB3Lines").textContent=ed?(ed.value?ed.value.split(/\n/).length:0):0;$("cmbB3State").textContent=window.__cmbB3Dirty?"Unsaved":"Ready"};update();editor()?.addEventListener("input",update);setInterval(update,1200)
  }

  // 9. Clear local editor draft
  function clearDraft(){
    if(!localStorage.getItem("cmbB1EditorDraft")){toast("No local draft found");return}if(!confirm("Clear the saved CMB AI editor draft from this browser?"))return;localStorage.removeItem("cmbB1EditorDraft");toast("Local draft cleared");event("Local draft cleared","The saved editor draft was removed from this browser.","×")
  }

  // 10. Batch 3 controls
  function controls(){
    const ed=editor();if(!ed||$("cmbB3Tools"))return;const panel=document.createElement("div");panel.id="cmbB3Tools";panel.className="cmb-b3-panel";panel.innerHTML='<div class="cmb-b3-row"><span class="cmb-b3-label">Quick actions</span><button class="small" id="cmbB3Duplicate">＋ Duplicate line</button><button class="small" id="cmbB3Comment">// Comment</button><button class="small" id="cmbB3Copy">⧉ Copy code</button><input id="cmbB3JumpLine" class="cmb-b3-jump" type="number" min="1" placeholder="Line"><button class="small" id="cmbB3Jump">↗ Jump</button><button class="small" id="cmbB3ClearDraft">× Clear draft</button><span class="cmb-b3-status">Batch 3 ready</span></div>';
    ed.parentNode?.parentNode?.insertBefore(panel,ed.parentNode);$("cmbB3Duplicate").onclick=duplicateLine;$("cmbB3Comment").onclick=toggleComment;$("cmbB3Copy").onclick=copyCode;$("cmbB3Jump").onclick=jumpToLine;$("cmbB3JumpLine").addEventListener("keydown",e=>{if(e.key==="Enter")jumpToLine()});$("cmbB3ClearDraft").onclick=clearDraft;
  }

  function wire(){
    if(!editor())return;controls();fileType();unloadGuard();sessionTimer();metadata();
    event("Batch 3 editor operations ready","Duplicate line, comment toggle, line navigation, code copy, file type, unsaved protection, session timing and workspace snapshot are active.","✦");
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(wire,180),{once:true});else setTimeout(wire,180);
  window.cmbBatch3={duplicateLine,toggleComment,copyCode,jumpToLine,clearDraft};
})();
