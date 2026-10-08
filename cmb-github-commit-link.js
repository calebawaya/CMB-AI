/* CMB AI — last successful GitHub commit navigation */
(()=>{
  const tools=document.querySelector(".cgs-history-tools");
  if(!tools||document.getElementById("cgsViewCommit"))return;
  const button=document.createElement("button");
  button.id="cgsViewCommit";
  button.type="button";
  button.textContent="↗ View commit";
  button.disabled=true;
  button.title="Open the last successful GitHub commit";
  tools.insertBefore(button,document.getElementById("cgsExportHistory")||null);
  function project(){return window.state?.active||null}
  function commit(){
    const name=String(project()?.name||"").trim();
    if(!name)return null;
    try{return JSON.parse(localStorage.getItem("cmbGithubSync:"+name)||"null")?.lastSuccessful?.commit||null}catch{return null}
  }
  function refresh(){button.disabled=!commit()}
  button.addEventListener("click",()=>{
    const sha=commit();
    if(!sha)return;
    window.open("https://github.com/calebawaya/CMB-AI/commit/"+encodeURIComponent(sha),"_blank","noopener,noreferrer");
  });
  ["cmb:open-project","cmb:project-open","cmb:project-closed","cmb:workspace-change","cmb:workspace-sync","cmb:editor-refresh"].forEach(event=>document.addEventListener(event,refresh));
  refresh();
})();
