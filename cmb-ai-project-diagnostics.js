/* CMB AI — project-wide diagnostics */
(()=>{
  if(document.getElementById("cmbProjectDiagnostics"))return;
  const form=document.getElementById("acaForm");
  if(!form)return;
  const panel=document.createElement("section");
  panel.id="cmbProjectDiagnostics";
  panel.className="panel";
  panel.style.cssText="margin:10px 0;padding:12px;border:1px solid rgba(56,189,248,.2);border-radius:10px;background:rgba(2,6,23,.78)";
  panel.innerHTML='<strong>PROJECT DIAGNOSTICS</strong><div style="margin:6px 0;color:#94a3b8;font-size:10px">Scan the open project for high-confidence cross-file problems without changing files.</div><button class="small primary" id="cmbDiagScan" type="button">Scan project</button> <button class="small" id="cmbDiagCopy" type="button" disabled>Copy report</button><pre id="cmbDiagResult" style="margin-top:9px;white-space:pre-wrap;max-height:240px;overflow:auto">No scan run yet.</pre>';
  form.parentNode?.insertBefore(panel,form.nextSibling);
  const scan=document.getElementById("cmbDiagScan");
  const copy=document.getElementById("cmbDiagCopy");
  const out=document.getElementById("cmbDiagResult");
  const context=()=>{
    const files=window.state?.files||{};
    let total=0;
    return Object.entries(files).map(([path,value])=>{
      const text=String(value??"");
      const limit=path===window.state?.currentFile?12000:4000;
      if(total+Math.min(text.length,limit)>45000)return "";
      total+=Math.min(text.length,limit);
      return "\n--- "+path+" ---\n"+text.slice(0,limit)+(text.length>limit?"\n[truncated]":"");
    }).join("").trim();
  };
  scan?.addEventListener("click",async()=>{
    const project=window.state?.active;
    if(!project){out.textContent="Open a project before running diagnostics.";return}
    scan.disabled=true;copy.disabled=true;
    out.textContent="CMB AI is scanning the project…";
    const prompt="Analyze this web project for high-confidence syntax errors, broken file references, missing functions or IDs, and likely runtime problems. Do not modify files. Return concise JSON: {summary,severity,issues:[{file,line,title,detail,fix}]}. Avoid speculative style opinions. Project: "+(project.name||"Untitled Project")+"\nDescription: "+(project.idea||project.description||"")+"\nWorkspace:\n"+context();
    try{
      const r=await fetch((window.CMB_API_BASE||"http://127.0.0.1:5000/api")+"/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,project_id:project.backendId||null})});
      if(!r.ok)throw new Error("AI request failed");
      const d=await r.json();
      const raw=String(d.answer||d.response||d.message||"").trim();
      let data;
      try{data=JSON.parse(raw.replace(/^\`\`\`json\s*/i,"").replace(/\`\`\`$/,"").trim())}catch(e){data=null}
      if(!data)throw new Error("Invalid diagnostic response");
      const issues=Array.isArray(data.issues)?data.issues:[];
      out.textContent="CMB AI PROJECT DIAGNOSTIC REPORT\nProject: "+(project.name||"Untitled Project")+"\nSeverity: "+(data.severity||"unknown")+"\nSummary: "+(data.summary||"No summary provided.")+"\nIssues found: "+issues.length+"\n\n"+issues.map((x,i)=>(i+1)+". "+(x.file||"unknown")+":"+(x.line||"?")+" — "+(x.title||"Issue")+"\n   "+(x.detail||"")+"\n   Fix: "+(x.fix||"Review this issue.")).join("\n\n");
      copy.disabled=false;
      window.cmbEvent?.("Project diagnostics complete",issues.length?issues.length+" issue(s) detected.":"No high-confidence issues detected.",issues.length?"!":"✓");
    }catch(e){
      out.textContent="Project diagnostic scan failed. Make sure the CMB AI backend is online and try again.";
      window.cmbEvent?.("Project diagnostics failed","The diagnostic scan could not complete.","!");
    }finally{scan.disabled=false}
  });
  copy?.addEventListener("click",async()=>{
    try{await navigator.clipboard.writeText(out.textContent);window.cmbEvent?.("Diagnostic report copied","Project diagnostic report copied to clipboard.","✓")}catch(e){}
  });
})();