/* CMB AI — AI status → Event Stream → Live Health Monitor */
(()=>{
  let lastKey="";

  const sync=()=>{
    const d=window.CMBAIFrontendStatus||{};
    const online=!!d.online;
    const aiReady=!!d.aiReady;
    const message=aiReady
      ? "AI backend is ready."
      : online
        ? "Backend is online; AI service is not ready."
        : "AI backend is offline.";
    const key=(online?1:0)+":"+(aiReady?1:0)+":"+message;

    if(key!==lastKey){
      lastKey=key;
      window.cmbEvent?.("AI backend status",message,aiReady?"✦":online?"●":"!");
    }

    const cards=document.getElementById("healthChecks");
    if(!cards)return;
    const existing=[...cards.querySelectorAll(".lh-card")].find(card=>card.querySelector("b")?.textContent==="AI Backend");
    const html='<div class="lh-card '+(aiReady?"ok":"bad")+'"><i>'+(aiReady?"✓":"!")+'</i><b>AI Backend</b><span>'+message+'</span></div>';
    if(existing)existing.outerHTML=html;
    else{
      const backend=[...cards.querySelectorAll(".lh-card")].find(card=>card.querySelector("b")?.textContent==="Backend");
      if(backend)backend.insertAdjacentHTML("afterend",html);
      else cards.insertAdjacentHTML("beforeend",html);
    }
  };

  document.addEventListener("cmb:ai-status",e=>{
    window.CMBAIFrontendStatus=e.detail||{};
    sync();
  });

  document.addEventListener("cmb:health",()=>setTimeout(sync,0));
  window.addEventListener("load",()=>setTimeout(sync,1200));

  /* Also catches offline transitions when the AI controls cannot dispatch an event. */
  setInterval(sync,2000);
})();
