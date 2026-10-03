const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];

const builder={blocks:[],selected:null,history:[],future:[],historyLock:false};
function snapshot(){return JSON.stringify(builder.blocks)}
function pushHistory(){if(builder.historyLock)return;const s=snapshot();if(builder.history[builder.history.length-1]!==s)builder.history.push(s);if(builder.history.length>30)builder.history.shift();builder.future=[]}
function restoreSnapshot(s){builder.historyLock=true;builder.blocks=JSON.parse(s||"[]");builder.selected=null;renderBuilder();$("#inspector")?.classList.add("hidden");$("#inspectorEmpty")?.classList.remove("hidden");builder.historyLock=false}
function undoBuilder(){if(builder.history.length<2)return toast("Nothing to undo");const current=builder.history.pop();builder.future.push(current);restoreSnapshot(builder.history[builder.history.length-1])}
function redoBuilder(){if(!builder.future.length)return toast("Nothing to redo");const next=builder.future.pop();builder.history.push(next);restoreSnapshot(next)}
function duplicateSelected(){const b=builder.blocks.find(x=>x.id===builder.selected);if(!b)return toast("Select a block first");pushHistory();const copy=JSON.parse(JSON.stringify(b));copy.id=Date.now()+Math.random();builder.blocks.splice(builder.blocks.indexOf(b)+1,0,copy);builder.selected=copy.id;renderBuilder();selectBlock(copy.id)}
function moveSelected(dir){const i=builder.blocks.findIndex(x=>x.id===builder.selected);if(i<0)return toast("Select a block first");const n=i+dir;if(n<0||n>=builder.blocks.length)return;pushHistory();[builder.blocks[i],builder.blocks[n]]=[builder.blocks[n],builder.blocks[i]];renderBuilder();selectBlock(builder.blocks[n].id)}

const state={assets:[],
  projects:JSON.parse(localStorage.getItem("cmbai_projects")||"[]"),
  active:null,
  files:{
    "index.html":"<!doctype html>\n<html>\n<head><title>My CMB AI Site</title></head>\n<body><h1>Hello from CMB AI</h1><p>Build your idea here.</p></body>\n</html>",
    "style.css":"body{font-family:system-ui;margin:0;padding:40px;background:#f5f7fb;color:#172033}",
    "script.js":"console.log('CMB AI ready');"
  },
  currentFile:"index.html"
};

