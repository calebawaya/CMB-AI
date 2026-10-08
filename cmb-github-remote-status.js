/* CMB AI — remote GitHub sync status */
(()=>{
  const API_BASE=()=>String(window.CMB_API_BASE||"http://127.0.0.1:5000/api").replace(/\/$/,"");
  const repo="calebawaya/CMB-AI",branch="main";
  let button,status,verifyTimer=0,checking=false;
  const project=()=>window.state?.active||null;
  const saved=()=>{
    const name=String(project()?.name||"").trim();
    if(!name)return null;
    try{return JSON.parse(localStorage.getItem("cmbGithubSync:"+name)||"null")}catch{return null}
  };
  const commit=()=>saved()?.lastSuccessful?.commit||null;
  const setStatus=(text,kind="")=>{
    if(!status)return;
    status.textContent=text;
    status.className="cgs-remote-status"+(kind?" "+kind:"");
  };
  const refresh=()=>{
    const hasProject=!!project();
    const hasCommit=!!commit();
    if(button)button.disabled=!hasCommit||checking;
    if(!hasProject)setStatus("Open a project to begin");
    else if(!hasCommit)setStatus("No successful sync yet");
  };
  const ensureUI=()=>{
    const grid=document.querySelector(".cgs-history-grid"),tools=document.querySelector(".cgs-history-tools");
    if(!grid||!tools)return false;
    if(!status){
      const label=document.createElement("span");
      label.textContent="Remote status";
      status=document.createElement("b");
      status.id="cgsRemoteStatus";
      status.className="cgs-remote-status";
      status.textContent="Not checked";
      grid.append(label,status);
    }
    if(!button){
      button=document.createElement("button");
      button.id="cgsVerifyRemote";
      button.type="button";
      button.textContent="↻ Verify remote";
      button.title="Verify whether the last successful commit is still the remote main branch head";
      tools.appendChild(button);
      button.addEventListener("click",()=>verify(false));
    }
    refresh();
    return true;
  };
  async function verify(auto=false){
    if(!ensureUI()||checking)return;
    const sha=commit();
    if(!sha){refresh();return}
    checking=true;
    refresh();
    setStatus(auto?"Auto-checking…":"Checking…");
    try{
      const response=await fetch(API_BASE()+"/github/sync/verify",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({repo,branch,commit:sha})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.ok)throw new Error(data.error||"Remote verification failed");
      if(data.matches_head){
        setStatus("REMOTE VERIFIED","verified");
        window.cmbEvent?.("Remote GitHub sync verified",{commit:sha,branch,automatic:auto});
      }else{
        setStatus("BRANCH AHEAD","ahead");
        window.cmbEvent?.("Remote GitHub branch is ahead of last successful sync",{commit:sha,head:data.head_commit||null,branch,automatic:auto});
      }
    }catch(error){
      setStatus("REMOTE UNAVAILABLE","error");
      window.cmbEvent?.("Remote GitHub sync verification failed",{error:String(error?.message||error),automatic:auto});
    }finally{
      checking=false;
      refresh();
    }
  }
  function scheduleAutoVerify(delay=350){
    clearTimeout(verifyTimer);
    verifyTimer=setTimeout(()=>verify(true),delay);
  }
  const projectEvents=["cmb:open-project","cmb:project-open"];
  projectEvents.forEach(event=>document.addEventListener(event,()=>{setTimeout(ensureUI,0);scheduleAutoVerify(500)}));
  document.addEventListener("cmb:workspace-sync",()=>{setTimeout(()=>{ensureUI();scheduleAutoVerify(700)},0)});
  document.addEventListener("cmb:project-closed",()=>setTimeout(ensureUI,0));
  document.addEventListener("cmb:workspace-change",()=>setTimeout(refresh,0));
  document.addEventListener("cmb:editor-refresh",()=>setTimeout(refresh,0));
  const observer=new MutationObserver(()=>ensureUI());
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(ensureUI,0);
})();
