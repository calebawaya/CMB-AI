/* CMB AI — unified AI coding controls */
(()=>{
  const actions=document.querySelectorAll("[data-aca-action]");
  const form=document.getElementById("acaForm"),input=document.getElementById("acaInput");
  const result=document.getElementById("acaResult"),stateEl=document.getElementById("acaState");
  if(!actions.length||!result)return;
  const backendDot=document.getElementById("acaBackendDot");
  const backendState=document.getElementById("acaBackendState");
  function setQuick(id,text,mode=""){const dot=document.getElementById(id);const box=dot?.parentElement;const b=box?.querySelector("b");if(dot){dot.classList.remove("checking","offline");if(mode)dot.classList.add(mode)}if(b)b.textContent=text}
  async function checkBackend(){
    try{
      const health=await window.CMBAIBackend?.health();
      const ai=await window.CMBAIBackend?.aiStatus();
      const online=!!health?.ok;
      const ready=!!ai?.ok;
      backendDot?.classList.toggle("online",online);
      backendDot?.classList.toggle("offline",!online);
      if(backendState)backendState.textContent=ready?"AI backend ready":online?"Backend online":"Backend offline";
      setQuick("quickBackend",ready?"AI Ready":online?"Online":"Offline",ready||online?"":"offline");
      window.CMBAIFrontendStatus={online,aiReady:ready,health,ai};
      document.dispatchEvent(new CustomEvent("cmb:ai-status",{detail:{online,aiReady:ready,health,ai}}));
    }catch(e){
      backendDot?.classList.add("offline");
      backendDot?.classList.remove("online");
      if(backendState)backendState.textContent="Backend offline";
      setQuick("quickBackend","Offline","offline");
      window.CMBAIFrontendStatus={online:false,aiReady:false,error:String(e?.message||e)};
    }
  }
  setQuick("quickFrontend","Ready");setQuick("quickWorkspace","Ready");setQuick("quickDeploy","Guarded");setQuick("quickBackend","Checking","checking");checkBackend();setInterval(checkBackend,20000);
  const prompts={explain:"Explain this code clearly, section by section. Do not modify the code.",improve:"Review this code and propose practical improvements while preserving its purpose.",debug:"Inspect this code for bugs, broken references, and likely runtime or logic errors. Propose fixes.",optimize:"Optimize this code for readability, maintainability, and performance without changing its intended behavior."};
  const setState=(text,mode)=>{if(stateEl)stateEl.textContent=text;window.cmbEvent?.("AI assistant "+mode,text,"✦")};
  function buildProjectContext(activeFile){const files=window.state?.files||{};const entries=Object.entries(files);let total=0;const parts=[];for(const [path,content] of entries){const text=String(content??"");const limit=path===activeFile?18000:7000;if(total+Math.min(text.length,limit)>52000)continue;const clipped=text.slice(0,limit);parts.push("\n--- "+path+" ---\n"+clipped+(text.length>limit?"\n[truncated]":""));total+=clipped.length}return parts.join("").trim()}
  async function askAI(instruction){const file=state.currentFile||"index.html",source=state.files?.[file]||"",context=buildProjectContext(file);const projectName=window.state?.active?.name||"Untitled Project";const projectDescription=window.state?.active?.idea||window.state?.active?.description||"";const enrichedInstruction="Project: "+projectName+"\nProject description: "+projectDescription+"\n\n"+instruction;result.textContent="CMB AI is analyzing "+file+" with project context…";setState("AI working","started");window.reactorThinking?.();try{const res=await fetch( (window.CMB_API_BASE || "http://127.0.0.1:5000/api")+"/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:enrichedInstruction+"\n\nActive file: "+file+"\n\nProject workspace context:\n"+context,project_id:window.state?.active?.backendId||null})});if(!res.ok)throw new Error("AI request failed");const data=await res.json();result.textContent=data.answer||data.response||data.message||"AI returned no response.";setState("AI ready","completed");window.reactorResponding?.()}catch(err){result.textContent="AI backend is offline. Start the CMB AI backend and try again.";setState("AI offline","failed");window.reactorError?.()}}
  async function previewChange(action){result.textContent="Preparing an AI change preview for "+(state.currentFile||"index.html")+"…";setState("AI reviewing","started");if(window.cmbAIPreviewChange){await window.cmbAIPreviewChange((prompts[action]||"Review this code.")+"\n\nUse the full project workspace context when identifying cross-file issues. Keep the proposed change focused and do not modify unrelated files.");}else{result.textContent="AI change preview is not available.";setState("AI offline","failed")}}
  actions.forEach(btn=>btn.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();const action=btn.dataset.acaAction;if(action==="explain")askAI(prompts.explain);else previewChange(action)},true));
  form?.addEventListener("submit",e=>{e.preventDefault();e.stopImmediatePropagation();const q=input?.value.trim();if(!q)return;askAI(q);if(input)input.value=""},true);
})();

/* CMB AI — release report */
(()=>{const github=document.getElementById("github");if(!github||document.getElementById("releaseReport"))return;const style=document.createElement("style");style.textContent=`.release-report{margin:10px 18px 0;padding:14px;border:1px solid rgba(56,189,248,.2);background:rgba(3,12,24,.78)}.rr-head{display:flex;justify-content:space-between;align-items:center;gap:12px}.rr-head>div:first-child{display:grid;gap:4px}.rr-head small{font-size:9px;color:#38bdf8;letter-spacing:.8px}.rr-head strong{font-size:13px}.rr-head span{font-size:10px;color:#94a3b8}.rr-buttons{display:flex;gap:7px;flex-wrap:wrap}.release-report pre{margin:10px 0 0;padding:10px;white-space:pre-wrap;word-break:break-word;border:1px solid rgba(148,163,184,.16);border-radius:7px;background:#020617;color:#cbd5e1;font:10px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}.release-report button{cursor:pointer}@media(max-width:700px){.rr-head{align-items:flex-start;flex-direction:column}.rr-buttons{width:100%}.rr-buttons button{flex:1}}`;document.head.appendChild(style);const panel=document.createElement("section");panel.id="releaseReport";panel.className="release-report panel";panel.innerHTML=`<div class="rr-head"><div><small>RELEASE REPORT</small><strong>Deployment Report</strong><span>Generate a compact report you can review before publishing.</span></div><div class="rr-buttons"><button class="small primary" id="generateReleaseReport">Generate</button><button class="small" id="copyReleaseReport">Copy</button></div></div><pre id="releaseReportText">No release report generated yet.</pre>`;const anchor=document.getElementById("releaseSummary");anchor?.parentNode?.insertBefore(panel,anchor);const report=()=>{const decision=document.getElementById("releaseDecision")?.textContent||"NOT CHECKED";const confidence=document.getElementById("releaseConfidence")?.textContent||"0%";const checks=[...document.querySelectorAll("#releaseCheckList .rc-item")];const passed=checks.filter(x=>x.classList.contains("ok")).length;const blocked=checks.filter(x=>x.classList.contains("bad")).length;const build=document.getElementById("buildState")?.textContent||"READY";return `CMB AI RELEASE REPORT\n====================\nDecision: ${decision}\nConfidence: ${confidence}\nRelease checks: ${passed} passed / ${blocked} blocked\nBuild status: ${build}\nGenerated: ${new Date().toLocaleString()}\n\nNext step: ${decision==="RELEASE READY"?"Open Deployment Control and start the GitHub Pages workflow.":"Review Release Insight and resolve the blocked checks."}`};document.getElementById("generateReleaseReport")?.addEventListener("click",()=>{const out=document.getElementById("releaseReportText");out.textContent=report();window.cmbEvent?.("Release report generated","CMB AI generated a deployment report.","▤")});document.getElementById("copyReleaseReport")?.addEventListener("click",async()=>{const out=document.getElementById("releaseReportText");if(out.textContent==="No release report generated yet.")out.textContent=report();try{await navigator.clipboard.writeText(out.textContent);window.cmbEvent?.("Release report copied","Deployment report copied to clipboard.","✓")}catch(e){window.cmbEvent?.("Release report copy failed","Clipboard access was unavailable.","!")}})})();

/* CMB AI — real AI change workflow */
(()=>{const panel=document.getElementById("acaChangePanel"),accept=document.getElementById("acaAccept"),reject=document.getElementById("acaReject"),undo=document.getElementById("acaUndo");if(!panel||!accept||!reject||!undo)return;let lastAccepted=null;const editor=()=>document.getElementById("code");const syncEditor=(value,file)=>{const box=editor();if(!box)return false;box.value=value;box.dispatchEvent(new Event("input",{bubbles:true}));box.dispatchEvent(new Event("change",{bubbles:true}));if(window.state?.files)window.state.files[file]=value;if(typeof window.saveCurrent==="function")window.saveCurrent();document.dispatchEvent(new CustomEvent("cmb:editor-refresh"));return true};accept.addEventListener("click",()=>{const file=window.state?.currentFile||"index.html",before=document.getElementById("acaBefore")?.textContent||window.state?.files?.[file]||"",proposed=document.getElementById("acaAfter")?.textContent||"";if(!proposed.trim()){window.cmbEvent?.("AI change unavailable","There is no proposed code to accept.","!");return}lastAccepted={file,before,after:proposed};if(syncEditor(proposed,file)){panel.classList.add("hidden");window.cmbEvent?.("AI code applied","The proposed code is now in the editor for "+file+".","✓")}},true);reject.addEventListener("click",()=>{panel.classList.add("hidden");window.cmbEvent?.("AI change rejected","The proposed code was discarded without changing the editor.","×")},true);undo.addEventListener("click",()=>{if(!lastAccepted){window.cmbEvent?.("Nothing to undo","No accepted AI code change is available.","!");return}if(syncEditor(lastAccepted.before,lastAccepted.file)){window.cmbEvent?.("AI code restored","The previous version of "+lastAccepted.file+" was restored.","↶");lastAccepted=null;panel.classList.add("hidden")}},true)})();

/* CMB AI — AI project file generator */
(()=>{
  if(document.getElementById("aiFileGenerator"))return;
  const workspace=document.getElementById("workspace");if(!workspace)return;
  const style=document.createElement("style");style.textContent=`.ai-file-generator{margin:10px 0;padding:14px;border:1px solid rgba(56,189,248,.22);border-radius:12px;background:linear-gradient(135deg,rgba(3,12,24,.94),rgba(7,20,42,.82));box-shadow:0 0 24px rgba(14,165,233,.08)}.aifg-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.aifg-head>div{display:grid;gap:4px}.aifg-head small{font-size:9px;color:#38bdf8;letter-spacing:1px}.aifg-head strong{font-size:14px}.aifg-head span{font-size:10px;color:#94a3b8}.aifg-status{font-size:9px;padding:5px 8px;border:1px solid rgba(56,189,248,.2);border-radius:999px;color:#7dd3fc;white-space:nowrap}.aifg-form{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:12px}.aifg-options{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.aifg-option{font-size:9px;color:#94a3b8}.aifg-result{margin-top:10px;padding:10px;border:1px solid rgba(148,163,184,.14);border-radius:8px;background:#020617;font:10px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;color:#cbd5e1;white-space:pre-wrap;max-height:180px;overflow:auto}.aifg-files{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:9px}.aifg-file{padding:8px;border:1px solid rgba(148,163,184,.14);border-radius:7px;background:rgba(15,23,42,.7)}.aifg-file b{display:block;font-size:10px}.aifg-file span{font-size:9px;color:#64748b}.aifg-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}@media(max-width:650px){.aifg-form{grid-template-columns:1fr}.aifg-files{grid-template-columns:1fr}.aifg-head{flex-direction:column}}`;document.head.appendChild(style);
  const panel=document.createElement("section");panel.id="aiFileGenerator";panel.className="ai-file-generator panel";panel.innerHTML=`<div class="aifg-head"><div><small>AI PROJECT GENERATOR</small><strong>Generate Project Files</strong><span>Describe a feature and CMB AI will create connected HTML, CSS, and JavaScript files.</span></div><span id="aifgStatus" class="aifg-status">READY</span></div><form id="aifgForm" class="aifg-form"><input id="aifgPrompt" class="input" maxlength="1200" placeholder="Example: Create a modern landing page for a Ghanaian tech company"><button class="primary" type="submit">✦ Generate</button></form><div class="aifg-options"><label class="aifg-option"><input id="aifgHtml" type="checkbox" checked> HTML</label><label class="aifg-option"><input id="aifgCss" type="checkbox" checked> CSS</label><label class="aifg-option"><input id="aifgJs" type="checkbox" checked> JavaScript</label></div><div id="aifgResult" class="aifg-result">No files generated yet.</div><div id="aifgFiles" class="aifg-files"></div><div class="aifg-actions"><button class="small primary" id="aifgApply" type="button" disabled>✓ Add to workspace</button><button class="small" id="aifgOpen" type="button" disabled>Open generated files</button></div>`;
  const editor=document.querySelector("#workspace .editor");editor?.parentNode?.insertBefore(panel,editor);
  let generated=null;const status=text=>{const s=document.getElementById("aifgStatus");if(s)s.textContent=text};const resultEl=document.getElementById("aifgResult"),filesEl=document.getElementById("aifgFiles"),apply=document.getElementById("aifgApply"),open=document.getElementById("aifgOpen");
  const renderFiles=()=>{if(!generated){filesEl.innerHTML="";return}filesEl.innerHTML=Object.entries(generated).map(([name,code])=>`<div class="aifg-file"><b>${name}</b><span>${String(code).split("\n").length} lines generated</span></div>`).join("")};
  const parseResponse=raw=>{let text=String(raw||"").trim().replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```$/i,"").trim();try{const p=JSON.parse(text);if(p.files&&typeof p.files==="object")return p.files}catch(e){}const m=text.match(/\{[\s\S]*\}/);if(m)try{const p=JSON.parse(m[0]);if(p.files&&typeof p.files==="object")return p.files}catch(e){}return null};
  document.getElementById("aifgForm")?.addEventListener("submit",async e=>{e.preventDefault();const prompt=document.getElementById("aifgPrompt")?.value.trim();if(!prompt)return;const wanted=[document.getElementById("aifgHtml")?.checked?"HTML":"",document.getElementById("aifgCss")?.checked?"CSS":"",document.getElementById("aifgJs")?.checked?"JavaScript":""].filter(Boolean).join(", ");if(!wanted){resultEl.textContent="Select at least one file type.";return}status("GENERATING");resultEl.textContent="CMB AI is generating connected project files…";filesEl.innerHTML="";apply.disabled=true;open.disabled=true;generated=null;window.reactorThinking?.();const instruction=`Generate a small, connected web project for this request: ${prompt}\n\nReturn ONLY valid JSON with this exact shape: {"files":{"index.html":"...","style.css":"...","script.js":"..."}}. Generate only these requested file types: ${wanted}. Use relative references between files. Keep the code complete and runnable. Do not include markdown fences or explanations.`;try{const r=await fetch( (window.CMB_API_BASE || "http://127.0.0.1:5000/api")+"/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:instruction,project_id:window.state?.active?.backendId||null})});if(!r.ok)throw new Error("AI request failed");const d=await r.json();generated=parseResponse(d.answer||d.response||d.message||"");if(!generated||!Object.keys(generated).length)throw new Error("Invalid AI file response");resultEl.textContent="Files generated successfully. Review them before adding them to the workspace.";renderFiles();apply.disabled=false;open.disabled=false;status("READY");window.reactorResponding?.();window.cmbEvent?.("AI files generated","CMB AI generated "+Object.keys(generated).length+" connected project files.","✦")}catch(err){status("OFFLINE");resultEl.textContent="AI file generation failed. Make sure the CMB AI backend is running and try again.";window.reactorError?.();window.cmbEvent?.("AI file generation failed","The backend could not generate project files.","!")}});
  apply?.addEventListener("click",()=>{if(!generated)return;const names=Object.keys(generated);if(typeof state==="undefined"||!state.files){resultEl.textContent="Workspace state is unavailable.";return}names.forEach(name=>state.files[name]=String(generated[name]??""));state.currentFile=names[0]||state.currentFile;try{save()}catch(e){}try{renderFiles()}catch(e){}resultEl.textContent=names.length+" generated file(s) added to the workspace.";status("APPLIED");window.cmbEvent?.("AI files added","Generated files were added to the current workspace.","✓");document.dispatchEvent(new CustomEvent("cmb:ai-files-generated",{detail:{files:generated}}));apply.disabled=true;try{openFile(state.currentFile)}catch(e){}});
  open?.addEventListener("click",()=>{const name=Object.keys(generated||{})[0];if(!name)return;try{openFile(name)}catch(e){}window.cmbEvent?.("Generated file opened",name+" opened in the workspace editor.","▣")});
})();

/* CMB AI — persist AI action-plan tasks */
(()=>{
  const originalBuild=window.buildActionPlan;
  if(typeof originalBuild==="function"){
    window.buildActionPlan=function(){
      const result=originalBuild.apply(this,arguments);
      setTimeout(()=>{
        document.querySelectorAll('#actionPlanList input[type="checkbox"]').forEach(box=>{
          const label=box.closest('label')?.querySelector('span')?.textContent?.trim();
          if(label)document.dispatchEvent(new CustomEvent("cmb:ai-task-created",{detail:{title:label}}));
        });
      },100);
      return result;
    };
  }
  document.addEventListener("change",event=>{
    const box=event.target;
    if(!box.matches('#actionPlanList input[type="checkbox"]'))return;
    const taskId=box.dataset.taskId||box.closest('label')?.dataset?.taskId;
    if(taskId)document.dispatchEvent(new CustomEvent("cmb:ai-task-updated",{detail:{taskId,completed:box.checked}}));
  });
})();

/* CMB AI — live task progress sync */
(()=>{
 const fill=document.getElementById("progressFill"),textEl=document.getElementById("aiProgressText"),meta=document.getElementById("progressMeta");
 if(!fill&&!textEl&&!meta)return;
 document.addEventListener("cmb:task-progress",event=>{
   const d=event.detail||{},percent=Number(d.percent)||0,total=Number(d.total)||0,done=Number(d.completed)||0;
   if(fill)fill.style.width=Math.max(0,Math.min(100,percent))+"%";
   if(textEl)textEl.textContent=percent+"%";
   if(meta)meta.textContent=done+" of "+total+" tasks completed";
 });
})();

/* CMB AI — restore persisted event stream */
(()=>{
  document.addEventListener("cmb:project-events-restored",event=>{
    const list=document.getElementById("eventStreamList");
    const events=event.detail?.events||[];
    if(!list||!events.length)return;
    list.innerHTML="";
    [...events].reverse().forEach(ev=>{
      const row=document.createElement("div");row.className="as-item";
      const time=document.createElement("time");time.textContent=ev.created_at?new Date(ev.created_at).toLocaleTimeString():"";
      const body=document.createElement("div");
      const title=document.createElement("b");title.textContent=ev.event_type||"workspace.event";
      const msg=document.createElement("span");msg.textContent=ev.message||"";
      body.append(title,msg);row.append(time,body);list.appendChild(row);
    });
  });
})();