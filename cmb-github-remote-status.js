/* CMB AI — remote GitHub sync status */
(()=>{
  const API_BASE=()=>String(window.CMB_API_BASE||"http://127.0.0.1:5000/api").replace(/\/$/,"");
  const repo="calebawaya/CMB-AI",branch="main";
  const AUTO_VERIFY_MS=5*60*1000;
  let button,status,checkedAt,age,verifyTimer=0,checking=false,interval=0;
  const project=()=>window.state?.active||null;
  const projectName=()=>String(project()?.name||"").trim();
  const storageKey=()=>`cmbGithubRemote:${projectName()}`;
  const saved=()=>{
    const name=projectName();
    if(!name)return null;
    try{return JSON.parse(localStorage.getItem(`cmbGithubSync:${name}`)||"null")}catch{return null}
  };
  const remoteSaved=()=>{
    const name=projectName();
    if(!name)return null;
    try{return JSON.parse(localStorage.getItem(storageKey())||"null")}catch{return null}
  };
  const commit=()=>saved()?.lastSuccessful?.commit||null;
  const setStatus=(text,kind="")=>{
    if(!status)return;
    status.textContent=text;
    status.className="cgs-remote-status"+(kind?" "+kind:"");
  };
  const formatAge=(value)=>{
    if(!value)return "—";
    const ms=Date.now()-new Date(value).getTime();
    if(!Number.isFinite(ms)||ms<0)return "—";
    const sec=Math.floor(ms/1000);
    if(sec<60)return "just now";
    const min=Math.floor(sec/60);
    if(min<60)return `${min}m ago`;
    const hr=Math.floor(min/60);
    if(hr<24)return `${hr}h ${min%60}m ago`;
    const day=Math.floor(hr/24);
    return `${day}d ${hr%24}h ago`;
  };
  const setCheckedTime=()=>{
    const value=remoteSaved()?.at;
    if(checkedAt)checkedAt.textContent=value?new Date(value).toLocaleString():"—";
    if(age)age.textContent=value?formatAge(value):"—";
  };
  const restoreRemoteState=()=>{
    const state=remoteSaved();
    if(!state){setStatus("Not checked");setCheckedTime();return}
    if(state.commit!==commit()){setStatus("Needs verification");setCheckedTime();return}
    if(state.matchesHead)setStatus("REMOTE VERIFIED","verified");
    else if(state.status==="branch_ahead")setStatus("BRANCH AHEAD","ahead");
    else if(state.status==="unavailable")setStatus("REMOTE UNAVAILABLE","error");
    else setStatus("Not checked");
    setCheckedTime();
  };
  const refresh=()=>{
    const hasProject=!!project();
    const hasCommit=!!commit();
    if(button)button.disabled=!hasCommit||checking;
    if(!hasProject){setStatus("Open a project to begin");if(checkedAt)checkedAt.textContent="—";if(age)age.textContent="—";}
    else if(!hasCommit){setStatus("No successful sync yet");if(checkedAt)checkedAt.textContent="—";if(age)age.textContent="—";}
    else restoreRemoteState();
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
      grid.append(label,status);
      const timeLabel=document.createElement("span");
      timeLabel.textContent="Remote checked";
      checkedAt=document.createElement("b");
      checkedAt.id="cgsRemoteCheckedAt";
      checkedAt.className="cgs-remote-checked-at";
      grid.append(timeLabel,checkedAt);
      const ageLabel=document.createElement("span");
      ageLabel.textContent="Verification age";
      age=document.createElement("b");
      age.id="cgsRemoteAge";
      age.className="cgs-remote-age";
      grid.append(ageLabel,age);
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
      const at=new Date().toISOString();
      localStorage.setItem(storageKey(),JSON.stringify({
        commit:sha,
        headCommit:data.head_commit||null,
        matchesHead:!!data.matches_head,
        status:data.matches_head?"verified":"branch_ahead",
        at
      }));
      if(data.matches_head){
        setStatus("REMOTE VERIFIED","verified");
        window.cmbEvent?.("Remote GitHub sync verified",{commit:sha,branch,automatic:auto});
      }else{
        setStatus("BRANCH AHEAD","ahead");
        window.cmbEvent?.("Remote GitHub branch is ahead of last successful sync",{commit:sha,head:data.head_commit||null,branch,automatic:auto});
      }
      setCheckedTime();
    }catch(error){
      const at=new Date().toISOString();
      localStorage.setItem(storageKey(),JSON.stringify({commit:sha,status:"unavailable",matchesHead:false,at}));
      setStatus("REMOTE UNAVAILABLE","error");
      setCheckedTime();
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
  function shouldAutoVerify(){
    const state=remoteSaved(),sha=commit();
    if(!project()||!sha)return false;
    if(!state||state.commit!==sha)return true;
    if(!state.at)return true;
    return Date.now()-new Date(state.at).getTime()>=AUTO_VERIFY_MS;
  }
  function scheduleIfStale(delay=500){
    if(shouldAutoVerify())scheduleAutoVerify(delay);
  }
  function stopInterval(){clearInterval(interval);interval=0;}
  function startInterval(){
    stopInterval();
    interval=setInterval(()=>{
      if(document.hidden||checking)return;
      if(shouldAutoVerify())verify(true);
    },AUTO_VERIFY_MS);
  }
  const projectEvents=["cmb:open-project","cmb:project-open"];
  projectEvents.forEach(event=>document.addEventListener(event,()=>{setTimeout(ensureUI,0);scheduleIfStale(500);startInterval()}));
  document.addEventListener("cmb:workspace-sync",()=>{setTimeout(()=>{ensureUI();scheduleAutoVerify(700)},0);startInterval()});
  document.addEventListener("cmb:project-closed",()=>{stopInterval();setTimeout(ensureUI,0)});
  document.addEventListener("cmb:workspace-change",()=>setTimeout(refresh,0));
  document.addEventListener("cmb:editor-refresh",()=>setTimeout(refresh,0));
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)scheduleIfStale(250)});
  const observer=new MutationObserver(()=>ensureUI());
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{ensureUI();scheduleIfStale(800);startInterval()},0);
})();
