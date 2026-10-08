/* CMB AI — project-wide diagnostics */
(()=>{
  if(document.getElementById("cmbProjectDiagnostics"))return;
  const form=document.getElementById("acaForm");
  if(!form)return;
  const panel=document.createElement("section");
  panel.id="cmbProjectDiagnostics";
  panel.className="panel";
  panel.style.cssText="margin:10px 0;padding:12px;border:1px solid rgba(56,189,248,.2);border-radius:10px;background:rgba(2,6,23,.78)";
  panel.innerHTML='<strong>PROJECT DIAGNOSTICS</strong><div style="margin:6px 0;color:#94a3b8;font-size:10px">Scan the open project for high-confidence cross-file problems without changing files.</div><div id="cmbDiagSummary" style="margin:7px 0;font-size:10px;color:#7dd3fc">READY</div><button class="small primary" id="cmbDiagScan" type="button">Scan project</button> <button class="small" id="cmbDiagCopy" type="button" disabled>Copy report</button><div id="cmbDiagIssues" style="margin-top:9px"></div><pre id="cmbDiagResult" style="margin-top:9px;white-space:pre-wrap;max-height:240px;overflow:auto">No scan run yet.</pre>';
  form.parentNode?.insertBefore(panel,form.nextSibling);
  const scan=document.getElementById("cmbDiagScan");
  const copy=document.getElementById("cmbDiagCopy");
  const out=document.getElementById("cmbDiagResult");
  const summary=document.getElementById("cmbDiagSummary");
  const issuesBox=document.getElementById("cmbDiagIssues");
  let lastReport="";
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
  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
  const openFile=path=>{
    if(!path||!window.state?.files?.[path])return;
    window.state.currentFile=path;
    document.dispatchEvent(new Event("cmb:editor-refresh"));
    window.renderEditor?.();
    window.renderFiles?.();
    window.cmbEvent?.("Diagnostic file opened",path,"⌕");
  };
  scan?.addEventListener("click",async()=>{
    const project=window.state?.active;
    if(!project){summary.textContent="NO PROJECT";out.textContent="Open a project before running diagnostics.";issuesBox.innerHTML="";return}
    scan.disabled=true;copy.disabled=true;issuesBox.innerHTML="";summary.textContent="SCANNING";
    out.textContent="CMB AI is scanning the project…";
    const prompt="Analyze this web project for high-confidence syntax errors, broken file references, missing functions or IDs, and likely runtime problems. Do not modify files. Return concise JSON: {summary,severity,issues:[{file,line,title,detail,fix}]}. Avoid speculative style opinions. Project: "+(project.name||"Untitled Project")+"\nDescription: "+(project.idea||project.description||"")+"\nWorkspace:\n"+context();
    try{
      const r=await fetch((window.CMB_API_BASE||"http://127.0.0.1:5000/api")+"/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,project_id:project.backendId||null})});
      if(!r.ok)throw new Error("AI request failed");
      const d=await r.json();
      const raw=String(d.answer||d.response||d.message||"").trim();
      let data;
      try{data=JSON.parse(raw.replace(/^```json\s*/i,"").replace(/```$/,"" ).trim())}catch(e){data=null}
      if(!data)throw new Error("Invalid diagnostic response");
      const issues=Array.isArray(data.issues)?data.issues:[];
      const severity=String(data.severity||"unknown").toUpperCase();
      summary.textContent=severity+" • "+issues.length+" ISSUE"+(issues.length===1?"":"S");
      issuesBox.innerHTML=issues.map((x,i)=>`<div style="margin:6px 0;padding:8px;border:1px solid rgba(148,163,184,.14);border-radius:8px;background:rgba(15,23,42,.7)"><div style="font-size:10px"><b>${i+1}. ${esc(x.title||"Issue")}</b></div><div style="margin-top:3px;font-size:9px;color:#94a3b8">${esc(x.file||"unknown")}:${esc(x.line||"?")}</div><div style="margin-top:5px;font-size:9px;color:#cbd5e1">${esc(x.detail||"")}</div><div style="margin-top:4px;font-size:9px;color:#7dd3fc">Fix: ${esc(x.fix||"Review this issue.")}</div>${window.state?.files?.[x.file]?`<button class="small" data-cmb-open-diagnostic="${esc(x.file)}" type="button" style="margin-top:6px">Open file</button>`:""}</div>`).join("");
      issuesBox.querySelectorAll("[data-cmb-open-diagnostic]").forEach(btn=>btn.addEventListener("click",()=>openFile(btn.getAttribute("data-cmb-open-diagnostic"))));
      lastReport="CMB AI PROJECT DIAGNOSTIC REPORT\nProject: "+(project.name||"Untitled Project")+"\nSeverity: "+severity+"\nSummary: "+(data.summary||"No summary provided.")+"\nIssues found: "+issues.length+"\n\n"+issues.map((x,i)=>(i+1)+". "+(x.file||"unknown")+":"+(x.line||"?")+" — "+(x.title||"Issue")+"\n   "+(x.detail||"")+"\n   Fix: "+(x.fix||"Review this issue.")).join("\n\n");
      out.textContent=lastReport;copy.disabled=false;
      window.cmbEvent?.("Project diagnostics complete",issues.length?issues.length+" issue(s) detected.":"No high-confidence issues detected.",issues.length?"!":"✓");
    }catch(e){
      summary.textContent="FAILED";issuesBox.innerHTML="";out.textContent="Project diagnostic scan failed. Make sure the CMB AI backend is online and try again.";
      window.cmbEvent?.("Project diagnostics failed","The diagnostic scan could not complete.","!");
    }finally{scan.disabled=false}
  });
  copy?.addEventListener("click",async()=>{
    try{await navigator.clipboard.writeText(lastReport||out.textContent);window.cmbEvent?.("Diagnostic report copied","Project diagnostic report copied to clipboard.","✓")}catch(e){window.cmbEvent?.("Diagnostic report copy failed","Clipboard access was unavailable.","!")}
  });
})();