function save(){localStorage.setItem("cmbai_projects",JSON.stringify(state.projects))}
function toast(x){const t=$("#toast");t.textContent=x;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
function view(n){
  $$(".view").forEach(x=>x.classList.add("hidden"));
  $("#"+n).classList.remove("hidden");
  $$(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===n));
  const names={dashboard:"Build something great.",workspace:"Your project workspace.",builder:"Design your website.",projects:"Your projects.",github:"Connect and deploy.",settings:"Make CMB AI yours."};
  $("#title").textContent=names[n];$("#eyebrow").textContent=n.toUpperCase();
  if(n==="projects")renderProjects();
}
function newProject(){
  const p={id:Date.now(),name:"New CMB AI Project",idea:"",progress:0,created:new Date().toLocaleDateString(),files:JSON.parse(JSON.stringify(state.files))};
  state.projects.unshift(p);state.active=p;state.files=p.files;state.currentFile="index.html";
  save();openProject(p);renderFiles();view("workspace");toast("New project created");
}
function openProject(p){
  state.active=p;state.files=p.files||state.files;state.currentFile=Object.keys(state.files)[0]||"index.html";
  $("#projectName").textContent=p.name;$("#idea").value=p.idea||"";setProgress(p.progress||0);renderFiles();
}
function setProgress(v){
  if(state.active){state.active.progress=v;state.active.files=state.files;save()}
  $("#progressBar").style.width=v+"%";$("#progressText").textContent=v+"%";$("#progressCount").textContent=v+"%";
}
function makePlan(){
  const idea=$("#idea").value.trim();
  if(!idea){toast("Describe your project first");return}
  if(!state.active){newProject();return}
  state.active.idea=idea;state.active.name=idea.split(/\s+/).slice(0,4).join(" ")+" Project";
  $("#projectName").textContent=state.active.name;
  const tasks=["Define the main user problem","Design the page structure","Build the HTML interface","Style the responsive UI","Add JavaScript interactions","Test desktop and mobile","Prepare for GitHub"];
  $("#tasks").innerHTML=tasks.map(x=>"<label class='task'><input type='checkbox'> "+x+"</label>").join("");
  $$(".task input").forEach(x=>x.onchange=()=>setProgress(Math.round($$(".task input:checked").length/tasks.length*100)));
  save();addChat("CMB AI","I created a 7-step build plan for your idea.");toast("Build plan created");
}
function addChat(who,msg){
  const a=document.createElement("article"),b=document.createElement("b"),p=document.createElement("p");
  b.textContent=who;p.textContent=msg;a.append(b,p);$("#chatLog").appendChild(a);$("#chatLog").scrollTop=$("#chatLog").scrollHeight;
}
function answer(q){
  const s=q.toLowerCase();
  let a=s.includes("html")?"Use semantic HTML for the page structure.":s.includes("css")?"Keep layout and responsive styling in style.css.":s.includes("javascript")||s.includes("js")?"Use script.js for interactions and logic.":s.includes("github")?"Your CMB-AI repository is connected to GitHub Pages.":"Start with a small version, preview it, test it, then add features.";
  addChat("CMB AI",a);
}
function fileRow(f){
  return "<div class='file-item "+(f===state.currentFile?"active":"")+"' data-file='"+f+"'>▱ "+f+" <span>›</span></div>";
}
function renderFiles(){
  const names=Object.keys(state.files);
  const folders=[...new Set(names.filter(f=>f.includes("/")).map(f=>f.split("/")[0]))];
  const grouped=folders.map(folder=>"<div class='folder'>▾ "+folder+"</div>"+names.filter(f=>f.startsWith(folder+"/")).map(fileRow).join("")).join("");
  const root=names.filter(f=>!f.includes("/")).map(fileRow).join("");
  $("#fileList").innerHTML=grouped+root;
  $$(".file-item").forEach(x=>x.onclick=()=>openFile(x.dataset.file));
  openFile(state.currentFile);
  $("#fileCount").textContent=names.filter(f=>!f.endsWith("/.gitkeep")).length;
}
function openFile(f){
  state.currentFile=f;$("#editorTitle").textContent=f;$("#code").value=state.files[f]||"";
  $$(".file-item").forEach(x=>x.classList.toggle("active",x.dataset.file===f));
}
function addFolder(){
  const n=prompt("Folder name, e.g. components");
  if(!n||/[<>:"\\|?*]/.test(n)||n.includes("/"))return;
  const marker=n+"/.gitkeep";
  if(!state.files[marker]){state.files[marker]="";renderFiles();toast("Folder created")}
}
function addFile(){
  const n=prompt("File name, e.g. about.html or components/card.html");
  if(!n||n.endsWith("/")||state.files[n])return;
  state.files[n]="";state.currentFile=n;renderFiles();toast("File added");
}
function saveCurrent(){
  state.files[state.currentFile]=$("#code").value;
  if(state.active){state.active.files=state.files;save()}
  toast("File saved in workspace");
}
function renderProjects(){
  const b=$("#projectsList");b.innerHTML="";
  if(!state.projects.length){b.innerHTML="<div class='panel'><h3>No projects yet</h3><p>Start a new project to create your first workspace.</p></div>";return}
  state.projects.forEach(p=>{
    const d=document.createElement("div");d.className="project-card";
    d.innerHTML="<small>PROJECT</small><h3></h3><p></p><small>"+p.progress+"% complete · "+p.created+"</small><br><button class='small'>Open →</button>";
    d.querySelector("h3").textContent=p.name;d.querySelector("p").textContent=p.idea||"No description yet.";
    d.querySelector("button").onclick=()=>{openProject(p);view("workspace")};b.appendChild(d);
  });
}
function buildPreview(){
  state.files[state.currentFile]=$("#code").value;
  const html=state.files["index.html"]||"";
  const css=state.files["style.css"]||"";
  const script=state.files["script.js"]||"";
  const doc=html.includes("<html")?html:"<!doctype html><html><head></head><body>"+html+"</body></html>";
  const withCss=doc.replace("</head>","<style>"+css+"</style></head>");
  const withJs=withCss.replace("</body>","<script>"+script.replace(/<\\/script/gi,"<\\\\/script")+"</script></body>");
  $("#previewFrame").srcdoc=withJs;$("#previewModal").classList.remove("hidden");
}
$$(".nav").forEach(x=>x.onclick=()=>view(x.dataset.view));
$$("[data-open]").forEach(x=>x.onclick=()=>view(x.dataset.open));
$("#newProject").onclick=newProject;$("#newProject2").onclick=newProject;$("#start").onclick=newProject;$("#plan").onclick=makePlan;
$("#addFile").onclick=addFile;$("#addFolder").onclick=addFolder;$("#saveCode").onclick=saveCurrent;
$("#chatForm").onsubmit=e=>{e.preventDefault();const q=$("#chatInput").value.trim();if(!q)return;addChat("You",q);$("#chatInput").value="";setTimeout(()=>answer(q),220)};
$("#rename").onclick=()=>{if(!state.active){toast("Create a project first");return}const n=prompt("Project name",state.active.name);if(n){state.active.name=n;$("#projectName").textContent=n;save();toast("Project renamed")}};
$("#theme").onclick=()=>{document.body.classList.toggle("light");localStorage.setItem("cmbai_theme",document.body.classList.contains("light")?"light":"dark")};
$("#preview").onclick=buildPreview;$("#refreshPreview").onclick=buildPreview;
$("#closePreview").onclick=()=>$("#previewModal").classList.add("hidden");
$("#previewModal").addEventListener("click",e=>{if(e.target.id==="previewModal")$("#previewModal").classList.add("hidden")});
if(localStorage.getItem("cmbai_theme")==="light")document.body.classList.add("light");
if(state.projects.length)openProject(state.projects[0]);else renderFiles();
renderProjects();$("#projectCount").textContent=state.projects.length;

function builderBlock(type){
 const data={
  hero:{title:"Build your future",text:"Turn your idea into a beautiful website.",tag:"CMB AI",kind:"hero"},
  heading:{title:"Your next big idea",text:"A clear heading for your page.",kind:"heading"},
  text:{title:"About this project",text:"Write a short description that explains what makes your project useful.",kind:"text"},
  button:{title:"Get started",text:"Start building today",kind:"button"},
  card:{title:"Feature card",text:"Explain an important feature, service, or benefit.",kind:"card"},
  services:{title:"Our Services",text:"Web Design • Development • AI Solutions",kind:"services"},
  contact:{title:"Let's work together",text:"Contact us to learn more.",kind:"contact"},
  footer:{title:"CMB AI",text:"Built with CMB AI.",kind:"footer"},
  image:{title:"Project image",text:"Add a photo or graphic.",src:"",alt:"Project image",fit:"cover",kind:"image"},
  navbar:{title:"CMB AI",text:"Home, About, Services, Contact",logo:"CMB AI",links:"Home, About, Services, Contact",button:"Get started",kind:"navbar"},
  columns:{title:"Three column section",text:"Fast, Secure, Affordable",columns:3,columnText:"Fast, Secure, Affordable",responsive:"stack",kind:"columns"},
pricing:{title:"Simple pricing",text:"Starter, Pro, Business",kind:"pricing"},
testimonials:{title:"What customers say",text:"“A simple way to turn ideas into websites.”, “The builder makes creating pages much easier.”, “Clean, fast, and easy to use.”",kind:"testimonials"},
faq:{title:"Frequently asked questions",text:"What is this?,How does it work?,Can I customize it?",kind:"faq"},
features:{title:"Everything you need",text:"Visual builder,Responsive layouts,Project management",kind:"features"},
about:{title:"About our project",text:"Explain your mission, story, or the problem your project solves.",kind:"about"}
 };
 return {id:Date.now()+Math.random(),...data[type]};
}
function renderBuilder(){
 const c=$("#builderCanvas");if(!c)return;c.innerHTML="";
 if(!builder.blocks.length){c.innerHTML="<div class='builder-empty'>Choose a component to start designing.</div>";return}
 builder.blocks.forEach(b=>{
  const el=document.createElement("div");el.className="builder-block "+b.kind+(builder.selected===b.id?" selected":"");el.dataset.id=b.id;
  el.style.textAlign=b.align||"center";el.style.color=b.color||"#172033";el.style.background=b.bg||"#ffffff";el.style.padding=b.padding==="large"?"55px 28px":b.padding==="small"?"18px":"32px";el.style.fontFamily=b.font==="serif"?"Georgia,serif":b.font==="mono"?"Consolas,monospace":"system-ui,sans-serif";
  if(b.kind==="image"){
    el.innerHTML="<small>IMAGE</small><img class='builder-image' alt=''>";
    const img=el.querySelector("img");img.src=b.src||"data:image/svg+xml;charset=UTF-8,"+encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450'><rect width='100%' height='100%' fill='#e9eef6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#667085' font-size='28'>Add an image</text></svg>");img.alt=b.alt||"Project image";img.style.objectFit=b.fit||"cover";
  }else if(b.kind==="navbar"){
    const links=(b.links||"Home, About, Services, Contact").split(",").map(x=>x.trim()).filter(Boolean);
    el.innerHTML="<small>NAVBAR</small><div class='builder-nav'><strong></strong><nav></nav><a class='builder-nav-cta'></a></div>";
    el.querySelector("strong").textContent=b.logo||"CMB AI";el.querySelector("nav").innerHTML=links.map(x=>"<a href='#'>"+x+"</a>").join("");el.querySelector(".builder-nav-cta").textContent=b.button||"Get started";
  }else if(b.kind==="columns"){
    const count=Math.max(2,Math.min(4,Number(b.columns)||3));const items=(b.columnText||"Fast, Secure, Affordable").split(",").map(x=>x.trim()).filter(Boolean);
    while(items.length<count)items.push("Feature "+(items.length+1));
    el.innerHTML="<small>LAYOUT</small><div class='builder-columns'></div>";
    const grid=el.querySelector(".builder-columns");grid.style.gridTemplateColumns="repeat("+count+",minmax(0,1fr))";if(b.responsive==="scroll")grid.classList.add("scroll-mobile");
    for(let i=0;i<count;i++){const card=document.createElement("div");card.className="builder-column";card.innerHTML="<b></b><p>Describe this feature, service, or benefit.</p>";card.querySelector("b").textContent=items[i];grid.appendChild(card)}
  }else{
    el.innerHTML="<small>"+b.kind.toUpperCase()+"</small><h3></h3><p></p>";el.querySelector("h3").textContent=b.title;el.querySelector("p").textContent=b.text;el.querySelector("h3").style.fontSize=b.size==="large"?"32px":b.size==="small"?"18px":"24px";
  }
  el.draggable=true;el.ondragstart=e=>e.dataTransfer.setData("text/plain",b.id);el.ondragover=e=>e.preventDefault();el.ondrop=e=>{e.preventDefault();const from=builder.blocks.findIndex(x=>String(x.id)===e.dataTransfer.getData("text/plain"));const to=builder.blocks.findIndex(x=>x.id===b.id);if(from>-1&&to>-1){const moved=builder.blocks.splice(from,1)[0];builder.blocks.splice(to,0,moved);renderBuilder()}};el.onclick=()=>selectBlock(b.id);c.appendChild(el);
 });
}
function selectBlock(id){
 builder.selected=id;renderBuilder();const b=builder.blocks.find(x=>x.id===id);if(!b)return;
 $("#inspectorEmpty").classList.add("hidden");$("#inspector").classList.remove("hidden");
 $("#propText").value=b.title||"";$("#propSize").value=b.size||"medium";$("#propAlign").value=b.align||"center";$("#propColor").value=b.color||"#172033";$("#propBg").value=b.bg||"#ffffff";$("#propPadding").value=b.padding||"medium";$("#propFont").value=b.font||"system";
 const sp=$("#sectionProps"),cp=$("#columnsProps"),np=$("#navbarProps"),ip=$("#imageProps");if(sp)sp.classList.toggle("hidden",!["pricing","testimonials","faq","features","about"].includes(b.kind));if(cp)cp.classList.toggle("hidden",b.kind!=="columns");if(np)np.classList.toggle("hidden",b.kind!=="navbar");if(ip)ip.classList.toggle("hidden",b.kind!=="image");
 if(["pricing","testimonials","faq","features","about"].includes(b.kind)){$("#propSectionHeading").value=b.title||"";$("#propSectionText").value=b.text||"";$("#propSectionItems").value=(b.items||b.text||"").split(",").join("\n");}
 if(b.kind==="columns"){$("#propColumns").value=b.columns||3;$("#propColumnText").value=b.columnText||"";$("#propResponsive").value=b.responsive||"stack"}
 if(b.kind==="image"){$("#propImageUrl").value=b.src&&b.src.startsWith("data:")?"":(b.src||"");$("#propAlt").value=b.alt||"";$("#propFit").value=b.fit||"cover"}
 if(b.kind==="navbar"){$("#propLogo").value=b.logo||"";$("#propLinks").value=b.links||"";$("#propNavButton").value=b.button||""}
}
function updateSelected(){
 const b=builder.blocks.find(x=>x.id===builder.selected);if(!b)return;
 b.title=$("#propText").value;b.size=$("#propSize").value;b.align=$("#propAlign").value;b.color=$("#propColor").value;b.bg=$("#propBg").value;b.padding=$("#propPadding").value;b.font=$("#propFont").value;
 if(["pricing","testimonials","faq","features","about"].includes(b.kind)){b.title=$("#propSectionHeading").value;b.text=$("#propSectionText").value;const items=$("#propSectionItems").value.split("\n").map(x=>x.trim()).filter(Boolean);if(items.length)b.items=items;}
 if(b.kind==="columns"){b.columns=Number($("#propColumns").value);b.columnText=$("#propColumnText").value;b.responsive=$("#propResponsive").value}
 if(b.kind==="image"){const url=$("#propImageUrl").value.trim();if(url)b.src=url;b.alt=$("#propAlt").value.trim();b.fit=$("#propFit").value}
 if(b.kind==="navbar"){b.logo=$("#propLogo").value.trim();b.links=$("#propLinks").value.trim();b.button=$("#propNavButton").value.trim();b.title=b.logo||"CMB AI";b.text=b.links||""}
 renderBuilder();
}
function deleteSelected(){if(builder.selected==null)return;pushHistory();builder.blocks=builder.blocks.filter(x=>x.id!==builder.selected);builder.selected=null;$("#inspector").classList.add("hidden");$("#inspectorEmpty").classList.remove("hidden");renderBuilder()}

function getGeneratedHtml(){
 const sections=builder.blocks.map(b=>{
  if(b.kind==="image")return `<section class="cmb-block cmb-image"><img src="${b.src||""}" alt="${b.alt||"Project image"}" style="object-fit:${b.fit||"cover"}"></section>`;
  if(b.kind==="navbar"){const links=(b.links||"Home, About, Services, Contact").split(",").map(x=>x.trim()).filter(Boolean).map(x=>`<a href="#">${x}</a>`).join("");return `<header class="cmb-navbar"><a class="cmb-logo" href="#">${b.logo||"CMB AI"}</a><nav>${links}</nav><a class="cmb-nav-cta" href="#">${b.button||"Get started"}</a></header>`;}
  if(b.kind==="columns"){const count=Math.max(2,Math.min(4,Number(b.columns)||3));const items=(b.columnText||"Fast, Secure, Affordable").split(",").map(x=>x.trim()).filter(Boolean);while(items.length<count)items.push("Feature "+(items.length+1));return `<section class="cmb-block cmb-columns"><div class="cmb-columns-grid" style="--cmb-cols:${count}">${items.slice(0,count).map(x=>`<article><h3>${x}</h3><p>Describe this feature, service, or benefit.</p></article>`).join("")}</div></section>`;}
  if(b.kind==="pricing"){const plans=b.items?.length?b.items.slice(0,3):["Starter","Pro","Business"];return `<section class="cmb-block cmb-library cmb-pricing"><small>PRICING</small><h2>${b.title}</h2><p>${b.text||""}</p><div class="cmb-pricing-grid">${plans.map((p,i)=>`<article><h3>${p}</h3><strong>${i===0?"$9":i===1?"$29":"$79"}</strong><p>Useful tools and features for your project.</p><a href="#">Choose plan</a></article>`).join("")}</div></section>`;}
  if(b.kind==="testimonials"){const q=(b.items?.length?b.items:(b.text||"Great product,Easy to use,Highly recommended").split(",")).slice(0,3);return `<section class="cmb-block cmb-library cmb-testimonials"><small>TESTIMONIALS</small><h2>${b.title}</h2><div class="cmb-testimonial-grid">${q.map(x=>`<article><div>★★★★★</div><p>${x}</p><b>Happy customer</b></article>`).join("")}</div></section>`;}
  if(b.kind==="faq"){const q=(b.items?.length?b.items:(b.text||"What is this?,How does it work?,Can I customize it?").split(",")).slice(0,6);return `<section class="cmb-block cmb-library cmb-faq"><small>FAQ</small><h2>${b.title}</h2>${q.map(x=>`<details><summary>${x}</summary><p>Write a clear answer to this question for your visitors.</p></details>`).join("")}</section>`;}
  if(b.kind==="features"){const q=(b.items?.length?b.items:(b.text||"Visual builder,Responsive layouts,Project management").split(",")).slice(0,6);return `<section class="cmb-block cmb-library cmb-features"><small>FEATURES</small><h2>${b.title}</h2><div class="cmb-feature-grid">${q.map(x=>`<article><span>✦</span><h3>${x}</h3><p>Explain the value of this feature in a short sentence.</p></article>`).join("")}</div></section>`;}
  if(b.kind==="about")return `<section class="cmb-block cmb-library cmb-about"><small>ABOUT</small><h2>${b.title}</h2><p>${b.text}</p></section>`;
  return `<section class="cmb-block cmb-${b.kind}"><small>${b.kind.toUpperCase()}</small><h2>${b.title}</h2><p>${b.text}</p>${b.kind==="button"?'<a href="#">Get started →</a>':""}</section>`;
 }).join("\n");
 return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${state.files["style.css"]||""}body{margin:0}</style></head><body>${sections}</body></html>`;
}
function refreshLivePreview(){
 const f=$("#livePreviewFrame");if(!f)return;
 f.srcdoc=getGeneratedHtml();
}
function openLivePreview(){const w=$("#livePreviewWrap");if(!w)return;w.classList.remove("hidden");refreshLivePreview()}
function closeLivePreview(){$("#livePreviewWrap")?.classList.add("hidden")}
function applyBuilder(){
 if(!builder.blocks.length){toast("Add a component first");return}
 const sections=builder.blocks.map(b=>{
  if(b.kind==="image")return `<section class="cmb-block cmb-image"><img src="${b.src||""}" alt="${b.alt||"Project image"}" style="object-fit:${b.fit||"cover"}"></section>`;
  if(b.kind==="navbar"){const links=(b.links||"Home, About, Services, Contact").split(",").map(x=>x.trim()).filter(Boolean).map(x=>`<a href="#">${x}</a>`).join("");return `<header class="cmb-navbar"><a class="cmb-logo" href="#">${b.logo||"CMB AI"}</a><nav>${links}</nav><a class="cmb-nav-cta" href="#">${b.button||"Get started"}</a></header>`;}
  if(b.kind==="columns"){const count=Math.max(2,Math.min(4,Number(b.columns)||3));const items=(b.columnText||"Fast, Secure, Affordable").split(",").map(x=>x.trim()).filter(Boolean);while(items.length<count)items.push("Feature "+(items.length+1));const cards=items.slice(0,count).map(x=>`<article><h3>${x}</h3><p>Describe this feature, service, or benefit.</p></article>`).join("");return `<section class="cmb-block cmb-columns ${b.responsive==="scroll"?"cmb-columns-scroll":""}"><div class="cmb-columns-grid" style="--cmb-cols:${count}">${cards}</div></section>`;}
  if(b.kind==="pricing"){const plans=["Starter","Pro","Business"];const plans=b.items?.length?b.items.slice(0,3):["Starter","Pro","Business"];return `<section class="cmb-block cmb-library cmb-pricing"><small>PRICING</small><h2>${b.title}</h2><p>${b.text||""}</p><div class="cmb-pricing-grid">${plans.map((p,i)=>`<article><h3>${p}</h3><strong>${i===0?"$9":i===1?"$29":"$79"}</strong><p>Useful tools and features for your project.</p><a href="#">Choose plan</a></article>`).join("")}</div></section>`;}
  if(b.kind==="testimonials"){const quotes=(b.items?.length?b.items:(b.text||"Great product,Easy to use,Highly recommended").split(",")).map(x=>x.trim()).filter(Boolean);return `<section class="cmb-block cmb-library cmb-testimonials"><small>TESTIMONIALS</small><h2>${b.title}</h2><div class="cmb-testimonial-grid">${quotes.slice(0,3).map(q=>`<article><div>★★★★★</div><p>${q}</p><b>Happy customer</b></article>`).join("")}</div></section>`;}
  if(b.kind==="faq"){const qs=(b.items?.length?b.items:(b.text||"What is this?,How does it work?,Can I customize it?").split(",")).map(x=>x.trim()).filter(Boolean);return `<section class="cmb-block cmb-library cmb-faq"><small>FAQ</small><h2>${b.title}</h2>${qs.slice(0,6).map(q=>`<details><summary>${q}</summary><p>Write a clear answer to this question for your visitors.</p></details>`).join("")}</section>`;}
  if(b.kind==="features"){const items=(b.items?.length?b.items:(b.text||"Visual builder,Responsive layouts,Project management").split(",")).map(x=>x.trim()).filter(Boolean);return `<section class="cmb-block cmb-library cmb-features"><small>FEATURES</small><h2>${b.title}</h2><div class="cmb-feature-grid">${items.slice(0,6).map(x=>`<article><span>✦</span><h3>${x}</h3><p>Explain the value of this feature in a short sentence.</p></article>`).join("")}</div></section>`;}
  if(b.kind==="about")return `<section class="cmb-block cmb-library cmb-about"><small>ABOUT</small><h2>${b.title}</h2><p>${b.text}</p></section>`;
  return `<section class="cmb-block cmb-${b.kind}"><small>${b.kind.toUpperCase()}</small><h2>${b.title}</h2><p>${b.text}</p>${b.kind==="button"?'<a href="#">Get started →</a>':""}</section>`;
 }).join("\n");
 state.files["index.html"]=`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CMB AI Project</title><link rel="stylesheet" href="style.css"></head><body>${sections}<script src="script.js"><\\/script></body></html>`;
 state.files["style.css"]+=`\n.cmb-columns-grid{display:grid;grid-template-columns:repeat(var(--cmb-cols),minmax(0,1fr));gap:18px;max-width:1100px;margin:0 auto}.cmb-columns-grid article{padding:24px;border:1px solid #d9e1ec;border-radius:14px;background:#fff;text-align:left;box-shadow:0 8px 25px rgba(16,24,40,.06)}.cmb-columns-grid h3{margin:0 0 8px;font-size:20px}.cmb-columns-grid p{margin:0;color:#667085;line-height:1.6}.cmb-columns-scroll .cmb-columns-grid{overflow-x:auto;grid-template-columns:repeat(var(--cmb-cols),minmax(220px,1fr));padding-bottom:8px}`;
 if(state.active){state.active.files=state.files;save()}renderFiles();toast("Responsive layout applied to index.html");
}
$(".component").forEach(x=>x.onclick=()=>{pushHistory();builder.blocks.push(builderBlock(x.dataset.component));renderBuilder()});
if($("#propText"))$("#propText").oninput=updateSelected;if($("#propSize"))$("#propSize").onchange=updateSelected;if($("#propAlign"))$("#propAlign").onchange=updateSelected;if($("#propColor"))$("#propColor").oninput=updateSelected;if($("#propBg"))$("#propBg").oninput=updateSelected;if($("#propPadding"))$("#propPadding").onchange=updateSelected;if($("#propFont"))$("#propFont").onchange=updateSelected;
if($("#propSectionHeading"))$("#propSectionHeading").oninput=updateSelected;if($("#propSectionText"))$("#propSectionText").oninput=updateSelected;if($("#propSectionItems"))$("#propSectionItems").oninput=updateSelected;
if($("#propColumns"))$("#propColumns").onchange=updateSelected;if($("#propColumnText"))$("#propColumnText").oninput=updateSelected;if($("#propResponsive"))$("#propResponsive").onchange=updateSelected;
if($("#propLogo"))$("#propLogo").oninput=updateSelected;if($("#propLinks"))$("#propLinks").oninput=updateSelected;if($("#propNavButton"))$("#propNavButton").oninput=updateSelected;
if($("#propImageUrl"))$("#propImageUrl").oninput=updateSelected;if($("#propAlt"))$("#propAlt").oninput=updateSelected;if($("#propFit"))$("#propFit").onchange=updateSelected;

// Theme system
const themes={
 default:{accent:"#786bff",accent2:"#5b4fe9",bg:"#f8fafc",panel:"#ffffff",text:"#172033",muted:"#667085",radius:"14px",font:"system"},
 ocean:{accent:"#0ea5e9",accent2:"#0284c7",bg:"#f0f9ff",panel:"#ffffff",text:"#0c2d48",muted:"#486581",radius:"16px",font:"system"},
 sunset:{accent:"#f97316",accent2:"#ea580c",bg:"#fff7ed",panel:"#ffffff",text:"#431407",muted:"#9a3412",radius:"18px",font:"system"},
 forest:{accent:"#16a34a",accent2:"#15803d",bg:"#f0fdf4",panel:"#ffffff",text:"#14351f",muted:"#4b6351",radius:"12px",font:"system"},
 midnight:{accent:"#a78bfa",accent2:"#7c3aed",bg:"#0f172a",panel:"#182235",text:"#f8fafc",muted:"#b6c2d2",radius:"14px",font:"system"}
};
function applyTheme(){
 const name=$("#themePreset")?.value||"default",t=themes[name];if(!t)return;
 document.documentElement.style.setProperty("--accent",t.accent);
 document.documentElement.style.setProperty("--accent2",t.accent2);
 document.documentElement.style.setProperty("--bg",t.bg);
 document.documentElement.style.setProperty("--panel",t.panel);
 document.documentElement.style.setProperty("--text",t.text);
 document.documentElement.style.setProperty("--muted",t.muted);
 document.documentElement.style.setProperty("--radius",t.radius);
 const f=t.font==="serif"?"Georgia,serif":"system-ui,sans-serif";
 document.documentElement.style.setProperty("--site-font",f);
 if(state.active){
  state.active.theme=name;state.active.themeConfig=t;state.active.files=state.files;save();
 }
 toast(name.charAt(0).toUpperCase()+name.slice(1)+" theme applied");
}
if($("#applyTheme"))$("#applyTheme").onclick=applyTheme;
if($("#themePreset"))$("#themePreset").onchange=()=>applyTheme();
if($("#propImageFile"))$("#propImageFile").onchange=e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{const b=builder.blocks.find(x=>x.id===builder.selected);if(!b||b.kind!=="image")return;b.src=reader.result;renderBuilder();selectBlock(b.id);toast("Image added to the builder")};reader.readAsDataURL(file)};
if($("#deleteBlock"))$("#deleteBlock").onclick=deleteSelected;if($("#undoBuilder"))$("#undoBuilder").onclick=undoBuilder;if($("#redoBuilder"))$("#redoBuilder").onclick=redoBuilder;if($("#duplicateBlock"))$("#duplicateBlock").onclick=duplicateSelected;if($("#moveUpBlock"))$("#moveUpBlock").onclick=()=>moveSelected(-1);if($("#moveDownBlock"))$("#moveDownBlock").onclick=()=>moveSelected(1);if($("#clearBuilder"))$("#clearBuilder").onclick=()=>{builder.blocks=[];builder.selected=null;renderBuilder();$("#inspector").classList.add("hidden");$("#inspectorEmpty").classList.remove("hidden")};if($("#applyBuilder"))$("#applyBuilder").onclick=applyBuilder;renderBuilder();

if(!builder.history.length)builder.history=[snapshot()];

function setDevice(device){
 const canvas=$("#builderCanvas");if(!canvas)return;
 canvas.classList.remove("device-desktop","device-tablet","device-mobile");canvas.classList.add("device-"+device);
 $$(".device").forEach(b=>b.classList.toggle("active",b.dataset.device===device));
}
$$(".device").forEach(b=>b.onclick=()=>setDevice(b.dataset.device));

if($("#openLivePreview"))$("#openLivePreview").onclick=openLivePreview;
if($("#refreshLivePreview"))$("#refreshLivePreview").onclick=refreshLivePreview;
if($("#closeLivePreview"))$("#closeLivePreview").onclick=closeLivePreview;

function downloadFile(name,content,type="text/plain"){const blob=new Blob([content],{type});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function exportHtmlFile(){downloadFile("index.html",getGeneratedHtml(),"text/html");toast("HTML downloaded")}
function exportCssFile(){downloadFile("style.css",state.files["style.css"]||"","text/css");toast("CSS downloaded")}
function exportJsFile(){downloadFile("script.js",state.files["script.js"]||"","text/javascript");toast("JavaScript downloaded")}
function exportWebsite(){const files=[["index.html",getGeneratedHtml()],["style.css",state.files["style.css"]||""],["script.js",state.files["script.js"]||""]];const text=files.map(([n,c])=>"===== "+n+" =====\n"+c).join("\n\n");downloadFile("cmb-ai-website.txt",text,"text/plain");toast("Website package downloaded")}
if($("#exportHtml"))$("#exportHtml").onclick=exportHtmlFile;if($("#exportCss"))$("#exportCss").onclick=exportCssFile;if($("#exportJs"))$("#exportJs").onclick=exportJsFile;if($("#exportZip"))$("#exportZip").onclick=exportWebsite;

function renderAssets(){
 const list=$("#assetList");if(!list)return;
 list.innerHTML="";
 if(!state.assets.length){list.innerHTML="<div class='asset-empty'>No assets yet. Upload images, logos, icons, or text files.</div>";return}
 state.assets.forEach((a,i)=>{const el=document.createElement("div");el.className="asset-item";el.innerHTML="<div class='asset-thumb'></div><div class='asset-info'><b></b><small></small></div><button class='btn'>Use</button><button class='btn'>×</button>";el.querySelector("b").textContent=a.name;el.querySelector("small").textContent=Math.max(1,Math.round(a.size/1024))+" KB";const thumb=el.querySelector(".asset-thumb");if(a.type.startsWith("image/"))thumb.style.backgroundImage="url('"+a.data+"')";el.querySelectorAll(".btn")[0].onclick=()=>{const b=builder.blocks.find(x=>x.id===builder.selected);if(b&&b.kind==="image"){b.src=a.data;renderBuilder();selectBlock(b.id);toast("Asset added to image") }else toast("Select an Image block first")};el.querySelectorAll(".btn")[1].onclick=()=>{state.assets.splice(i,1);save();renderAssets()};list.appendChild(el)})
}
function handleAssets(files){
 [...files].forEach(file=>{const r=new FileReader();r.onload=()=>{state.assets.push({name:file.name,size:file.size,type:file.type||"application/octet-stream",data:r.result});save();renderAssets()};r.readAsDataURL(file)});
}
if($("#assetUpload"))$("#assetUpload").onchange=e=>{handleAssets(e.target.files);e.target.value=""};
if($("#clearAssets"))$("#clearAssets").onclick=()=>{state.assets=[];save();renderAssets();toast("Assets cleared")};
renderAssets();

function loadCodeEditor(){const f=$("#codeFile")?.value||"index.html";if($("#codeEditor"))$("#codeEditor").value=state.files[f]||""}
function saveCodeEditor(){const f=$("#codeFile")?.value||"index.html";if(!$("#codeEditor"))return;state.files[f]=$("#codeEditor").value;save();if(f==="style.css")applyTheme();renderFiles();refreshLivePreviewNow();toast(f+" saved and preview updated")}
$("#codeFile")?.addEventListener("change",loadCodeEditor);
$("#loadCode")?.addEventListener("click",loadCodeEditor);
$("#saveCode")?.addEventListener("click",saveCodeEditor);
loadCodeEditor();

function refreshLivePreviewNow(){const wrap=$("#livePreviewWrap"),frame=$("#livePreviewFrame");if(!frame)return;frame.srcdoc=getGeneratedHtml();if(wrap)wrap.classList.remove("hidden")}

$("#previewCode")?.addEventListener("click",refreshLivePreviewNow);

function renderDashboard(){
 const box=$("#dashboardProjects"),stats=$("#dashboardStats"); if(!box||!stats)return;
 const projects=state.projects||[];
 const active=state.active;
 const total=projects.length;
 const blocks=active?.builder?.blocks?.length || builder.blocks.length || 0;
 stats.innerHTML="<div><b>"+total+"</b><span>Projects</span></div><div><b>"+blocks+"</b><span>Current blocks</span></div><div><b>"+(active?.name||"None")+"</b><span>Active project</span></div>";
 box.innerHTML="";
 if(!projects.length){box.innerHTML="<div class='dashboard-empty'><h3>No projects yet</h3><p>Create your first project to start building.</p><button id='emptyNewProject' class='btn primary'>Create Project</button></div>";$("#emptyNewProject")?.addEventListener("click",newProject);return}
 projects.forEach((p,i)=>{const card=document.createElement("article");card.className="project-card";const edited=p.updatedAt?new Date(p.updatedAt).toLocaleString():"Not edited yet";card.innerHTML="<div class='project-icon'>⌘</div><div class='project-card-main'><h3></h3><p></p><small></small></div><div class='project-actions'><button class='btn primary'>Open</button><button class='btn'>Duplicate</button></div>";card.querySelector("h3").textContent=p.name||"Untitled Project";card.querySelector("p").textContent=p.description||"CMB-AI website project";card.querySelector("small").textContent="Last edited: "+edited;card.querySelector(".project-actions .primary").onclick=()=>{openProject(p.id);renderDashboard()};card.querySelector(".project-actions .btn:not(.primary)").onclick=()=>{const copy=JSON.parse(JSON.stringify(p));copy.id=Date.now();copy.name=(p.name||"Project")+" Copy";copy.updatedAt=Date.now();state.projects.push(copy);save();renderProjects();renderDashboard();toast("Project duplicated")};box.appendChild(card)});
}
$("#dashboardNewProject")?.addEventListener("click",newProject);
renderDashboard();

async function checkBackendStatus(){
 const el=$("#backendStatus"); if(!el)return;
 el.textContent="Checking...";
 try{
  const r=await fetch("http://127.0.0.1:5000/api/health",{method:"GET"});
  const data=await r.json();
  el.textContent=data.ok?"● Online":"● Offline";
  el.classList.toggle("online",!!data.ok);
 }catch(e){el.textContent="● Offline";el.classList.remove("online")}
}
$("#checkBackend")?.addEventListener("click",checkBackendStatus);

async function createProjectOnBackend(project){
 try{
  const r=await fetch("http://127.0.0.1:5000/api/project",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:project.name})});
  const data=await r.json();
  if(data.ok) toast("Project synced with Python backend");
  return data;
 }catch(e){return null}
}

