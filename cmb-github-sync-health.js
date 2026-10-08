/* CMB AI — unified GitHub sync health + diagnostics */
(()=>{
  const project=()=>window.state?.active||null;
  const name=()=>String(project()?.name||"").trim();
  const read=(prefix)=>{
    const n=name(); if(!n)return null;
    try{return JSON.parse(localStorage.getItem(prefix+n)||"null")}catch{return null}
  };
  const syncState=()=>read("cmbGithubSync:");
  const remoteState=()=>read("cmbGithubRemote:");
  let badge,detail,diag,copy,verify;
  function ensure(){
    const panel=document.querySelector(".cgs-history");
    if(!panel)return false;
    let box=document.getElementById("cgsSyncHealth");
    if(!box){
      box=document.createElement("div");
      box.id="cgsSyncHealth";
      box.className="cgs-sync-health";
      box.innerHTML='<strong>SYNC HEALTH</strong><div><b id="cgsSyncHealthBadge">NOT SYNCED</b><span id="cgsSyncHealthDetail">Open a project and sync it to GitHub.</span></div><small id="cgsHealthAge">State changed just now</small><button id="cgsSyncHealthDetails" type="button">Show diagnostics</button><button id="cgsCopySyncDiagnostics" type="button" disabled>Copy diagnostics</button><button id="cgsVerifyHealth" type="button" disabled>↻ Verify now</button><div id="cgsSyncDiagnostics" hidden></div>';
      panel.appendChild(box);
    }
    badge=box.querySelector("#cgsSyncHealthBadge");
    detail=box.querySelector("#cgsSyncHealthDetail");
    diag=box.querySelector("#cgsSyncDiagnostics");
    copy=box.querySelector("#cgsCopySyncDiagnostics");
    verify=box.querySelector("#cgsVerifyHealth");
    const toggle=box.querySelector("#cgsSyncHealthDetails");
    if(toggle&&!toggle.dataset.bound){
      toggle.dataset.bound="1";
      toggle.addEventListener("click",()=>{
        const opening=diag.hidden;
        diag.hidden=!opening;
        toggle.textContent=opening?"Hide diagnostics":"Show diagnostics";
        renderDiag(syncState(),remoteState());
      });
    }
    if(copy&&!copy.dataset.bound){
      copy.dataset.bound="1";
      copy.addEventListener("click",async()=>{
        const text=diagnosticText(syncState(),remoteState());
        if(!text)return;
        try{
          await navigator.clipboard.writeText(text);
          copy.textContent="✓ Copied";
          setTimeout(()=>{if(copy)copy.textContent="Copy diagnostics"},1200);
        }catch{
          copy.textContent="Copy unavailable";
          setTimeout(()=>{if(copy)copy.textContent="Copy diagnostics"},1200);
        }
      });
    }
    if(verify&&!verify.dataset.bound){
      verify.dataset.bound="1";
      verify.addEventListener("click",()=>{
        const remoteButton=document.getElementById("cgsVerifyRemote");
        if(remoteButton&&!remoteButton.disabled){
          remoteButton.click();
          verify.textContent="↻ Verifying…";
          verify.disabled=true;
          setTimeout(render,150);
        }
      });
    }
    return true;
  }
  let lastEventKey="";
  let lastHealthClass="";
  let healthChangedAt=Date.now();
  let healthAgeTimer=null;
  function healthAge(){
    return healthChangedAt?Math.max(0,Date.now()-healthChangedAt):0;
  }
  function formatAge(ms){
    const s=Math.floor(ms/1000);
    if(s<60)return s+"s ago";
    const m=Math.floor(s/60);
    if(m<60)return m+"m "+(s%60)+"s ago";
    const h=Math.floor(m/60);
    return h+"h "+(m%60)+"m ago";
  }
  function updateHealthAge(){
    const age=document.getElementById("cgsHealthAge");
    if(age)age.textContent="State changed "+formatAge(healthAge());
  }
  function state(text,cls,message){
    badge.textContent=text;
    badge.className="cgs-sync-health-badge"+(cls?" "+cls:"");
    detail.textContent=message;
    const key=name()+"|"+text+"|"+message;
    if(key!==lastEventKey){
      const previous=lastHealthClass;
      lastEventKey=key;
      if(previous!==text)healthChangedAt=Date.now();
      lastHealthClass=text;
      try{
        const icon=text==="HEALTHY"?"✓":text==="REMOTE OFFLINE"?"!":text==="ACTION NEEDED"?"⚠":"●";
        const transition=previous&&previous!==text?"State changed: ":"";
        window.cmbEvent?.("GitHub sync health",transition+message,icon);
      }catch{}
    }
  }
  function safe(value){
    return String(value==null?"—":value).replace(/[&<>"]/g,function(m){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m];
    });
  }
  function diagnosticText(s,r){
    const success=s&&s.lastSuccessful;
    if(!name()&&!success&&!r)return "";
    return [
      "CMB AI GitHub Sync Diagnostics",
      "Project: "+(name()||"—"),
      "Last successful commit: "+(success&&success.commit||"—"),
      "Synced at: "+(success&&success.at?new Date(success.at).toLocaleString():"—"),
      "Files changed: "+(success&&success.files!=null?success.files:"—"),
      "Verified commit: "+(r&&r.commit||"—"),
      "Remote main: "+(r&&r.headCommit||"—"),
      "Remote checked: "+(r&&r.at?new Date(r.at).toLocaleString():"—"),
      "Remote result: "+(r&&r.status||"—"),
      "Health state: "+(lastHealthClass||"—"),
      "Health state changed: "+(healthChangedAt?new Date(healthChangedAt).toLocaleString():"—")
    ].join("\n");
  }
  function renderDiag(s,r){
    if(!diag)return;
    const success=s&&s.lastSuccessful;
    diag.innerHTML='<div class="cgs-sync-diag-grid">'
      +'<span>Project</span><b>'+safe(name()||"—")+'</b>'
      +'<span>Last successful commit</span><b>'+safe(success&&success.commit)+'</b>'
      +'<span>Synced at</span><b>'+safe(success&&success.at?new Date(success.at).toLocaleString():"—")+'</b>'
      +'<span>Files changed</span><b>'+safe(success&&success.files!=null?success.files:"—")+'</b>'
      +'<span>Verified commit</span><b>'+safe(r&&r.commit)+'</b>'
      +'<span>Remote main</span><b>'+safe(r&&r.headCommit)+'</b>'
      +'<span>Remote checked</span><b>'+safe(r&&r.at?new Date(r.at).toLocaleString():"—")+'</b>'
      +'<span>Remote result</span><b>'+safe(r&&r.status)+'</b>'
      +'<span>Health state</span><b>'+safe(lastHealthClass||"—")+'</b>'
      +'<span>State changed</span><b>'+safe(healthChangedAt?new Date(healthChangedAt).toLocaleString():"—")+'</b>'
      +'</div>';
    if(copy)copy.disabled=!name();
    updateHealthAge();
    if(verify)verify.disabled=!name()||!success?.commit||!document.getElementById("cgsVerifyRemote")||document.getElementById("cgsVerifyRemote").disabled;
    if(verify&&!verify.disabled)verify.textContent="↻ Verify now";
  }
  function render(){
    if(!ensure())return;
    const p=project(),s=syncState(),r=remoteState();
    if(!p){state("NO PROJECT","","Open a project before syncing.");renderDiag(s,r);return}
    if(!s||!s.lastSuccessful||!s.lastSuccessful.commit){state("NOT SYNCED","action","No successful GitHub sync exists for this project.");renderDiag(s,r);return}
    const commit=s.lastSuccessful.commit;
    if(!r||r.commit!==commit){state("VERIFY NEEDED","action","The latest successful commit has not been remotely verified.");renderDiag(s,r);return}
    if(r.status==="unavailable"){state("REMOTE OFFLINE","error","Remote verification is unavailable. Try Verify remote again.");renderDiag(s,r);return}
    if(r.status==="branch_ahead"||r.matchesHead===false){state("ACTION NEEDED","ahead","GitHub main has moved beyond the last successful project sync.");renderDiag(s,r);return}
    if(r.matchesHead===true){state("HEALTHY","verified","Last successful commit "+commit.slice(0,7)+" is the current main branch head.");renderDiag(s,r);return}
    state("VERIFY NEEDED","action","Run remote verification to confirm the GitHub branch state.");
    renderDiag(s,r);
  }
  ["cmb:open-project","cmb:project-open","cmb:project-closed","cmb:workspace-change","cmb:workspace-sync","cmb:editor-refresh","cmb:remote-verification-complete"].forEach(function(e){
    document.addEventListener(e,function(){setTimeout(render,0)});
  });
  new MutationObserver(render).observe(document.body,{childList:true,subtree:true});
  if(!healthAgeTimer)healthAgeTimer=setInterval(updateHealthAge,30000);
  setTimeout(render,0);
})();