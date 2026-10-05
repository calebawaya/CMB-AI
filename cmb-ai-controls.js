/* CMB AI — unified AI coding controls */
(()=>{
  const actions=document.querySelectorAll("[data-aca-action]");
  const form=document.getElementById("acaForm"),input=document.getElementById("acaInput");
  const result=document.getElementById("acaResult"),stateEl=document.getElementById("acaState");
  if(!actions.length||!result)return;

  const backendDot=document.getElementById("acaBackendDot");
  const backendState=document.getElementById("acaBackendState");
  function setQuick(id,text,mode=""){ const dot=document.getElementById(id); const box=dot?.parentElement; const b=box?.querySelector("b"); if(dot){dot.classList.remove("checking","offline"); if(mode)dot.classList.add(mode);} if(b)b.textContent=text; }
  async function checkBackend(){
    try{
      const r=await fetch("http://127.0.0.1:5000/api/health",{cache:"no-store"});
      if(!r.ok)throw new Error("offline");
      backendDot?.classList.add("online"); backendDot?.classList.remove("offline");
      if(backendState)backendState.textContent="Backend online";
      setQuick("quickBackend","Online");
    }catch(e){
      backendDot?.classList.add("offline"); backendDot?.classList.remove("online");
      if(backendState)backendState.textContent="Backend offline";
      setQuick("quickBackend","Offline","offline");
    }
  }
  setQuick("quickFrontend","Ready");
  setQuick("quickWorkspace", "Ready");
  setQuick("quickDeploy", "Guarded");
  setQuick("quickBackend","Checking","checking");
  checkBackend();
  setInterval(checkBackend,20000);

  const prompts={
    explain:"Explain this code clearly, section by section. Do not modify the code.",
    improve:"Review this code and propose practical improvements while preserving its purpose.",
    debug:"Inspect this code for bugs, broken references, and likely runtime or logic errors. Propose fixes.",
    optimize:"Optimize this code for readability, maintainability, and performance without changing its intended behavior."
  };

  const setState=(text,mode)=>{
    if(stateEl)stateEl.textContent=text;
    window.cmbEvent?.("AI assistant "+mode,text,"✦");
  };

  async function askAI(instruction){
    const file=state.currentFile||"index.html",source=state.files?.[file]||"";
    result.textContent="CMB AI is analyzing "+file+"…";
    setState("AI working","started"); window.reactorThinking?.();
    try{
      const res=await fetch("http://127.0.0.1:5000/api/ai",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({message:instruction+"\n\nCurrent file: "+file+"\n\nCode:\n"+source})
      });
      if(!res.ok)throw new Error("AI request failed");
      const data=await res.json();
      result.textContent=data.response||data.message||data.answer||"AI returned no response.";
      setState("AI ready","completed"); window.reactorResponding?.();
    }catch(err){
      result.textContent="AI backend is offline. Start the CMB AI backend and try again.";
      setState("AI offline","failed"); window.reactorError?.();
    }
  }

  async function previewChange(action){
    result.textContent="Preparing an AI change preview for "+(state.currentFile||"index.html")+"…";
    setState("AI reviewing","started");
    if(window.cmbAIPreviewChange) await window.cmbAIPreviewChange(prompts[action]||"Review this code.");
    else { result.textContent="AI change preview is not available."; setState("AI offline","failed"); }
  }

  actions.forEach(btn=>{
    btn.addEventListener("click",e=>{
      e.preventDefault(); e.stopImmediatePropagation();
      const action=btn.dataset.acaAction;
      if(action==="explain") askAI(prompts.explain);
      else previewChange(action);
    },true);
  });

  form?.addEventListener("submit",e=>{
    e.preventDefault(); e.stopImmediatePropagation();
    const q=input?.value.trim(); if(!q)return;
    askAI(q); if(input)input.value="";
  },true);

  document.getElementById("acaAccept")?.addEventListener("click",()=>{
    window.cmbEvent?.("AI change accepted","The reviewed AI code change was applied to the workspace.","✓");
  },true);
  document.getElementById("acaReject")?.addEventListener("click",()=>{
    window.cmbEvent?.("AI change rejected","The proposed AI change was discarded.","×");
  },true);
  document.getElementById("acaUndo")?.addEventListener("click",()=>{
    window.cmbEvent?.("AI change undone","The last accepted AI change was restored.","↶");
  },true);
})();

