/* CMB AI — unified AI coding controls
   This layer prevents duplicate action handlers from firing and keeps
   Explain / Improve / Debug / Optimize behavior predictable. */
(()=>{
  const actions=document.querySelectorAll("[data-aca-action]");
  const form=document.getElementById("acaForm");
  const input=document.getElementById("acaInput");
  const result=document.getElementById("acaResult");
  const stateEl=document.getElementById("acaState");
  if(!actions.length||!result)return;

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

  async function explainOnly(instruction){
    const file=state.currentFile||"index.html";
    const source=state.files?.[file]||"";
    result.textContent="CMB AI is analyzing "+file+"…";
    setState("AI working","started");
    window.reactorThinking?.();
    try{
      const res=await fetch("http://127.0.0.1:5000/api/ai",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({message:instruction+"\n\nCurrent file: "+file+"\n\nCode:\n"+source})
      });
      if(!res.ok)throw new Error("AI request failed");
      const data=await res.json();
      result.textContent=data.response||data.message||data.answer||"AI returned no explanation.";
      setState("AI ready","completed");
      window.reactorResponding?.();
    }catch(err){
      result.textContent="AI backend is offline. Start the CMB AI backend and try again.";
      setState("AI offline","failed");
      window.reactorError?.();
    }
  }

  actions.forEach(btn=>{
    btn.addEventListener("click",e=>{
      e.preventDefault();
      e.stopImmediatePropagation();
      const action=btn.dataset.acaAction;
      if(action==="explain"){
        explainOnly(prompts.explain);
      }else if(window.cmbAIPreviewChange){
        result.textContent="Preparing an AI change preview for "+(state.currentFile||"index.html")+"…";
        setState("AI reviewing","started");
        window.cmbAIPreviewChange(prompts[action]||"Review this code.");
      }
    },true);
  });

  if(form&&input){
    form.addEventListener("submit",e=>{
      e.stopImmediatePropagation();
    },true);
  }

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