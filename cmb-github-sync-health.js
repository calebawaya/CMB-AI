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
  let badge,detail,diag;
  function ensure(){
    const panel=document.querySelector(".cgs-history");
    if(!panel)return false;
    let box=document.getElementById("cgsSyncHealth");
    if(!box){
      box=document.createElement("div");
      box.id="cgsSyncHealth";
      box.className="cgs-sync-health";
      box.innerHTML='<strong>SYNC HEALTH</strong><div><b id="cgsSyncHealthBadge">NOT SYNCED</b><span id="cgsSyncHealthDetail">Open a project and sync it to GitHub.</span></div><button id="cgsSyncHealthDetails" type="button">Show diagnostics</button><div id="cgsSyncDiagnostics" hidden></div>';
      panel.appendChild(box);
    }
    badge=box.querySelector("#cgsSyncHealthBadge");
    detail=box.querySelector("#cgsSyncHealthDetail");
    diag=box.querySelector("#cgsSyncDiagnostics");
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
    return true;
  }
  function state(text,cls,message){
    badge.textContent=text;
    badge.className="cgs-sync-health-badge"+(cls?" "+cls:"");
    detail.textContent=message;
  }
  function safe(value){
    return String(value==null?"—":value).replace(/[&<>"]/g,function(m){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m];
    });
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
      +'</div>';
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
  ["cmb:open-project","cmb:project-open","cmb:project-closed","cmb:workspace-change","cmb:workspace-sync","cmb:editor-refresh"].forEach(function(e){
    document.addEventListener(e,function(){setTimeout(render,0)});
  });
  new MutationObserver(render).observe(document.body,{childList:true,subtree:true});
  setTimeout(render,0);
})();