async function loadProjectsFromBackend(){
 try{
  const r=await fetch("http://127.0.0.1:5000/api/projects");
  const data=await r.json();
  if(data.ok && Array.isArray(data.projects) && data.projects.length){
   data.projects.forEach(p=>{if(!state.projects.some(x=>x.backendId===p.id)){state.projects.push({id:Date.now()+Math.random(),backendId:p.id,name:p.name,description:"Python backend project",updatedAt:Date.now()})}});
   save();renderProjects();renderDashboard();
  }
 }catch(e){}
}
loadProjectsFromBackend();


async function syncProjectName(project){
 if(!project || !project.backendId || !project.name) return;
 try{
  await fetch("http://127.0.0.1:5000/api/project/"+encodeURIComponent(project.backendId),{
   method:"PATCH",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({name:project.name})
  });
 }catch(e){}
}

function updateBackendProjectCount(){
 const el=$("#backendProjects"); if(!el)return;
 fetch("http://127.0.0.1:5000/api/projects").then(r=>r.json()).then(d=>{
  el.textContent=d.ok?"Backend: "+d.projects.length:"Backend: --";
 }).catch(()=>{el.textContent="Backend: offline"});
}
$("#checkBackend")?.addEventListener("click",updateBackendProjectCount);
updateBackendProjectCount();

