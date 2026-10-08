/* CMB AI — Batch 7 workspace intelligence layer */
(()=>{
  if(window.__cmbBatch7Loaded)return;
  window.__cmbBatch7Loaded=true;

  const code=()=>document.getElementById("codeEditor")||document.querySelector("textarea")||document.querySelector("[contenteditable='true']");
  const files=()=>Array.isArray(window.state?.files)?window.state.files:[];
  const toast=(msg)=>{window.cmbEvent?.("Batch 7",msg,"✓");const el=document.createElement("div");el.textContent=msg;el.style.cssText="position:fixed;right:20px;bottom:20px;z-index:99999;padding:10px 14px;border:1px solid rgba(255,255,255,.16);border-radius:10px;background:rgba(10,15,28,.94);color:#fff;font:12px/1.3 system-ui;box-shadow:0 10px 30px rgba(0,0,0,.35)";document.body.appendChild(el);setTimeout(()=>el.remove(),1800)};
  const esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const currentName=()=>document.querySelector("[data-current-file]")?.dataset.currentFile||document.getElementById("currentFileName")?.textContent?.trim()||window.state?.currentFile||"current-file";
  const text=()=>{const el=code();return el?.value??el?.textContent??""};

  function snippets(){
    const key="cmbB7Snippets";let list=[];try{list=JSON.parse(localStorage.getItem(key)||"[]")}catch{}
    const name=prompt("Snippet name:");if(!name)return;
    const value=text();if(!value.trim())return toast("Editor is empty");
    list.unshift({id:Date.now(),name,code:value.slice(0,12000)});localStorage.setItem(key,JSON.stringify(list.slice(0,30)));toast("Snippet saved");
  }
  function insertSnippet(){
    let list=[];try{list=JSON.parse(localStorage.getItem("cmbB7Snippets")||"[]")}catch{}
    if(!list.length)return toast("No saved snippets yet");
    const names=list.map((x,i)=>(i+1)+". "+x.name).join("\n");const pick=prompt("Choose a snippet number:\n\n"+names);const item=list[Number(pick)-1];if(!item)return;
    const el=code();if(!el)return toast("Editor not found");
    const start=el.selectionStart??text().length,end=el.selectionEnd??start;const value=text();
    if("value" in el){el.value=value.slice(0,start)+item.code+value.slice(end);el.selectionStart=el.selectionEnd=start+item.code.length;el.dispatchEvent(new Event("input",{bubbles:true}))}else document.execCommand("insertText",false,item.code);
    toast("Snippet inserted");
  }
  function bracketMatch(){
    const el=code();if(!el||typeof el.selectionStart!=="number")return toast("Place the cursor in the editor");
    const value=text(),pos=el.selectionStart, pairs={"(":")","[":"]","{":"}"};let at=pos;
    if(pos>=value.length||!pairs[value[pos]])at=pos-1;
    const open=value[at],close=pairs[open];if(!close)return toast("No opening bracket at cursor");
    let depth=0;for(let i=at;i<value.length;i++){if(value[i]===open)depth++;else if(value[i]===close){depth--;if(depth===0){el.focus();el.setSelectionRange(at,i+1);toast("Matching bracket selected");return}}}
    toast("No matching bracket found");
  }
  function wordFrequency(){
    const words=text().toLowerCase().match(/[a-z0-9_$-]+/g)||[];const map={};words.forEach(w=>map[w]=(map[w]||0)+1);const top=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,10);const msg=top.length?top.map(([w,n])=>w+" ×"+n).join(" · "):"No words found";toast(msg);
  }
  async function checksum(){
    const data=new TextEncoder().encode(text());if(!crypto?.subtle)return toast("Checksum unavailable");const hash=await crypto.subtle.digest("SHA-256",data);const hex=[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");toast("SHA-256: "+hex.slice(0,20)+"…");window.cmbEvent?.("File checksum ready",hex,"✓");
  }
  function diffDraft(){
    const draft=localStorage.getItem("cmbB1EditorDraft")||"",now=text();if(draft===now)return toast("No changes since autosaved draft");const a=draft.split("\n"),b=now.split("\n"),out=[];const max=Math.max(a.length,b.length);for(let i=0;i<max;i++){if(a[i]!==b[i])out.push("Line "+(i+1)+": "+(a[i]===undefined?"+ ":b[i]===undefined?"- ":"~ ")+String(b[i]??""))}showPanel("Draft diff",out.slice(0,120).join("\n")||"No differences");
  }
  function restoreVersion(){
    const key="cmbB7DraftVersions";let versions=[];try{versions=JSON.parse(localStorage.getItem(key)||"[]")}catch{}
    if(!versions.length){const draft=localStorage.getItem("cmbB1EditorDraft");if(draft){versions=[{time:Date.now(),code:draft}]}else return toast("No previous draft version")}
    const lines=versions.map((v,i)=>(i+1)+". "+new Date(v.time).toLocaleString());const pick=prompt("Restore draft version:\n\n"+lines.join("\n"));const v=versions[Number(pick)-1];if(!v)return;
    const el=code();if(!el)return; if("value" in el){el.value=v.code;el.dispatchEvent(new Event("input",{bubbles:true}))}else el.textContent=v.code;toast("Previous draft restored");
  }
  function encoding(){showPanel("Editor status","Encoding: UTF-8\nLine endings: "+(text().includes("\r\n")?"CRLF":"LF")+"\nCharacters: "+text().length+"\nFile: "+currentName());}
  function activityExport(){
    let events=[];try{events=JSON.parse(localStorage.getItem("cmbEventStream")||"[]")}catch{}
    if(!Array.isArray(events)||!events.length)return toast("No local activity history found");
    const blob=new Blob([JSON.stringify(events,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="cmb-ai-activity.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),500);toast("Activity exported");
  }
  function metadata(){
    const name=currentName(),f=files().find(x=>(x.name||x.path||"")===name||x.path===name);const content=f?.content??text();const type=(name.split(".").pop()||"unknown").toUpperCase();showPanel("Project file metadata","Name: "+name+"\nType: "+type+"\nSize: "+new Blob([content]).size+" bytes\nCharacters: "+content.length+"\nLines: "+(content?content.split("\n").length:0));
  }
  function showPanel(title,body){
    let p=document.getElementById("cmbB7Panel");if(!p){p=document.createElement("div");p.id="cmbB7Panel";document.body.appendChild(p)}
    p.innerHTML="<div class='cmb-b7-head'><b>"+esc(title)+"</b><button type='button' data-close>×</button></div><pre>"+esc(body)+"</pre>";p.querySelector("[data-close]").onclick=()=>p.remove();
  }
  function toolbar(){
    if(document.getElementById("cmbB7Toolbar"))return;const bar=document.createElement("div");bar.id="cmbB7Toolbar";bar.innerHTML=[
      ["Save Snippet","snippets"],["Insert Snippet","insertSnippet"],["Match Bracket","bracketMatch"],["Word Frequency","wordFrequency"],["SHA-256","checksum"],["Draft Diff","diffDraft"],["Restore Draft","restoreVersion"],["Encoding","encoding"],["Export Activity","activityExport"],["File Metadata","metadata"]
    ].map(([label,fn])=>"<button type='button' data-b7-action='"+fn+"'>"+label+"</button>").join("");
    document.body.appendChild(bar);bar.addEventListener("click",e=>{const fn=e.target.closest("[data-b7-action]")?.dataset.b7Action;if(fn&&typeof window.cmbBatch7?.[fn]==="function")window.cmbBatch7[fn]()});
  }
  function snapshotDraft(){
    const value=text();if(!value)return;let versions=[];try{versions=JSON.parse(localStorage.getItem("cmbB7DraftVersions")||"[]")}catch{};const last=versions[0]?.code;if(last!==value){versions.unshift({time:Date.now(),code:value});localStorage.setItem("cmbB7DraftVersions",JSON.stringify(versions.slice(0,8)))}
  }
  function init(){
    const style=document.createElement("style");style.textContent="#cmbB7Toolbar{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0;padding:7px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(8,13,24,.72)}#cmbB7Toolbar button{border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.05);color:inherit;border-radius:8px;padding:6px 9px;font-size:11px;cursor:pointer}#cmbB7Toolbar button:hover{background:rgba(255,255,255,.11)}#cmbB7Panel{position:fixed;right:18px;top:90px;width:min(430px,calc(100vw - 36px));max-height:70vh;z-index:99998;border:1px solid rgba(255,255,255,.16);border-radius:14px;background:rgba(8,12,24,.97);box-shadow:0 18px 50px rgba(0,0,0,.5);overflow:hidden}#cmbB7Panel .cmb-b7-head{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.1)}#cmbB7Panel button{background:none;border:0;color:inherit;font-size:20px;cursor:pointer}#cmbB7Panel pre{margin:0;padding:12px;white-space:pre-wrap;word-break:break-word;overflow:auto;max-height:60vh;font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}";document.head.appendChild(style);toolbar();setTimeout(snapshotDraft,1500);
  }
  window.cmbBatch7={snippets,insertSnippet,bracketMatch,wordFrequency,checksum,diffDraft,restoreVersion,encoding,activityExport,metadata};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
