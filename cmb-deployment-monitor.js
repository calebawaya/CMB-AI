/* CMB AI — live GitHub Pages deployment monitor */
(()=>{
  const repo="calebawaya/CMB-AI";
  const api="https://api.github.com/repos/"+repo+"/actions/runs?per_page=5";
  const root=()=>document.getElementById("cmbDeploymentMonitor");
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const label=r=>r?.conclusion==="success"?"DEPLOYED":r?.status==="in_progress"?"RUNNING":r?.status==="queued"?"QUEUED":r?.conclusion==="failure"?"FAILED":(r?.conclusion||r?.status||"UNKNOWN").toUpperCase();
  async function refresh(){
    const box=root(); if(!box)return;
    const state=document.getElementById("cmbDeployMonitorState");
    const list=document.getElementById("cmbDeployMonitorList");
    const button=document.getElementById("cmbDeployMonitorRefresh");
    if(button)button.disabled=true;
    if(state)state.textContent="CHECKING";
    try{
      const res=await fetch(api,{headers:{"Accept":"application/vnd.github+json"},cache:"no-store"});
      if(!res.ok)throw new Error("GitHub API "+res.status);
      const data=await res.json();
      const runs=(data.workflow_runs||[]).slice(0,5);
      const latest=runs[0];
      if(state)state.textContent=label(latest);
      let detail=document.getElementById("cmbDeployMonitorDetails");
      if(!detail){
        detail=document.createElement("div");
        detail.id="cmbDeployMonitorDetails";
        box.appendChild(detail);
      }
      detail.innerHTML=latest
        ? "<div class='cdm-detail'><b>Latest release</b><span>"+esc(latest.display_title||latest.head_commit?.message||"GitHub Pages workflow")+"</span><small>"+esc(latest.head_sha?.slice(0,7)||"")+" · "+esc(latest.event||"push")+" · "+esc(new Date(latest.created_at||Date.now()).toLocaleString())+"</small></div>"
        : "<div class='cdm-detail'>No deployment run is available yet.</div>";
      if(list)list.innerHTML=runs.length?runs.map(r=>{
        const status=label(r);
        const cls=status==="DEPLOYED"?"ok":status==="FAILED"?"bad":"wait";
        return "<div class='cdm-item "+cls+"'><i>"+(status==="DEPLOYED"?"✓":status==="FAILED"?"!":"◌")+"</i><div><b>Run #"+esc(r.run_number)+" — "+esc(status)+"</b><span>"+esc(r.display_title||r.head_commit?.message||"GitHub Pages workflow")+" · "+esc(new Date(r.updated_at||r.created_at).toLocaleString())+"</span></div><a href='"+esc(r.html_url)+"' target='_blank' rel='noopener'>Open</a></div>";
      }).join(""):"<div class='cdm-empty'>No GitHub Actions runs found.</div>";
      window.cmbEvent?.("Deployment monitor refreshed",latest?"Latest GitHub Pages run #"+latest.run_number+" is "+label(latest)+".":"No GitHub Pages runs were found.",latest?.conclusion==="success"?"✓":"◌");
    }catch(e){
      if(state)state.textContent="OFFLINE";
      if(list)list.innerHTML="<div class='cdm-empty bad-text'>Unable to read GitHub Actions right now. Check your connection and try again.</div>";
      window.cmbEvent?.("Deployment monitor unavailable","GitHub Actions status could not be loaded.","!");
    }finally{if(button)button.disabled=false}
  }
  function wire(){
    if(window.__cmbDeploymentMonitorWired)return;
    const box=root(); if(!box)return;
    window.__cmbDeploymentMonitorWired=true;
    document.getElementById("cmbDeployMonitorRefresh")?.addEventListener("click",refresh);
    refresh();
    setInterval(refresh,60000);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",wire,{once:true});else wire();
})();