async function askPythonAI(){
 const input=$("#aiPrompt"),out=$("#aiResponse"),button=$("#sendAiPrompt");
 if(!input||!out)return;
 const prompt=input.value.trim();
 if(!prompt){toast("Enter a prompt first");return}
 button.disabled=true;button.textContent="Thinking...";
 out.textContent="Connecting to Python AI...";
 try{
  const r=await fetch("http://127.0.0.1:5000/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,project:{name:state.active?.name||"CMB-AI project",files:state.files}})});
  const data=await r.json();
  out.textContent=data.ok?data.answer:(data.error||"AI request failed");
 }catch(e){out.textContent="Python backend is offline. Start the Flask server first."}
 finally{button.disabled=false;button.textContent="Ask AI"}
}
$("#sendAiPrompt")?.addEventListener("click",askPythonAI);

async function applyAiCodeChange(){
 const input=$("#aiPrompt"),out=$("#aiResponse"),button=$("#sendAiPrompt");
 if(!input||!out)return;
 const prompt=input.value.trim();
 if(!prompt){toast("Enter a change request first");return}
 button.disabled=true;button.textContent="Building...";
 out.textContent="AI is preparing project changes...";
 try{
  const r=await fetch("http://127.0.0.1:5000/api/ai/apply",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({request:prompt,files:state.files})});
  const data=await r.json();
  if(!data.ok){out.textContent=data.error||"Could not apply changes";return}
  ["index.html","style.css","script.js"].forEach(f=>{if(typeof data.files?.[f]==="string")state.files[f]=data.files[f]});
  save();renderFiles();loadCodeEditor();refreshLivePreviewNow();
  out.textContent="AI changes applied to the project.";
  toast("AI code changes applied");
 }catch(e){out.textContent="Python backend is offline."}
 finally{button.disabled=false;button.textContent="Ask AI"}
}

