/* CMB AI — secure workspace → server → GitHub sync */
(()=>{
  if(document.getElementById("cmbGithubSyncPanel"))return;
  const workspace=document.getElementById("workspace");
  if(!workspace)return;

  const style=document.createElement("style");
  style.textContent=`
    .cmb-github-sync{margin:10px 0;padding:14px;border:1px solid rgba(34,197,94,.2);border-radius:12px;background:linear-gradient(135deg,rgba(3,15,12,.94),rgba(8,28,22,.82));box-shadow:0 0 24px rgba(34,197,94,.06)}
    .cgs-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.cgs-head>div{display:grid;gap:4px}.cgs-head small{font-size:9px;color:#86efac;letter-spacing:1px}.cgs-head strong{font-size:14px}.cgs-head span{font-size:10px;color:#94a3b8}.cgs-status{font-size:9px;padding:5px 8px;border:1px solid rgba(134,239,172,.2);border-radius:999px;color:#86efac;white-space:nowrap}.cgs-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.cgs-message{margin-top:10px;padding:9px;border:1px solid rgba(148,163,184,.14);border-radius:8px;background:#020617;font:10px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;color:#cbd5e1;white-space:pre-wrap}.cgs-message.ok{color:#bbf7d0}.cgs-message.bad{color:#fecaca}
    @media(max-width:650px){.cgs-head{flex-direction:column}.cgs-actions button{flex:1}}
  `;
  document.head.appendChild(style);

  const panel=document.createElement("section");
  panel.id="cmbGithubSyncPanel";
  panel.className="cmb-github-sync panel";
  panel.innerHTML=`<div class="cgs-head"><div><small>GITHUB WORKSPACE SYNC</small><strong>Save / Sync to GitHub</strong><span>Changes are sent to the CMB AI backend. The GitHub token never enters the browser.</span></div><b id="cgsStatus" class="cgs-status">CHECKING</b></div><div class="cgs-actions"><button class="small primary" id="cgsSync" type="button">↥ Save &amp; Sync</button><button class="small" id="cgsCheck" type="button">Check connection</button></div><div id="cgsMessage" class="cgs-message">Checking secure GitHub sync…</div>`;
  const editor=workspace.querySelector(".editor");
  editor?.parentNode?.insertBefore(panel,editor);

  const statusEl=document.getElementById("cgsStatus");
  const messageEl=document.getElementById("cgsMessage");
  const syncBtn=document.getElementById("cgsSync");
  const checkBtn=document.getElementById("cgsCheck");
  const api=()=>window.CMB_API_BASE||"http://127.0.0.1:5000/api";
  const setStatus=(text,good=false)=>{if(statusEl){statusEl.textContent=text;statusEl.style.color=good?"#86efac":"#fbbf24"}};
  const message=(text,kind="")=>{if(messageEl){messageEl.textContent=text;messageEl.className="cgs-message "+kind}};

  async function request(path,options={}){
    const response=await fetch(api()+path,{headers:{"Content-Type":"application/json",...(options.headers||{})},...options});
    const data=await response.json().catch(()=>({ok:false,error:"Invalid server response"}));
    if(!response.ok||data.ok===false)throw new Error(data.error||`Request failed (${response.status})`);
    return data;
  }

  async function check(){
    try{
      const data=await request("/github/sync/status");
      if(data.configured){setStatus("SECURE + READY",true);message(`Connected to ${data.repo} (${data.branch}). GitHub credentials remain server-side.` ,"ok");return true}
      setStatus("TOKEN NEEDED");message("The backend is online, but GITHUB_TOKEN is not configured on the server.","bad");return false;
    }catch(error){
      setStatus("OFFLINE");message("Secure GitHub sync is unavailable: "+String(error.message||error),"bad");return false;
    }
  }

  async function sync(){
    const state=window.state;
    const files=state?.files||{};
    if(!state?.active){message("Open a project before syncing to GitHub.","bad");return}
    const entries=Object.entries(files).filter(([path])=>path&&!path.startsWith(".github/")&&!path.startsWith("backend/")&&path!=="render.yaml"&&path!=="gunicorn.conf.py");
    if(!entries.length){message("No workspace files are available to sync.","bad");return}
    syncBtn.disabled=true;setStatus("SYNCING");message(`Preparing ${entries.length} workspace file(s)…`);window.cmbEvent?.("GitHub sync started",`Preparing ${entries.length} workspace file(s).`,"↥");
    try{
      const projectName=String(state.active.name||"CMB AI project").trim();
      const data=await request("/github/sync",{method:"POST",body:JSON.stringify({repo:"calebawaya/CMB-AI",branch:"main",message:`chore: sync ${projectName} from CMB AI`,files:Object.fromEntries(entries)})});
      setStatus("SYNCED",true);message(`GitHub sync complete.\nCommit: ${data.commit}\nFiles: ${data.count}\nRepository: ${data.repo}\nBranch: ${data.branch}`,"ok");window.cmbEvent?.("GitHub workspace synced",`${data.count} file(s) committed to ${data.repo}/${data.branch}.`,"✓");
      if(state.active.backendId&&window.CMBAIBackend?.event)window.CMBAIBackend.event(state.active.backendId,"github.sync",`Workspace synced to GitHub commit ${data.commit}`).catch(()=>{});
      setTimeout(check,1000);
    }catch(error){setStatus("SYNC FAILED");message("GitHub sync failed: "+String(error.message||error),"bad");window.cmbEvent?.("GitHub sync failed",String(error.message||error),"!")}
    finally{syncBtn.disabled=false}
  }

  syncBtn?.addEventListener("click",sync);
  checkBtn?.addEventListener("click",check);
  document.addEventListener("cmb:backend-status",event=>{if(event.detail?.online)check()});
  document.addEventListener("DOMContentLoaded",()=>setTimeout(check,1000));
})();
