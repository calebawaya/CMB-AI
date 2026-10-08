/* CMB AI — unified GitHub sync health */
(()=>{
  const project=()=>window.state?.active||null;
  const name=()=>String(project()?.name||"").trim();
  const syncState=()=>{
    const n=name();
    if(!n)return null;
    try{return JSON.parse(localStorage.getItem(`cmbGithubSync:${n}`)||"null")}catch{return null}
  };
  const remoteState=()=>{
    const n=name();
    if(!n)return null;
    try{return JSON.parse(localStorage.getItem(`cmbGithubRemote:${n}`)||"null")}catch{return null}
  };
  let badge,detail;
  function ensure(){
    const panel=document.querySelector(".cgs-history");
    if(!panel)return false;
    if(document.getElementById("cgsSyncHealth")){
      badge=document.getElementById("cgsSyncHealthBadge");
      detail=document.getElementById("cgsSyncHealthDetail");
      return true;
    }
    const box=document.createElement("div");
    box.id="cgsSyncHealth";
    box.className="cgs-sync-health";
    box.innerHTML='<strong>SYNC HEALTH</strong><div><b id="cgsSyncHealthBadge">NOT SYNCED</b><span id="cgsSyncHealthDetail">Open a project and sync it to GitHub.</span></div>';
    panel.appendChild(box);
    badge=box.querySelector("#cgsSyncHealthBadge");
    detail=box.querySelector("#cgsSyncHealthDetail");
    return true;
  }
  function render(){
    if(!ensure())return;
    const p=project(),s=syncState(),r=remoteState();
    if(!p){badge.textContent="NO PROJECT";badge.className="cgs-sync-health-badge";detail.textContent="Open a project before syncing.";return}
    if(!s?.lastSuccessful?.commit){badge.textContent="NOT SYNCED";badge.className="cgs-sync-health-badge action";detail.textContent="No successful GitHub sync exists for this project.";return}
    const commit=s.lastSuccessful.commit;
    if(!r||r.commit!==commit){badge.textContent="VERIFY NEEDED";badge.className="cgs-sync-health-badge action";detail.textContent="The latest successful commit has not been remotely verified.";return}
    if(r.status==="unavailable"){badge.textContent="REMOTE OFFLINE";badge.className="cgs-sync-health-badge error";detail.textContent="Remote verification is unavailable. Try Verify remote again.";return}
    if(r.status==="branch_ahead"||r.matchesHead===false){badge.textContent="ACTION NEEDED";badge.className="cgs-sync-health-badge ahead";detail.textContent="GitHub main has moved beyond the last successful project sync.";return}
    if(r.matchesHead===true){badge.textContent="HEALTHY";badge.className="cgs-sync-health-badge verified";detail.textContent=`Last successful commit ${commit.slice(0,7)} is the current main branch head.`;return}
    badge.textContent="VERIFY NEEDED";badge.className="cgs-sync-health-badge action";detail.textContent="Run remote verification to confirm the GitHub branch state.";
  }
  ["cmb:open-project","cmb:project-open","cmb:project-closed","cmb:workspace-change","cmb:workspace-sync","cmb:editor-refresh"].forEach(e=>document.addEventListener(e,()=>setTimeout(render,0)));
  const observer=new MutationObserver(render);
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(render,0);
})();
