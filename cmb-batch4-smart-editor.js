/* CMB AI — Batch 4 smart editor layer */
(()=>{
  if(window.__cmbBatch4Loaded)return;
  window.__cmbBatch4Loaded=true;
  const code=()=>document.getElementById("code");
  const toast=(msg)=>{
    const el=document.getElementById("toast");
    if(el){el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),1800);}
  };
  const emit=(title,detail,icon="✓")=>window.cmbEvent?.(title,detail,icon);
  const insertAtCursor=(text)=>{
    const el=code();if(!el)return;
    const start=el.selectionStart,end=el.selectionEnd;
    el.value=el.value.slice(0,start)+text+el.value.slice(end);
    const pos=start+text.length;el.selectionStart=el.selectionEnd=pos;
    el.dispatchEvent(new Event("input",{bubbles:true}));el.focus();
  };
  const selectedLines=()=>{
    const el=code();if(!el)return null;
    const start=Math.min(el.selectionStart,el.selectionEnd),end=Math.max(el.selectionStart,el.selectionEnd);
    const lineStart=el.value.lastIndexOf("\n",start-1)+1;
    let lineEnd=el.value.indexOf("\n",end);
    if(lineEnd<0)lineEnd=el.value.length;
    return {el,start,end,lineStart,lineEnd,text:el.value.slice(lineStart,lineEnd)};
  };
  function indent(){const x=selectedLines();if(!x)return;const out=x.text.split("\n").map(v=>"  "+v).join("\n");x.el.value=x.el.value.slice(0,x.lineStart)+out+x.el.value.slice(x.lineEnd);x.el.selectionStart=x.lineStart;x.el.selectionEnd=x.lineStart+out.length;x.el.dispatchEvent(new Event("input",{bubbles:true}));emit("Editor indent","Selected lines indented.");}
  function outdent(){const x=selectedLines();if(!x)return;const out=x.text.split("\n").map(v=>v.startsWith("  ")?v.slice(2):v.startsWith("\t")?v.slice(1):v).join("\n");x.el.value=x.el.value.slice(0,x.lineStart)+out+x.el.value.slice(x.lineEnd);x.el.selectionStart=x.lineStart;x.el.selectionEnd=x.lineStart+out.length;x.el.dispatchEvent(new Event("input",{bubbles:true}));emit("Editor outdent","Selected lines outdented.");}
  function duplicateSelection(){const el=code();if(!el)return;const s=el.selectionStart,e=el.selectionEnd;const text=el.value.slice(s,e)||el.value.slice(el.value.lastIndexOf("\n",s-1)+1,el.value.indexOf("\n",s)<0?el.value.length:el.value.indexOf("\n",s));if(!text)return;insertAtCursor("\n"+text);emit("Selection duplicated","The selected code was duplicated.");}
  function wrapSelection(){const el=code();if(!el)return;const s=el.selectionStart,e=el.selectionEnd;if(s===e){toast("Select code first");return}const tag=prompt("Wrap selection with tag or function name:","div");if(!tag)return;el.value=el.value.slice(0,s)+"<"+tag+">"+el.value.slice(s,e)+"</"+tag+">"+el.value.slice(e);el.selectionStart=s+tag.length+2;el.selectionEnd=e+tag.length+2;el.dispatchEvent(new Event("input",{bubbles:true}));emit("Selection wrapped","Selected code was wrapped with "+tag+".");}
  function findReplace(){const el=code();if(!el)return;const find=prompt("Find text:");if(find===null||find==="")return;const replace=prompt("Replace with:","");if(replace===null)return;const count=(el.value.match(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/\n/g,"\\n"),"g"))||[]).length;el.value=el.value.split(find).join(replace);el.dispatchEvent(new Event("input",{bubbles:true}));toast(count+" replacement"+(count===1?"":"s"));emit("Find and replace","Replaced "+count+" occurrence(s).");}
  function insertTimestamp(){insertAtCursor(new Date().toLocaleString());emit("Timestamp inserted","Current date and time inserted.");}
  function selectAll(){const el=code();if(!el)return;el.focus();el.select();emit("Code selected","All editor content selected.");}
  function wrapToggle(){const el=code();if(!el)return;el.style.whiteSpace=el.style.whiteSpace==="pre-wrap"?"pre":"pre-wrap";localStorage.setItem("cmbB4Wrap",el.style.whiteSpace);emit("Word wrap changed","Editor word wrapping is now "+(el.style.whiteSpace==="pre-wrap"?"on":"off"));}
  function stats(){const el=code();if(!el)return;const v=el.value;const panel=document.getElementById("cmbB4Stats")||document.createElement("div");panel.id="cmbB4Stats";panel.className="cmb-b4-stats";panel.textContent=`${v.split("\n").length} lines · ${v.length} characters · ${v.trim()?v.trim().split(/\s+/).length:0} words`;el.parentElement?.appendChild(panel);}
  function toolbar(){if(document.getElementById("cmbB4Toolbar"))return;const host=document.getElementById("cmbB2Tools")||document.getElementById("workspace")||document.body;const bar=document.createElement("div");bar.id="cmbB4Toolbar";bar.className="cmb-b4-toolbar";bar.innerHTML=`<b>Smart Edit</b><button data-a="indent">Indent</button><button data-a="outdent">Outdent</button><button data-a="duplicate">Duplicate</button><button data-a="wrap">Wrap</button><button data-a="replace">Find/Replace</button><button data-a="time">Timestamp</button><button data-a="select">Select All</button><button data-a="word">Word Wrap</button>`;host.appendChild(bar);bar.addEventListener("click",e=>{const a=e.target.dataset.a;if(a==="indent")indent();if(a==="outdent")outdent();if(a==="duplicate")duplicateSelection();if(a==="wrap")wrapSelection();if(a==="replace")findReplace();if(a==="time")insertTimestamp();if(a==="select")selectAll();if(a==="word")wrapToggle();});}
  function shortcuts(){document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key==="F"){e.preventDefault();findReplace();}else if((e.ctrlKey||e.metaKey)&&e.altKey&&e.key==="I"){e.preventDefault();indent();}else if((e.ctrlKey||e.metaKey)&&e.altKey&&e.key==="O"){e.preventDefault();outdent();}else if((e.ctrlKey||e.metaKey)&&e.altKey&&e.key==="W"){e.preventDefault();wrapToggle();}});}
  function init(){const el=code();if(el){if(localStorage.getItem("cmbB4Wrap")==="pre-wrap")el.style.whiteSpace="pre-wrap";el.addEventListener("input",stats);stats();}toolbar();shortcuts();emit("Smart editor ready","Batch 4 editor tools are available.");}
  const style=document.createElement("style");style.textContent=`#cmbB4Toolbar{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:10px 0;padding:10px;border:1px solid rgba(80,180,255,.22);border-radius:12px;background:rgba(5,12,25,.72)}#cmbB4Toolbar b{margin-right:4px;font-size:12px}#cmbB4Toolbar button{border:1px solid rgba(120,200,255,.2);background:rgba(20,40,65,.75);color:inherit;border-radius:7px;padding:6px 9px;cursor:pointer;font-size:11px}#cmbB4Toolbar button:hover{filter:brightness(1.25)}.cmb-b4-stats{font-size:11px;opacity:.7;padding:5px 2px}`;document.head.appendChild(style);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
  window.cmbBatch4={indent,outdent,duplicateSelection,wrapSelection,findReplace,insertTimestamp,selectAll,wrapToggle};
})();