$("#applyAiCode")?.addEventListener("click",applyAiCodeChange);

let pendingAiFiles=null;
async function previewAiCodeChange(){
 const input=$("#aiPrompt"),out=$("#aiResponse"),details=$("#aiChangeDetails"),wrap=$("#aiChangePreview");
 if(!input||!details||!wrap)return;
 const prompt=input.value.trim(); if(!prompt){toast("Enter a change request first");return}
 out.textContent="Preparing proposed changes...";
 try{
  const r=await fetch("http://127.0.0.1:5000/api/ai/apply",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({request:prompt,files:state.files})});
  const data=await r.json(); if(!data.ok){out.textContent=data.error||"Could not prepare changes";return}
  pendingAiFiles=data.files||{};
  details.innerHTML="";
  ["index.html","style.css","script.js"].forEach(f=>{if(typeof pendingAiFiles[f]==="string"){const row=document.createElement("div");row.className="ai-change-row";row.innerHTML="<b></b><span>Updated</span>";row.querySelector("b").textContent=f;details.appendChild(row)}});
  wrap.classList.remove("hidden");out.textContent="Review the proposed file changes before applying them.";
 }catch(e){out.textContent="Python backend is offline."}
}
function applyPendingAi(){
 autoAiSnapshot(state.files);renderAiSnapshotStatus();
 if(!pendingAiFiles)return;
 ["index.html","style.css","script.js"].forEach(f=>{if(typeof pendingAiFiles[f]==="string")state.files[f]=pendingAiFiles[f]});
 recordAiAction($("#aiPrompt")?.value.trim()||"AI code change",pendingAiFiles);save();renderFiles();loadCodeEditor();refreshLivePreviewNow();pendingAiFiles=null;$("#aiChangePreview")?.classList.add("hidden");toast("Approved AI changes applied");
}
$("#applyAiCode")?.removeEventListener("click",applyAiCodeChange);
$("#applyAiCode")?.addEventListener("click",previewAiCodeChange);
$("#applyPendingAi")?.addEventListener("click",applyPendingAi);

