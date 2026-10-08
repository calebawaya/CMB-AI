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
  let badge,detail,diag,copy,verify,preflight;
  function ensure(){
    const panel=document.querySelector(".cgs-history");
    if(!panel)return false;
    let box=document.getElementById("cgsSyncHealth");
    if(!box){
      box=document.createElement("div");
      box.id="cgsSyncHealth";
      box.className="cgs-sync-health";
      box.innerHTML='<strong>SYNC HEALTH</strong><div><b id="cgsSyncHealthBadge">NOT SYNCED</b><span id="cgsSyncHealthDetail">Open a project and sync it to GitHub.</span></div><small id="cgsHealthAge">State changed just now</small><button id="cgsSyncHealthDetails" type="button">Show diagnostics</button><button id="cgsCopySyncDiagnostics" type="button" disabled>Copy diagnostics</button><button id="cgsVerifyHealth" type="button" disabled>↻ Verify now</button><button id="cgsRunPreflight" type="button">✓ Run preflight</button><div id="cgsSyncDiagnostics" hidden></div>';
      panel.appendChild(box);
    }
    badge=box.querySelector("#cgsSyncHealthBadge");
    detail=box.querySelector("#cgsSyncHealthDetail");
    diag=box.querySelector("#cgsSyncDiagnostics");
    copy=box.querySelector("#cgsCopySyncDiagnostics");
    verify=box.querySelector("#cgsVerifyHealth");
    preflight=box.querySelector("#cgsRunPreflight");
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
  let transitionCount=0;
  const healthTimeKey=()=>`cmbGithubHealth:${name()}`;
  const healthCountKey=()=>`cmbGithubHealthTransitions:${name()}`;
  function loadHealthMeta(){
    try{
      const saved=JSON.parse(localStorage.getItem(healthTimeKey())||"null");
      if(saved&&typeof saved==="object"){
        const changed=Number(saved.changedAt);
        if(Number.isFinite(changed)&&changed>0)healthChangedAt=changed;
        lastHealthClass=String(saved.state||"");
        transitionCount=Number(saved.count)||0;
        return;
      }
      const legacy=Number(localStorage.getItem(healthTimeKey()));
      if(Number.isFinite(legacy)&&legacy>0)healthChangedAt=legacy;
      transitionCount=Number(localStorage.getItem(healthCountKey()))||0;
    }catch{}
  }
  function saveHealthMeta(){
    try{if(name())localStorage.setItem(healthTimeKey(),JSON.stringify({state:lastHealthClass,changedAt:healthChangedAt,count:transitionCount}));}catch{}
  }
  let healthChangedAt=Date.now();
  let healthAgeTimer=null;

  function healthAge(){
    return healthChangedAt?Math.max(0,Date.now()-healthChangedAt):0;
  }
  function stateDurationLabel(){
    const ms=healthAge(),s=Math.floor(ms/1000);
    if(s<60)return "Healthy for less than a minute";
    const m=Math.floor(s/60);
    if(m<60)return "Current state for "+m+"m";
    const h=Math.floor(m/60);
    return "Current state for "+h+"h "+(m%60)+"m";
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
    if(age){age.textContent="State changed "+formatAge(healthAge());age.title=stateDurationLabel();}
  }
  function state(text,cls,message){
    badge.textContent=text;
    badge.className="cgs-sync-health-badge"+(cls?" "+cls:"");
    detail.textContent=message;
    const key=name()+"|"+text+"|"+message;
    if(key!==lastEventKey){
      const previous=lastHealthClass;
      lastEventKey=key;
      if(previous!==text){
        healthChangedAt=Date.now();
        transitionCount++;
        saveHealthMeta();
        if(previous&&text==="HEALTHY")window.cmbEvent?.("GitHub sync recovered","GitHub sync health recovered to HEALTHY.","✓");
      }
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
  async function runPreflight(){
    if(!ensure())return;
    if(preflight){preflight.disabled=true;preflight.textContent="✓ Checking…";}
    const p=project(),s=syncState(),r=remoteState(),checks=[];
    checks.push(["Project open",!!p]);
    checks.push(["Successful sync",!!s?.lastSuccessful?.commit]);
    const commit=s?.lastSuccessful?.commit||null;
    checks.push(["Remote verification matches sync",!!r&&r.commit===commit&&r.matchesHead===true]);
    checks.push(["Sync controls loaded",!!document.getElementById("cgsSync")&&!!document.getElementById("cgsVerifyRemote")]);
    checks.push(["Workspace clean",!document.getElementById("workspaceSyncStatus")?.classList.contains("unsaved")]);
    let backend=false;
    try{
      const base=String(window.CMB_API_BASE||"").replace(/\/$/,"");
      if(base){
        const response=await fetch(base+"/health",{method:"GET",cache:"no-store"});
        backend=response.ok;
      }
    }catch{}
    checks.push(["Backend reachable",backend]);
    const passed=checks.filter(x=>x[1]).length;
    const failed=checks.length-passed;
    const summary=checks.map(x=>(x[1]?"✓ ":"✕ ")+x[0]).join(" | ");
    const messageText=failed?"Preflight found "+failed+" issue(s). "+summary:"Preflight passed all "+checks.length+" checks. "+summary;
    messageText&&window.cmbEvent?.("CMB AI preflight",messageText,failed?"⚠":"✓");
    if(preflight){
      preflight.textContent=failed?"⚠ Preflight issues":"✓ Preflight passed";
      setTimeout(()=>{if(preflight){preflight.disabled=false;preflight.textContent="✓ Run preflight"}},1800);
    }
    return {passed,failed,checks};
  }
  function stateClass(text){
    return text==="HEALTHY"?"healthy":text==="REMOTE OFFLINE"?"offline":text==="ACTION NEEDED"?"attention":"neutral";
  }
  function healthSummary(){
    if(!lastHealthClass)return "Waiting for first health evaluation.";
    if(lastHealthClass==="HEALTHY")return "GitHub sync is healthy and aligned with main.";
    if(lastHealthClass==="REMOTE OFFLINE")return "Remote verification is unavailable; check the backend connection.";
    if(lastHealthClass==="ACTION NEEDED")return "GitHub main moved ahead of the last successful project sync.";
    if(lastHealthClass==="VERIFY NEEDED")return "A fresh remote verification is required.";
    if(lastHealthClass==="NOT SYNCED")return "This project has not completed a successful GitHub sync.";
    return "No project is currently selected.";
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
      "Health summary: "+healthSummary(),
      "Health state changed: "+(healthChangedAt?new Date(healthChangedAt).toLocaleString():"—"),
      "Health transitions: "+transitionCount,
      "Current state duration: "+stateDurationLabel(),
      "Preflight: "+(lastHealthClass==="HEALTHY"?"READY":"ACTION REQUIRED")
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
    loadHealthMeta();
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