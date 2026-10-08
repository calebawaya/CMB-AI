/* CMB AI — Batch 11 workspace navigation and accessibility layer */
(()=>{
  if(window.__cmbBatch11Loaded)return;
  window.__cmbBatch11Loaded=true;

  const editor=()=>document.querySelector("#codeEditor,#code,textarea[spellcheck='false'],[contenteditable='true']");
  const files=()=>Array.from(document.querySelectorAll("#fileList [data-file],#fileList button,#fileList .file-item")).filter(Boolean);
  const emit=(a,b,c="◌")=>window.cmbEvent?.(a,b,c);
  const toast=(m)=>{
    let n=document.getElementById("cmbB11Toast");
    if(!n){n=document.createElement("div");n.id="cmbB11Toast";n.className="cmb-b11-toast";document.body.appendChild(n);}
    n.textContent=m;n.classList.add("show");clearTimeout(n._t);n._t=setTimeout(()=>n.classList.remove("show"),1800);
  };
  const style=()=>{
    if(document.getElementById("cmbB11Style"))return;
    const s=document.createElement("style");s.id="cmbB11Style";
    s.textContent=`
      #cmbB11Toolbar{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
      #cmbB11Toolbar button{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:inherit;border-radius:8px;padding:6px 9px;cursor:pointer}
      #cmbB11Panel{display:none;margin:8px 0;padding:10px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:rgba(0,0,0,.16)}
      #cmbB11Panel.show{display:block}
      .cmb-b11-toast{position:fixed;right:20px;bottom:20px;z-index:9999;padding:9px 13px;border-radius:9px;background:#111;color:#fff;border:1px solid rgba(255,255,255,.15);opacity:0;transform:translateY(8px);pointer-events:none;transition:.2s}
      .cmb-b11-toast.show{opacity:1;transform:none}
      .cmb-b11-bookmark{outline:1px solid rgba(80,180,255,.65)!important}
      .cmb-b11-panel-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .cmb-b11-panel-row input{min-width:180px;flex:1;padding:7px;border-radius:7px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:inherit}
    `;
    document.head.appendChild(s);
  };

  /* 1. Editor command history replay */
  const commandHistory=()=>{
    const key="cmbB11CommandHistory";
    const list=JSON.parse(localStorage.getItem(key)||"[]");
    const cmd=prompt("CMB command history:\n"+(list.length?list.map((x,i)=>i+". "+x).join("\n"):"No commands saved.")+"\n\nEnter a command to save/replay:");
    if(!cmd)return;
    const next=[cmd,...list.filter(x=>x!==cmd)].slice(0,30);
    localStorage.setItem(key,JSON.stringify(next));
    const input=document.getElementById("terminalInput");
    if(input){input.value=cmd;input.focus();}
    toast("Command loaded");emit("Command history","Loaded: "+cmd,"↻");
  };

  /* 2. File tree expand/collapse */
  const treeToggle=()=>{
    const list=document.getElementById("fileList");if(!list)return;
    const collapsed=list.dataset.cmbB11Collapsed==="true";
    list.dataset.cmbB11Collapsed=String(!collapsed);
    list.style.maxHeight=collapsed?"":"220px";
    list.style.overflow=collapsed?"":"auto";
    toast(collapsed?"File tree expanded":"File tree collapsed");
  };

  /* 3. File type icons/badges */
  const typeBadges=()=>{
    files().forEach(el=>{
      if(el.querySelector(".cmbB11Type"))return;
      const name=(el.textContent||"").trim().split(/\s+/).pop();
      const ext=(name.match(/\.([a-z0-9]+)$/i)||[])[1]?.toUpperCase()||"FILE";
      const b=document.createElement("small");b.className="cmbB11Type";b.textContent=ext;
      b.style.cssText="margin-left:6px;opacity:.55;font-size:10px";
      el.appendChild(b);
    });
    toast("File type badges updated");emit("File type badges","Workspace file types refreshed.","✓");
  };

  /* 4. Recent project switcher */
  const projectSwitcher=()=>{
    const raw=localStorage.getItem("launchboxProjects")||localStorage.getItem("cmbProjects")||"[]";
    let list=[];try{list=JSON.parse(raw)}catch{}
    const names=list.map(x=>typeof x==="string"?x:x.name||x.title).filter(Boolean);
    const chosen=prompt("Recent projects:\n"+(names.length?names.map((x,i)=>i+". "+x).join("\n"):"No saved projects found.")+"\n\nEnter project name:");
    if(!chosen)return;
    const p=document.getElementById("projectName");if(p)p.textContent=chosen;
    localStorage.setItem("cmbB11RecentProject",chosen);toast("Project switched: "+chosen);emit("Project switcher","Selected "+chosen,"⇄");
  };

  /* 5. Project favorites */
  const favoriteProject=()=>{
    const p=(document.getElementById("projectName")?.textContent||"Untitled Project").trim();
    const key="cmbB11FavoriteProjects";const list=JSON.parse(localStorage.getItem(key)||"[]");
    const i=list.indexOf(p);if(i>=0)list.splice(i,1);else list.unshift(p);
    localStorage.setItem(key,JSON.stringify(list));toast(i>=0?"Removed from favorites":"Added to favorites");emit("Project favorite",p+(i>=0?" removed":" added"),i>=0?"−":"★");
  };

  /* 6. Workspace panel collapse/expand */
  const panels=()=>{
    document.querySelectorAll("#workspace .panel").forEach((p,i)=>{
      if(p.dataset.cmbB11Panel==="true")return;
      p.dataset.cmbB11Panel="true";
      const h=p.querySelector(".panel-head");if(!h)return;
      const b=document.createElement("button");b.type="button";b.textContent="−";b.className="small";
      b.title="Collapse panel";b.style.marginLeft="8px";
      b.addEventListener("click",()=>{const hidden=p.dataset.cmbB11Hidden==="true";Array.from(p.children).slice(1).forEach(x=>x.style.display=hidden?"":"none");p.dataset.cmbB11Hidden=String(!hidden);b.textContent=hidden?"−":"+";});
      h.appendChild(b);
    });
    toast("Panel controls ready");emit("Panel controls","Workspace panels can now collapse or expand.","□");
  };

  /* 7. Dock/panel resize controls */
  const resize=()=>{
    const ws=document.querySelector("#workspace .workspace");if(!ws)return;
    const key="cmbB11WorkspaceGap";let gap=Number(localStorage.getItem(key)||"16");
    gap=gap>=28?8:gap+4;localStorage.setItem(key,String(gap));
    ws.style.gap=gap+"px";toast("Workspace spacing: "+gap+"px");emit("Workspace spacing","Set to "+gap+"px.","↕");
  };

  /* 8. Search match next/previous */
  const searchNav=(dir)=>{
    const q=prompt("Find text in current file:");if(!q)return;
    const e=editor();if(!e)return;
    const text=e.value??e.textContent??"";const start=e.selectionStart||0;
    const at=dir>0?text.indexOf(q,start+1):text.lastIndexOf(q,Math.max(0,start-1));
    const pos=at<0?(dir>0?text.indexOf(q):text.lastIndexOf(q)):at;
    if(pos<0){toast("No match found");return;}
    if("selectionStart" in e){e.focus();e.setSelectionRange(pos,pos+q.length);}
    else{toast("Match found at "+(pos+1));}
    toast("Match "+(pos+1));emit("Search navigation","Match at character "+(pos+1),dir>0?"→":"←");
  };

  /* 9. Selection bookmark manager */
  const bookmark=()=>{
    const e=editor();if(!e)return;
    const pos=e.selectionStart||0;const key="cmbB11Bookmarks";const list=JSON.parse(localStorage.getItem(key)||"[]");
    const item={file:document.getElementById("editorTitle")?.textContent||"current",pos};
    const same=list.findIndex(x=>x.file===item.file&&x.pos===pos);
    if(same>=0)list.splice(same,1);else list.unshift(item);
    localStorage.setItem(key,JSON.stringify(list.slice(0,30)));toast(same>=0?"Bookmark removed":"Selection bookmarked");emit("Selection bookmark",same>=0?"Removed bookmark":"Added bookmark","🔖");
  };

  /* 10. Workspace accessibility settings */
  const accessibility=()=>{
    const root=document.documentElement,key="cmbB11A11y",cur=JSON.parse(localStorage.getItem(key)||"{}");
    const large=!cur.large;cur.large=large;cur.contrast=!cur.contrast;
    root.style.setProperty("--cmb-b11-font-scale",large?"1.08":"1");
    document.body.style.letterSpacing=cur.contrast?".02em":"";
    document.body.style.lineHeight=cur.contrast?"1.6":"";
    localStorage.setItem(key,JSON.stringify(cur));toast(large?"Accessibility boost enabled":"Accessibility boost reduced");emit("Accessibility settings","Workspace readability settings updated.","Aa");
  };

  const toolbar=()=>{
    if(document.getElementById("cmbB11Toolbar"))return;
    const host=document.querySelector("#workspace .editor")||document.getElementById("workspace");if(!host)return;
    const bar=document.createElement("div");bar.id="cmbB11Toolbar";
    const buttons=[
      ["History",commandHistory],["Tree",treeToggle],["Types",typeBadges],["Projects",projectSwitcher],["★ Favorite",favoriteProject],
      ["Panels",panels],["Spacing",resize],["Find ←",()=>searchNav(-1)],["Find →",()=>searchNav(1)],["🔖 Bookmark",bookmark],["Aa Access",accessibility]
    ];
    buttons.forEach(([label,fn])=>{const b=document.createElement("button");b.type="button";b.textContent=label;b.addEventListener("click",fn);bar.appendChild(b);});
    host.parentNode.insertBefore(bar,host);
  };

  const init=()=>{style();toolbar();setTimeout(typeBadges,300);};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
  window.cmbBatch11={commandHistory,treeToggle,typeBadges,projectSwitcher,favoriteProject,panels,resize,searchNav,bookmark,accessibility};
})();