let lastAiFiles=null;
const originalApplyPendingAi=applyPendingAi;
applyPendingAi=function(){
 lastAiFiles={...state.files};
 originalApplyPendingAi();
};
function undoLastAiChange(){
 if(!lastAiFiles){toast("No AI change to undo");return}
 state.files={...lastAiFiles};save();renderFiles();loadCodeEditor();refreshLivePreviewNow();lastAiFiles=null;toast("AI change undone");
}
$("#undoAiChange")?.addEventListener("click",undoLastAiChange);

function aiHistoryKey(){return "cmbai_ai_history_"+(state.active?.id||"default")}
function getAiHistory(){try{return JSON.parse(localStorage.getItem(aiHistoryKey())||"[]")}catch{return[]}}
function saveAiHistory(h){localStorage.setItem(aiHistoryKey(),JSON.stringify(h.slice(-30)))}
function recordAiAction(prompt,files){
 const h=getAiHistory();
 h.push({prompt:prompt,answer:"Approved AI code change.",changedFiles:Object.keys(files||{}).filter(f=>typeof files[f]==="string"),time:new Date().toISOString()});
 saveAiHistory(h);renderAiHistory();renderAiTimeline();
}
function renderAiHistory(){
 const box=$("#aiHistoryList"); if(!box)return;
 const h=getAiHistory();
 box.innerHTML=h.length?h.slice().reverse().map((x,i)=>'<div class="ai-history-item"><div><b></b><small></small></div><button class="btn" data-ai-history="'+(h.length-1-i)+'">Use</button></div>').join(""):'<p class="muted">No AI conversations yet.</p>';
 h.slice().reverse().forEach((x,i)=>{const row=box.querySelectorAll(".ai-history-item")[i]; if(row){row.querySelector("b").textContent=x.prompt;row.querySelector("small").textContent=x.answer||"Code change request";}});
}
function recordAiHistory(prompt,answer){const h=getAiHistory();h.push({prompt,answer:answer||"",time:new Date().toISOString()});saveAiHistory(h);renderAiHistory()}
$("#clearAiHistory")?.addEventListener("click",()=>{saveAiHistory([]);renderAiHistory();toast("AI history cleared")});
$("#aiHistoryList")?.addEventListener("click",e=>{const b=e.target.closest("[data-ai-history]");if(!b)return;const h=getAiHistory();const item=h[Number(b.dataset.aiHistory)];if(item&&$("#aiPrompt")){$("#aiPrompt").value=item.prompt;$("#aiPrompt").focus();toast("Previous request loaded")}});
renderAiHistory();