/* CMB AI — release report */
(()=>{
  const github=document.getElementById("github");
  if(!github||document.getElementById("releaseReport"))return;
  const style=document.createElement("style");
  style.textContent=`.release-report{margin:10px 18px 0;padding:14px;border:1px solid rgba(56,189,248,.2);background:rgba(3,12,24,.78)}.rr-head{display:flex;justify-content:space-between;align-items:center;gap:12px}.rr-head>div:first-child{display:grid;gap:4px}.rr-head small{font-size:9px;color:#38bdf8;letter-spacing:.8px}.rr-head strong{font-size:13px}.rr-head span{font-size:10px;color:#94a3b8}.rr-buttons{display:flex;gap:7px;flex-wrap:wrap}.release-report pre{margin:10px 0 0;padding:10px;white-space:pre-wrap;word-break:break-word;border:1px solid rgba(148,163,184,.16);border-radius:7px;background:#020617;color:#cbd5e1;font:10px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}.release-report button{cursor:pointer}@media(max-width:700px){.rr-head{align-items:flex-start;flex-direction:column}.rr-buttons{width:100%}.rr-buttons button{flex:1}}`;
  document.head.appendChild(style);
  const panel=document.createElement("section");
  panel.id="releaseReport";
  panel.className="release-report panel";
  panel.innerHTML=`<div class="rr-head"><div><small>RELEASE REPORT</small><strong>Deployment Report</strong><span>Generate a compact report you can review before publishing.</span></div><div class="rr-buttons"><button class="small primary" id="generateReleaseReport">Generate</button><button class="small" id="copyReleaseReport">Copy</button></div></div><pre id="releaseReportText">No release report generated yet.</pre>`;
  const anchor=document.getElementById("releaseSummary");
  anchor?.parentNode?.insertBefore(panel,anchor);
  const report=()=>{
    const decision=document.getElementById("releaseDecision")?.textContent||"NOT CHECKED";
    const confidence=document.getElementById("releaseConfidence")?.textContent||"0%";
    const checks=[...document.querySelectorAll("#releaseCheckList .rc-item")];
    const passed=checks.filter(x=>x.classList.contains("ok")).length;
    const blocked=checks.filter(x=>x.classList.contains("bad")).length;
    const build=document.getElementById("buildState")?.textContent||"READY";
    const time=new Date().toLocaleString();
    return `CMB AI RELEASE REPORT\n====================\nDecision: ${decision}\nConfidence: ${confidence}\nRelease checks: ${passed} passed / ${blocked} blocked\nBuild status: ${build}\nGenerated: ${time}\n\nNext step: ${decision==="RELEASE READY"?"Open Deployment Control and start the GitHub Pages workflow.":"Review Release Insight and resolve the blocked checks."}`;
  };
  document.getElementById("generateReleaseReport")?.addEventListener("click",()=>{
    const out=document.getElementById("releaseReportText");out.textContent=report();window.cmbEvent?.("Release report generated","CMB AI generated a deployment report.","▤");
  });
  document.getElementById("copyReleaseReport")?.addEventListener("click",async()=>{
    const out=document.getElementById("releaseReportText");if(out.textContent==="No release report generated yet.")out.textContent=report();
    try{await navigator.clipboard.writeText(out.textContent);window.cmbEvent?.("Release report copied","Deployment report copied to clipboard.","✓");}catch(e){window.cmbEvent?.("Release report copy failed","Clipboard access was unavailable.","!");}
  });
})();