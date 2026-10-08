/* CMB AI — apply-fix verification loop */
(()=>{
  const wire=()=>{
    if(window.__cmbFixVerificationWired)return;
    window.__cmbFixVerificationWired=true;
    document.addEventListener("cmb:ai-fix-applied",()=>{
      const state=document.getElementById("acaState");
      if(state)state.textContent="VERIFYING FIX";
      window.cmbEvent?.("AI fix verification started","Running project diagnostics after an AI change was applied.","◌");
      const scan=document.getElementById("cmbDiagScan");
      if(scan)setTimeout(()=>scan.click(),150);
    });
    document.addEventListener("cmb:diagnostics-complete",event=>{
      const count=Number(event.detail?.issues)||0;
      const state=document.getElementById("acaState");
      if(state)state.textContent=count?"FIX NEEDS REVIEW":"FIX VERIFIED";
      window.cmbEvent?.(
        count?"AI fix needs review":"AI fix verified",
        count?count+" diagnostic issue(s) remain after the AI change.":"No high-confidence diagnostic issues remain.",
        count?"!":"✓"
      );
    });
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",wire,{once:true});else wire();
})();