function showAiHistoryDetails(item){
 const box=$("#aiHistoryDetails"); if(!box)return;
 if(!item){box.classList.add("hidden");return}
 box.classList.remove("hidden");
 box.innerHTML="";
 const title=document.createElement("h4"); title.textContent="AI action details"; box.appendChild(title);
 const p=document.createElement("p"); p.textContent="Request: "+(item.prompt||""); box.appendChild(p);
 const f=document.createElement("p"); f.textContent="Changed files: "+((item.changedFiles||[]).join(", ")||"None listed"); box.appendChild(f);
 const t=document.createElement("small"); t.textContent=item.time?new Date(item.time).toLocaleString():""; box.appendChild(t);
}

function renderAiTimeline(){
 const box=$("#aiTimeline"); if(!box)return;
 const h=getAiHistory().slice().reverse();
 box.innerHTML="";
 if(!h.length){box.textContent="No AI activity yet.";return}
 h.forEach((item,i)=>{
  const row=document.createElement("div"); row.className="ai-timeline-item";row.dataset.aiTimeline=String(i);row.tabIndex=0;
  const title=document.createElement("b"); title.textContent=item.prompt||"AI action";
  const meta=document.createElement("small"); meta.textContent=(item.time?new Date(item.time).toLocaleString():"")+" • "+((item.changedFiles||[]).join(", ")||"conversation");
  row.append(title,meta); box.appendChild(row);
 });
}
renderAiTimeline();

