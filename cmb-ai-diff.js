/* CMB AI — line-by-line AI diff renderer */
(()=>{
 const panel=document.getElementById("acaChangePanel"),before=document.getElementById("acaBefore"),after=document.getElementById("acaAfter");
 if(!panel||!before||!after)return;
 const render=(el,text,kind)=>{
   const lines=String(text||"").split("\n");
   const box=document.createElement("div"); box.className="aca-line-diff";
   lines.forEach((line,i)=>{
     const row=document.createElement("div"); row.className="aca-diff-line "+kind;
     const n=document.createElement("span"); n.className="ln"; n.textContent=i+1;
     const value=document.createElement("span"); value.textContent=line||" ";
     row.append(n,value); box.appendChild(row);
   });
   el.replaceWith(box);
   return box;
 };
 let originalBefore=before,originalAfter=after;
 function refresh(){
   const current=document.querySelector("#acaBefore"),proposed=document.querySelector("#acaAfter");
   if(!current||!proposed||current.dataset.diffReady==="1")return;
   current.dataset.diffReady="1"; proposed.dataset.diffReady="1";
   const a=String(current.textContent||"").split("\n"),b=String(proposed.textContent||"").split("\n");
   const max=Math.max(a.length,b.length),old=current,newEl=proposed;
   const oldBox=document.createElement("div"),newBox=document.createElement("div");
   oldBox.className="aca-line-diff";newBox.className="aca-line-diff";
   for(let i=0;i<max;i++){
     const av=a[i],bv=b[i];
     const make=(line,num,type)=>{
       const row=document.createElement("div");row.className="aca-diff-line "+type;
       const n=document.createElement("span");n.className="ln";n.textContent=num;
       const v=document.createElement("span");v.textContent=line??"";row.append(n,v);return row;
     };
     let left="same",right="same";
     if(av===undefined){right="added"}else if(bv===undefined){left="removed"}else if(av!==bv){left="changed";right="changed"}
     oldBox.appendChild(make(av,i+1,left));newBox.appendChild(make(bv,i+1,right));
   }
   old.replaceWith(oldBox);newEl.replaceWith(newBox);
 }
 const observer=new MutationObserver(refresh);
 observer.observe(panel,{childList:true,subtree:true,characterData:true});
 refresh();
 window.cmbEvent?.("AI diff renderer online","Line-by-line change highlighting is ready for AI reviews.","≋");
})();