$("#aiTimeline")?.addEventListener("click",e=>{
 const row=e.target.closest("[data-ai-timeline]"); if(!row)return;
 const h=getAiHistory().slice().reverse(); showAiHistoryDetails(h[Number(row.dataset.aiTimeline)]);
});

function snapshotKey(){return "cmbai_ai_snapshot_"+(state.active?.id||"default")}
function createAiSnapshot(){
 localStorage.setItem(snapshotKey(),JSON.stringify({files:{...state.files},time:new Date().toISOString()}));
 toast("AI snapshot created");renderAiSnapshotStatus();
}
function restoreAiSnapshot(){
 try{
  const s=JSON.parse(localStorage.getItem(snapshotKey())||"null");
  if(!s){toast("No AI snapshot found");return}
  state.files={...s.files};save();renderFiles();loadCodeEditor();refreshLivePreviewNow();toast("AI snapshot restored");
 }catch{toast("Could not restore snapshot")}
}
$("#aiSnapshot")?.addEventListener("click",createAiSnapshot);
$("#restoreAiSnapshot")?.addEventListener("click",restoreAiSnapshot);

function autoAiSnapshot(files){
 localStorage.setItem(snapshotKey(),JSON.stringify({files:{...(files||state.files)},time:new Date().toISOString(),automatic:true}));
}

function renderAiSnapshotStatus(){
 const box=$("#aiSnapshotStatus"); if(!box)return;
 try{
  const s=JSON.parse(localStorage.getItem(snapshotKey())||"null");
  box.textContent=s?"Latest snapshot: "+new Date(s.time).toLocaleString():"No snapshot created yet.";
 }catch{box.textContent="No snapshot created yet."}
}
renderAiSnapshotStatus();

function snapshotListKey(){return "cmbai_ai_snapshots_"+(state.active?.id||"default")}
function getAiSnapshots(){try{return JSON.parse(localStorage.getItem(snapshotListKey())||"[]")}catch{return[]}}
function saveAiSnapshots(list){localStorage.setItem(snapshotListKey(),JSON.stringify(list.slice(-10)))}
function createAiSnapshot(){
 const list=getAiSnapshots();
 list.push({files:{...state.files},time:new Date().toISOString(),automatic:false});
 saveAiSnapshots(list);
 localStorage.setItem(snapshotKey(),JSON.stringify(list[list.length-1]));
 toast("AI snapshot created");renderAiSnapshotStatus();renderAiSnapshots();
}
function autoAiSnapshot(files){
 const list=getAiSnapshots();
 list.push({files:{...(files||state.files)},time:new Date().toISOString(),automatic:true});
 saveAiSnapshots(list);
 localStorage.setItem(snapshotKey(),JSON.stringify(list[list.length-1]));
}
function renderAiSnapshots(){
 const box=$("#aiSnapshotsList");if(!box)return;
 const list=getAiSnapshots().slice().reverse();box.innerHTML="";
 list.forEach((s,i)=>{
  const row=document.createElement("div");row.className="ai-snapshot-item";
  const b=document.createElement("b");b.textContent=s.name||"Unnamed snapshot";
  const small=document.createElement("small");small.textContent=(s.automatic?"Automatic snapshot":"Manual snapshot")+" • "+new Date(s.time).toLocaleString();
  const btn=document.createElement("button");btn.className="btn";btn.textContent="Restore";btn.dataset.snapshot=String(list.length-1-i);
  row.append(b,small,btn);box.appendChild(row);
 });
}
$("#aiSnapshotsList")?.addEventListener("click",e=>{
 const b=e.target.closest("[data-snapshot]");if(!b)return;
 const list=getAiSnapshots();const s=list[Number(b.dataset.snapshot)];if(!s)return;
 state.files={...s.files};save();renderFiles();loadCodeEditor();refreshLivePreviewNow();toast("Snapshot restored");
});
renderAiSnapshots();

function createNamedSnapshot(){
 const name=$("#snapshotName")?.value.trim()||"Snapshot "+(getAiSnapshots().length+1);
 const list=getAiSnapshots();
 list.push({name,files:{...state.files},time:new Date().toISOString(),automatic:false});
 saveAiSnapshots(list);
 localStorage.setItem(snapshotKey(),JSON.stringify(list[list.length-1]));
 if($("#snapshotName"))$("#snapshotName").value="";
 toast("Named snapshot saved");renderAiSnapshotStatus();renderAiSnapshots();
}
$("#createNamedSnapshot")?.addEventListener("click",createNamedSnapshot);
