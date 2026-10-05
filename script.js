const $=s=>document.querySelector(s),qsa=s=>[...document.querySelectorAll(s)];

/* CMB AI reactor state — visual feedback for the AI core */
function setReactorState(state){
  const reactor=document.getElementById("cmbReactor");
  if(!reactor)return;
  reactor.dataset.state=state;
  reactor.classList.remove("reactor-ready","reactor-thinking","reactor-responding","reactor-error");
  reactor.classList.add("reactor-"+state);
}
setReactorState("ready");

function reactorThinking(){setReactorState("thinking")}
function reactorResponding(){setReactorState("responding")}
function reactorError(){setReactorState("error")}


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

function save(){
  if(state.active){
    state.active.files=state.files;
    state.active.updatedAt=Date.now();
  }
  localStorage.setItem("cmbai_projects",JSON.stringify(state.projects));
}
function toast(x){const t=$("#toast");t.textContent=x;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
function view(n){
  qsa(".view").forEach(x=>x.classList.add("hidden"));
  $("#"+n).classList.remove("hidden");
  qsa(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===n));
  const names={dashboard:"Build something great.",workspace:"Your project workspace.",builder:"Design your website.",projects:"Your projects.",github:"Connect and deploy.",settings:"Make CMB AI yours."};
  $("#title").textContent=names[n];$("#eyebrow").textContent=n.toUpperCase();
  if(n==="projects")renderProjects();
}
function newProject(){
  const p={id:Date.now(),name:"New CMB AI Project",idea:"",progress:0,created:new Date().toLocaleDateString(),files:JSON.parse(JSON.stringify(state.files))};
  state.projects.unshift(p);state.active=p;state.files=p.files;state.currentFile="index.html";
  save();openProject(p);renderFiles();view("workspace");toast("New project created");
}
function openProject(project){
  const p=typeof project==="object" ? project : state.projects.find(x=>String(x.id)===String(project) || String(x.backendId)===String(project));
  if(!p){toast("Project not found");return}
  state.active=p;
  state.files=p.files||state.files;
  state.currentFile=Object.keys(state.files)[0]||"index.html";
  $("#projectName").textContent=p.name||"Untitled Project";
  $("#idea").value=p.idea||p.description||"";
  setProgress(p.progress||0);
  renderFiles();
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
  qsa(".task input").forEach(x=>x.onchange=()=>setProgress(Math.round(qsa(".task input:checked").length/tasks.length*100)));
  save();addChat("CMB AI","I created a 7-step build plan for your idea.");toast("Build plan created");
}
function addChat(who,msg){
  const a=document.createElement("article"),b=document.createElement("b"),p=document.createElement("p");
  a.className=who==="CMB AI"?"ai-message":"user-message";
  b.textContent=who;p.textContent=msg;a.append(b,p);$("#chatLog").appendChild(a);$("#chatLog").scrollTop=$("#chatLog").scrollHeight;
}
function showTyping(){
  const old=$("#cmbTyping"); if(old)old.remove();
  const a=document.createElement("article");a.id="cmbTyping";a.className="ai-message typing-message";
  a.innerHTML="<b>CMB AI</b><p><span></span><span></span><span></span></p>";
  $("#chatLog").appendChild(a);$("#chatLog").scrollTop=$("#chatLog").scrollHeight;
}
function hideTyping(){ $("#cmbTyping")?.remove(); }
function answer(q){
  const s=q.toLowerCase();
  let a="";
  if(s.includes("html")) a="For "+(state.active?.name||"your project")+", use semantic HTML for the structure. Keep sections, headings, forms, and navigation organized.";
  else if(s.includes("css")) a="Keep the visual design in style.css. Start with layout, spacing, responsive rules, then add the blue CMB AI visual effects.";
  else if(s.includes("javascript")||s.includes("js")) a="Use script.js for interactions and logic. Keep UI functions separate from project data so the workspace stays easier to maintain.";
  else if(s.includes("github")) a="Your CMB-AI project is connected to GitHub. Test the project locally first, then commit the finished files and publish through GitHub Pages.";
  else if(s.includes("file")||s.includes("files")) a="Your current project has "+Object.keys(state.files||{}).length+" files. I can help you decide what each file should contain and how they connect.";
  else if(s.includes("project")||s.includes("build")) a="Let's build "+(state.active?.name||"your project")+" in small steps: plan the interface, build the HTML, style it, add JavaScript, test it, then prepare it for GitHub.";
  else a="I understand. Tell me what you want to build or change, and I can guide you through the next development step.";
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
  qsa(".file-item").forEach(x=>x.onclick=()=>openFile(x.dataset.file));
  openFile(state.currentFile);
  $("#fileCount").textContent=names.filter(f=>!f.endsWith("/.gitkeep")).length;
}
function openFile(f){
  state.currentFile=f;$("#editorTitle").textContent=f;$("#code").value=state.files[f]||"";
  qsa(".file-item").forEach(x=>x.classList.toggle("active",x.dataset.file===f));
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
function builderBlock(kind){
 const defaults={
  hero:["Hero","Build your next idea","Turn your idea into a real project."],
  heading:["Heading","Your main heading","A clear title for your page."],
  text:["Text","Your content","Write useful information for your visitors."],
  button:["Button","Get started","Take action with this button."],
  card:["Card","Feature card","A focused piece of content."],
  services:["Services","Our services","What we can help you with.","Service 1,Service 2,Service 3"],
  contact:["Contact","Contact us","We would love to hear from you."],
  footer:["Footer","CMB AI","Built with CMB AI."],
  image:["Image","Image","Add a project image."],
  navbar:["Navbar","CMB AI","Home, About, Services, Contact"],
  columns:["Columns","Why choose us","Fast, Secure, Affordable"],
  pricing:["Pricing","Simple pricing","Choose the plan that fits your project."],
  testimonials:["Testimonials","What customers say","Real feedback from your customers."],
  faq:["FAQ","Frequently asked questions","Answers to common questions."],
  features:["Features","Powerful features","Highlight the most useful parts of your project."],
  about:["About","About us","Tell visitors who you are and what you do."]
 };
 const d=defaults[kind]||[kind.toUpperCase(),"New section","Add content here."];
 return {id:Date.now()+Math.random(),kind,title:d[1],text:d[2],items:d[3]?d[3].split(","):[],size:"medium",align:"center",color:"#172033",bg:"#ffffff",padding:"medium",font:"system",src:"",alt:"Project image",fit:"cover",columns:3,responsive:"stack",columnText:d[2],logo:"CMB AI",links:"Home, About, Services, Contact",button:"Get started"};
}
function renderBuilder(){
 const canvas=$("#builderCanvas");if(!canvas)return;
 canvas.innerHTML="";
 if(!builder.blocks.length){canvas.innerHTML="<div class='builder-empty'>Choose a component to start designing.</div>";return}
 builder.blocks.forEach(b=>{
  const el=document.createElement("article");el.className="builder-block "+(b.id===builder.selected?"selected":"");el.dataset.blockId=b.id;
  el.style.textAlign=b.align||"center";el.style.color=b.color||"#172033";el.style.background=b.bg||"#fff";
  el.style.padding=b.padding==="large"?"40px":b.padding==="small"?"12px":"24px";
  const title=document.createElement("h3");title.textContent=b.title||b.kind.toUpperCase();
  const text=document.createElement("p");text.textContent=b.text||"";
  const tag=document.createElement("small");tag.textContent=b.kind.toUpperCase();
  el.append(tag,title,text);el.onclick=()=>selectBlock(b.id);canvas.appendChild(el);
 });
}
function selectBlock(id){
 const b=builder.blocks.find(x=>x.id===id);if(!b)return;
 builder.selected=id;renderBuilder();
 $("#inspectorEmpty")?.classList.add("hidden");$("#inspector")?.classList.remove("hidden");
 const set=(id,value)=>{const el=$("#"+id);if(el)el.value=value??""};
 set("propText",b.title);set("propSize",b.size||"medium");set("propAlign",b.align||"center");set("propColor",b.color||"#172033");set("propBg",b.bg||"#ffffff");set("propPadding",b.padding||"medium");set("propFont",b.font||"system");
 const section=["pricing","testimonials","faq","features","about"].includes(b.kind);
 $("#sectionProps")?.classList.toggle("hidden",!section);
 if(section){set("propSectionHeading",b.title);set("propSectionText",b.text);set("propSectionItems",(b.items||[]).join("\n"))}
 $("#columnsProps")?.classList.toggle("hidden",b.kind!=="columns");
 if(b.kind==="columns"){set("propColumns",b.columns||3);set("propColumnText",b.columnText||"");set("propResponsive",b.responsive||"stack")}
 $("#navbarProps")?.classList.toggle("hidden",b.kind!=="navbar");
 if(b.kind==="navbar"){set("propLogo",b.logo||"CMB AI");set("propLinks",b.links||"Home, About, Services, Contact");set("propNavButton",b.button||"Get started")}
 $("#imageProps")?.classList.toggle("hidden",b.kind!=="image");
 if(b.kind==="image"){set("propImageUrl",b.src&&b.src.startsWith("data:")?"":(b.src||""));set("propAlt",b.alt||"");set("propFit",b.fit||"cover")}
}
qsa(".nav").forEach(x=>x.onclick=()=>view(x.dataset.view));
qsa("[data-open]").forEach(x=>x.onclick=()=>view(x.dataset.open));
$("#newProject").onclick=newProject;$("#newProject2").onclick=newProject;$("#start").onclick=newProject;$("#plan").onclick=makePlan;
$("#addFile").onclick=addFile;$("#addFolder").onclick=addFolder;$("#saveCode").onclick=saveCurrent;
$("#chatForm").onsubmit=async e=>{e.preventDefault();const q=$("#chatInput").value.trim();if(!q)return;addChat("You",q);$("#chatInput").value="";reactorThinking();showTyping();try{const r=await fetch("http://127.0.0.1:5000/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:q,project:{name:state.active?.name||"CMB-AI project",files:state.files}})});const data=await r.json();hideTyping();if(data.ok){addChat("CMB AI",data.answer);reactorResponding();}else{answer(q);reactorError();}}catch(err){hideTyping();answer(q);reactorError();}finally{setTimeout(()=>setReactorState("ready"),900)}};
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
  if(b.kind==="pricing"){const plans=b.items?.length?b.items.slice(0,3):["Starter","Pro","Business"];return `<section class="cmb-block cmb-library cmb-pricing"><small>PRICING</small><h2>${b.title}</h2><p>${b.text||""}</p><div class="cmb-pricing-grid">${plans.map((p,i)=>`<article><h3>${p}</h3><strong>${i===0?"$9":i===1?"$29":"$79"}</strong><p>Useful tools and features for your project.</p><a href="#">Choose plan</a></article>`).join("")}</div></section>`;}
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
 qsa(".device").forEach(b=>b.classList.toggle("active",b.dataset.device===device));
}
qsa(".device").forEach(b=>b.onclick=()=>setDevice(b.dataset.device));

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
  if(data.ok) reactorResponding(); else reactorError();
 }catch(e){out.textContent="Python backend is offline. Start the Flask server first.";reactorError()}
 finally{button.disabled=false;button.textContent="Ask AI";setTimeout(()=>setReactorState("ready"),900)}
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
 reactorThinking();
 out.textContent="Preparing proposed changes...";
 try{
  const r=await fetch("http://127.0.0.1:5000/api/ai/apply",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({request:prompt,files:state.files})});
  const data=await r.json(); if(!data.ok){out.textContent=data.error||"Could not prepare changes";return}
  pendingAiFiles=data.files||{};
  details.innerHTML="";
  ["index.html","style.css","script.js"].forEach(f=>{if(typeof pendingAiFiles[f]==="string"){const row=document.createElement("div");row.className="ai-change-row";row.innerHTML="<b></b><span>Updated</span>";row.querySelector("b").textContent=f;details.appendChild(row)}});
  wrap.classList.remove("hidden");out.textContent="Review the proposed file changes before applying them.";reactorResponding();setTimeout(()=>setReactorState("ready"),900);
 }catch(e){out.textContent="Python backend is offline.";reactorError()}finally{setTimeout(()=>setReactorState("ready"),900)}
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


/* CMB AI — AI Builder */
(()=>{
  const idea=document.getElementById("builderIdea"),chars=document.getElementById("builderChars"),btn=document.getElementById("generateBuild"),result=document.getElementById("builderResult"),title=document.getElementById("builderResultTitle"),status=document.getElementById("builderResultStatus");
  if(!idea||!chars||!btn||!result)return;
  idea.addEventListener("input",()=>chars.textContent=idea.value.length+" / 1000");
  btn.addEventListener("click",async()=>{
    const q=idea.value.trim(); if(!q){idea.focus();return}
    btn.disabled=true;btn.textContent="Building…";status.textContent="THINKING";result.innerHTML='<div class="builder-empty">CMB AI is designing your project structure…</div>';reactorThinking();
    try{
      const r=await fetch("http://127.0.0.1:5000/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:"Create a practical starter project plan for this idea. Include a project name, short description, recommended files, and 5 development tasks. Keep it beginner-friendly. Idea: "+q,project:{name:q,files:state.files}})});
      const data=await r.json();
      if(!data.ok)throw new Error(data.error||"Builder failed");
      const text=data.answer||"Project plan generated.";
      title.textContent="Generated project plan";status.textContent="READY";
      result.innerHTML='<div class="builder-file"><div><b>✦ AI PLAN</b><br><small>Generated from your idea</small></div></div><div class="builder-file"><div><b>Project idea</b><br><small>'+escapeHtml(q)+'</small></div></div><div class="builder-file"><div><b>Development plan</b><br><small>'+escapeHtml(text).replace(/\n/g,"<br>")+'</small></div></div>';
      reactorResponding();setTimeout(()=>setReactorState("ready"),900);
    }catch(err){status.textContent="OFFLINE";result.innerHTML='<div class="builder-empty">AI Builder could not reach the local backend. Start the CMB AI Python server and try again.</div>';reactorError();setTimeout(()=>setReactorState("ready"),900)}
    finally{btn.disabled=false;btn.textContent="✦ Generate project"}
  });
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
})();


/* CMB AI — Builder feature controls */
(()=>{
 const tools=[...document.querySelectorAll("[data-builder-tool]")]; if(!tools.length)return;
 tools.forEach(t=>t.addEventListener("click",()=>{
   tools.forEach(x=>x.classList.remove("active"));t.classList.add("active");
   const mode=t.dataset.builderTool, box=document.getElementById("builderResult"); if(!box)return;
   if(mode==="files") box.innerHTML='<div class="builder-tool-panel"><b>▣ Starter files</b><p>index.html — page structure</p><p>style.css — visual design</p><p>script.js — interactions</p></div>';
   if(mode==="tasks") box.innerHTML='<div class="builder-tool-panel"><b>✓ Build tasks</b><div class="builder-task"><input type="checkbox"><span>Create project structure</span></div><div class="builder-task"><input type="checkbox"><span>Design the interface</span></div><div class="builder-task"><input type="checkbox"><span>Build core functionality</span></div><div class="builder-task"><input type="checkbox"><span>Test the project</span></div><div class="builder-task"><input type="checkbox"><span>Prepare for GitHub</span></div></div>';
   if(mode==="preview") box.innerHTML='<div class="builder-tool-panel"><b>▶ Live preview</b><p>Your generated project will be previewed here after files are created.</p><button class="primary" id="builderOpenWorkspace">Open Workspace →</button></div>';
   if(mode==="plan"&&idea&&idea.value.trim()) title&&(title.textContent="Generated project plan");
   box.querySelectorAll(".builder-task input").forEach(cb=>cb.addEventListener("change",()=>cb.closest(".builder-task").classList.toggle("done",cb.checked)));
   const open=document.getElementById("builderOpenWorkspace"); if(open)open.onclick=()=>document.querySelector('[data-open="workspace"]')?.click();
  }));
})();


/* CMB AI — Builder to Workspace file generation */
(()=>{
 const result=document.getElementById("builderResult");
 if(!result)return;
 function buildStarterFiles(){
   const idea=(document.getElementById("builderIdea")?.value||"").trim()||"My CMB AI project";
   state.files["index.html"]='<!doctype html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>'+escapeHtml(idea).replace(/&quot;/g,'\"')+'</title>\n<link rel="stylesheet" href="style.css">\n</head>\n<body>\n<main><h1>'+escapeHtml(idea)+'</h1><p>Built with CMB AI.</p></main>\n<script src="script.js"></script>\n</body>\n</html>';
   state.files["style.css"]='*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;min-height:100vh;display:grid;place-items:center;background:#07111f;color:#eef9ff}main{text-align:center;padding:48px;border:1px solid #1d5270;border-radius:20px;background:#0b1b2c;box-shadow:0 0 45px rgba(0,190,255,.12)}h1{color:#54ddff}';
   state.files["script.js"]='console.log("CMB AI starter project ready");';
   state.currentFile="index.html";
   if(typeof renderFiles==="function")renderFiles();
   if(typeof renderEditor==="function")renderEditor();
   if(typeof saveState==="function")saveState();
   document.querySelector('[data-open="workspace"]')?.click();
 }
 document.addEventListener("click",e=>{
   if(e.target.closest("#builderCreateFiles"))buildStarterFiles();
 });
 window.cmbBuilderCreateFiles=buildStarterFiles;
 function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
})();


/* CMB AI — One-click project build */
(()=>{
 const btn=document.getElementById("buildProject"); if(!btn)return;
 btn.addEventListener("click",()=>{
   const idea=(document.getElementById("builderIdea")?.value||"").trim();
   if(!idea){document.getElementById("builderIdea")?.focus();return}
   btn.disabled=true;btn.textContent="⚡ Building…";reactorThinking();
   setTimeout(()=>{
     if(typeof window.cmbBuilderCreateFiles==="function")window.cmbBuilderCreateFiles();
     const tasks=document.getElementById("tasks");
     if(tasks){tasks.innerHTML='<div class="task"><label><input type="checkbox"> Project structure created</label></div><div class="task"><label><input type="checkbox"> Interface design started</label></div><div class="task"><label><input type="checkbox"> Core functionality</label></div><div class="task"><label><input type="checkbox"> Test and preview</label></div><div class="task"><label><input type="checkbox"> Prepare for GitHub</label></div>';}
     if(typeof updateProgress==="function")updateProgress();
     btn.disabled=false;btn.textContent="⚡ Build project";reactorResponding();setTimeout(()=>setReactorState("ready"),900);
   },700);
 });
})();


/* CMB AI — live task progress */
(()=>{
 function syncTaskProgress(){
   const tasks=[...document.querySelectorAll("#tasks input[type=checkbox]")];
   if(!tasks.length)return;
   const done=tasks.filter(x=>x.checked).length;
   const percent=Math.round(done/tasks.length*100);
   const bar=document.getElementById("progressBar"),text=document.getElementById("progressText"),dash=document.getElementById("progressCount");
   if(bar)bar.style.width=percent+"%";
   if(text)text.textContent=percent+"%";
   if(dash)dash.textContent=percent+"%";
   tasks.forEach(x=>x.closest(".task")?.classList.toggle("done",x.checked));
   localStorage.setItem("cmbai_task_progress",JSON.stringify({done,total:tasks.length,percent}));
 }
 document.addEventListener("change",e=>{if(e.target.matches("#tasks input[type=checkbox]"))syncTaskProgress()});
 window.cmbSyncTaskProgress=syncTaskProgress;
})();


/* CMB AI — keyboard shortcuts */
(()=>{
  document.addEventListener("keydown",e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){
      e.preventDefault();
      document.getElementById("saveCode")?.click();
      document.getElementById("saveCurrent")?.click();
    }
    if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){
      e.preventDefault();
      document.getElementById("preview")?.click();
      document.getElementById("openLivePreview")?.click();
    }
    if(e.key==="Escape"){
      document.getElementById("previewModal")?.classList.add("hidden");
      document.getElementById("livePreviewWrap")?.classList.add("hidden");
    }
  });
})();


/* CMB AI — core UI controls */
(()=>{
  const theme=document.getElementById("theme");
  theme?.addEventListener("click",()=>{
    document.body.classList.toggle("light-theme");
    localStorage.setItem("cmbai_theme",document.body.classList.contains("light-theme")?"light":"dark");
  });
  if(localStorage.getItem("cmbai_theme")==="light")document.body.classList.add("light-theme");
  const close=document.getElementById("closePreview");
  const modal=document.getElementById("previewModal");
  close?.addEventListener("click",()=>modal?.classList.add("hidden"));
  modal?.addEventListener("click",e=>{if(e.target===modal)modal.classList.add("hidden")});
})();


/* CMB AI — workspace live preview */
(()=>{
 const preview=document.getElementById("preview"); if(!preview)return;
 preview.addEventListener("click",()=>{
   const modal=document.getElementById("previewModal"); if(!modal)return;
   const frame=modal.querySelector("iframe");
   const html=state.files?.["index.html"]||"";
   const css=state.files?.["style.css"]||"";
   const js=state.files?.["script.js"]||"";
   const doc=html.replace("</head>",'<style>'+css.replace(/<\/style/gi,"")+'</style></head>').replace("</body>",'<script>'+js.replace(/<\/script/gi,"")+'</script></body>');
   if(frame)frame.srcdoc=doc;
   modal.classList.remove("hidden");
 });
})();


/* CMB AI — responsive live preview */
(()=>{
 const modal=document.getElementById("previewModal");
 if(!modal)return;
 const shell=modal.querySelector(".preview-shell");
 const frame=modal.querySelector("iframe");
 document.addEventListener("click",e=>{
   const btn=e.target.closest("[data-preview-device]");
   if(!btn)return;
   shell?.classList.remove("preview-tablet","preview-mobile");
   const mode=btn.dataset.previewDevice;
   if(mode==="tablet")shell?.classList.add("preview-tablet");
   if(mode==="mobile")shell?.classList.add("preview-mobile");
   document.querySelectorAll("[data-preview-device]").forEach(x=>x.classList.toggle("active",x===btn));
   if(frame)frame.style.width="100%";
 });
})();
 

/* CMB AI — development cycle controls */
(()=>{
 const run=document.getElementById("runProject"),fix=document.getElementById("fixWithAI");
 run?.addEventListener("click",()=>{document.getElementById("preview")?.click()});
 fix?.addEventListener("click",async()=>{
   const code=state.files?.["index.html"]||"";
   const request=prompt("What should CMB AI fix in your project?","Find and fix errors in the current project.");
   if(!request)return;
   reactorThinking();fix.disabled=true;fix.textContent="✦ Fixing…";
   try{
    const r=await fetch("http://127.0.0.1:5000/api/ai/apply",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({request,files:state.files})});
    const data=await r.json();if(!data.ok)throw new Error(data.error||"AI fix failed");
    Object.entries(data.files||{}).forEach(([name,value])=>{if(value!==null&&value!==undefined)state.files[name]=value});
    if(typeof renderFiles==="function")renderFiles();if(typeof renderEditor==="function")renderEditor();if(typeof saveState==="function")saveState();
    reactorResponding();setTimeout(()=>setReactorState("ready"),900);document.getElementById("preview")?.click();
   }catch(e){reactorError();setTimeout(()=>setReactorState("ready"),900);alert("AI Fix could not connect to the CMB AI backend.")}
   finally{fix.disabled=false;fix.textContent="✦ AI Fix"}
 });
})();


/* CMB AI — local development console */
(()=>{
 const form=document.getElementById("terminalForm"),input=document.getElementById("terminalInput"),out=document.getElementById("terminalOutput"),clear=document.getElementById("clearTerminal");if(!form||!input||!out)return;
 const log=(msg,type="")=>{const d=document.createElement("div");d.className=type;d.innerHTML=msg;out.appendChild(d);out.scrollTop=out.scrollHeight};
 form.addEventListener("submit",e=>{e.preventDefault();const q=input.value.trim();if(!q)return;log('<span class="terminal-prompt">CMB&gt;</span> '+escape(q));input.value="";
   const cmd=q.toLowerCase();
   if(cmd==="clear"){out.innerHTML="";return}
   if(cmd==="help"){log("Available: help, files, status, preview, build, clear");return}
   if(cmd==="files"){log(Object.keys(state.files||{}).map(x=>"• "+escape(x)).join("<br>")||"No files");return}
   if(cmd==="status"){log("Project: "+escape(state.active?.name||"Untitled Project")+"<br>Files: "+Object.keys(state.files||{}).length+"<br>Status: READY","terminal-ok");return}
   if(cmd==="preview"){document.getElementById("preview")?.click();log("Opening live preview…","terminal-ok");return}
   if(cmd==="build"){document.getElementById("buildProject")?.click();log("Starting project build…","terminal-ok");return}
   log("Unknown command. Type <b>help</b> for available commands.","terminal-error");
 });
 clear?.addEventListener("click",()=>out.innerHTML="");
 function escape(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
})();


/* CMB AI — read real GitHub repository files */
(()=>{
 const btn=document.getElementById("githubPrepare"),repoInput=document.getElementById("githubRepo"),branch=document.getElementById("githubBranch"),list=document.getElementById("githubFiles"),status=document.getElementById("githubStatus"),summary=document.getElementById("githubSummary");if(!btn)return;
 const original=btn.onclick;
 btn.onclick=async()=>{
   const repo=repoInput.value.trim();if(!repo){repoInput.focus();return}
   status.innerHTML="<i></i> CONNECTING";summary.textContent="Reading repository…";list.innerHTML='<div class="builder-empty">Connecting to GitHub…</div>';reactorThinking();
   try{
    const r=await fetch("http://127.0.0.1:5000/api/github/tree?repo="+encodeURIComponent(repo)+"&branch="+encodeURIComponent(branch.value.trim()||"main"));
    const data=await r.json();if(!data.ok)throw new Error(data.error||"GitHub connection failed");
    status.classList.add("connected");status.innerHTML="<i></i> CONNECTED";summary.textContent=data.repo+" · "+data.branch+" · "+data.files.length+" repository files";list.innerHTML=data.files.map(name=>'<button type="button" class="github-file-row github-file-button" data-github-path="'+escape(name)+'"><span>▣ '+escape(name)+'</span><small>OPEN</small></button>').join("")||'<div class="builder-empty">Repository has no files.</div>';reactorResponding();setTimeout(()=>setReactorState("ready"),900);
   }catch(e){status.classList.remove("connected");status.innerHTML="<i></i> OFFLINE";summary.textContent=e.message||"Could not connect to GitHub. Configure GITHUB_TOKEN in the backend.";list.innerHTML='<div class="builder-empty">GitHub connection is unavailable. Start the backend and configure GITHUB_TOKEN.</div>';reactorError();setTimeout(()=>setReactorState("ready"),900)}
 };
 function escape(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
})();


/* CMB AI — GitHub remote file inspection */
(()=>{
 const list=document.getElementById("githubFiles");
 if(!list)return;
 list.addEventListener("click",async e=>{
   const row=e.target.closest("[data-github-path]");
   if(!row)return;
   const repoInput=document.getElementById("githubRepo");
   const branchInput=document.getElementById("githubBranch");
   const repoName=(repoInput?.value||"").trim();
   const branch=(branchInput?.value||"main").trim()||"main";
   const path=row.dataset.githubPath;
   if(!repoName||repoName.split("/").length!==2||!path)return;
   const parts=repoName.split("/");
   const raw="https://raw.githubusercontent.com/"+encodeURIComponent(parts[0])+"/"+encodeURIComponent(parts[1])+"/"+branch.split("/").map(encodeURIComponent).join("/")+"/"+path.split("/").map(encodeURIComponent).join("/");
   row.disabled=true;
   const old=row.innerHTML;
   row.innerHTML="<span>◌ Loading "+escapeHtml(path)+"…</span>";
   reactorThinking();
   try{
     const response=await fetch(raw,{cache:"no-store"});
     if(!response.ok)throw new Error("Remote file could not be loaded");
     const content=await response.text();
     state.files[path]=content;
     state.currentFile=path;
     if(typeof renderFiles==="function")renderFiles();
     if(typeof renderEditor==="function")renderEditor();
     document.querySelector('[data-open="workspace"]')?.click();
     reactorResponding();
     setTimeout(()=>setReactorState("ready"),700);
   }catch(err){
     row.innerHTML=old;
     reactorError();
     setTimeout(()=>setReactorState("ready"),900);
     alert("CMB AI could not load this public GitHub file. Check the repository, branch, and file path.");
   }finally{row.disabled=false}
 });
 function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]))}
})();
/* CMB AI — GitHub file viewer workspace sync */
(()=>{
 const list=document.getElementById("githubFiles");
 if(!list)return;
 document.addEventListener("click",e=>{
   const row=e.target.closest("#githubFiles [data-github-path]");
   if(!row)return;
   const path=row.dataset.githubPath;
   if(!path)return;
   setTimeout(()=>{
     const title=document.getElementById("editorTitle");
     if(title)title.textContent=path;
     document.querySelectorAll("#githubFiles [data-github-path]").forEach(x=>x.classList.toggle("active",x===row));
   },0);
 });
})();


/* CMB AI — upgraded project generator */
(()=>{
 const btn=document.getElementById("buildProject");
 if(!btn)return;
 btn.addEventListener("click",()=>{
   const idea=(document.getElementById("builderIdea")?.value||"").trim();
   if(!idea)return;
   setTimeout(()=>{
     const safe=String(idea).replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
     const title=safe.length>54?safe.slice(0,54)+"…":safe;
     state.files["index.html"]='<!doctype html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<meta name="description" content="'+safe+'">\n<title>'+title+' — Built with CMB AI</title>\n<link rel="stylesheet" href="style.css">\n</head>\n<body>\n<header class="site-nav"><strong>CMB AI</strong><nav><a href="#features">Features</a><a href="#about">About</a><a href="#start">Start</a></nav></header>\n<main>\n<section class="hero"><span class="eyebrow">✦ BUILT WITH CMB AI</span><h1>'+safe+'</h1><p>Turn your idea into a clear, modern digital experience with a responsive foundation ready to customize.</p><a class="cta" href="#start">Start building →</a></section>\n<section id="features" class="section"><span class="eyebrow">CORE FEATURES</span><h2>Everything starts with a strong foundation.</h2><div class="grid"><article><b>01</b><h3>Plan</h3><p>Break the idea into practical steps and milestones.</p></article><article><b>02</b><h3>Build</h3><p>Create clean responsive pages with reusable sections.</p></article><article><b>03</b><h3>Launch</h3><p>Preview, improve, and prepare the project for deployment.</p></article></div></section>\n<section id="about" class="section highlight"><h2>Designed to grow with your idea.</h2><p>Your starter project is intentionally simple so you can keep adding features, pages, APIs, and AI capabilities.</p></section>\n<section id="start" class="section final"><h2>Ready to make it real?</h2><p>Edit the files in CMB AI Workspace and preview your changes instantly.</p><button class="cta" id="startBtn">Let’s build</button></section>\n</main>\n<footer>Built with CMB AI · Create. Make. Build.</footer>\n<script src="script.js"></script>\n</body>\n</html>';
     state.files["style.css"]='*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:Inter,system-ui,sans-serif;background:#050b16;color:#eef7ff;line-height:1.6}.site-nav{position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;align-items:center;padding:18px 7%;background:rgba(5,11,22,.82);backdrop-filter:blur(16px);border-bottom:1px solid rgba(90,190,255,.15)}nav{display:flex;gap:22px}a{color:inherit;text-decoration:none}.hero,.section{max-width:1100px;margin:auto;padding:110px 7%}.hero{text-align:center;min-height:70vh;display:flex;flex-direction:column;justify-content:center;align-items:center}.eyebrow{font-size:11px;letter-spacing:.18em;color:#54ddff;font-weight:800}.hero h1{font-size:clamp(42px,7vw,82px);line-height:1.02;margin:18px 0}.hero p{max-width:700px;color:#9bb0c9;font-size:18px}.cta{display:inline-block;margin-top:18px;padding:13px 22px;border:0;border-radius:12px;background:linear-gradient(135deg,#28c9ff,#786bff);color:white;font-weight:800;box-shadow:0 0 35px rgba(40,200,255,.2);cursor:pointer}.section h2{font-size:clamp(30px,5vw,52px);line-height:1.08}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:35px}.grid article,.highlight,.final{padding:28px;border:1px solid rgba(90,190,255,.14);border-radius:20px;background:rgba(13,27,45,.72)}.grid article b{color:#54ddff}.highlight{margin-bottom:30px}.final{text-align:center}footer{text-align:center;padding:35px;color:#71859d;border-top:1px solid rgba(90,190,255,.12)}@media(max-width:700px){nav{display:none}.hero,.section{padding:75px 6%}.grid{grid-template-columns:1fr}.hero h1{font-size:44px}}';
     state.files["script.js"]='document.getElementById("startBtn")?.addEventListener("click",()=>alert("Your CMB AI project is ready to customize!"));\nconsole.log("CMB AI project online");';
     state.currentFile="index.html";
     if(typeof renderFiles==="function")renderFiles();
     if(typeof renderEditor==="function")renderEditor();
     if(typeof saveState==="function")saveState();
     const result=document.getElementById("builderResult");
     const status=document.getElementById("builderResultStatus");
     const titleEl=document.getElementById("builderResultTitle");
     if(titleEl)titleEl.textContent="Project built successfully";
     if(status)status.textContent="READY";
     if(result)result.innerHTML='<div class="builder-file"><div><b>✓ PROJECT CREATED</b><br><small>'+safe+'</small></div></div><div class="builder-file"><div><b>3 starter files</b><br><small>index.html · style.css · script.js</small></div></div><div class="builder-file"><div><b>Next step</b><br><small>Open Workspace → edit the code → Preview your project.</small></div></div>';
   },120);
 });
})();


/* CMB AI — idea-aware project templates */
(()=>{
 const btn=document.getElementById("buildProject");
 if(!btn)return;
 function makeProject(idea){
   const q=idea.toLowerCase();
   let type="general",label="DIGITAL PRODUCT",features=["Modern interface","Responsive design","Project workflow"];
   if(/shop|store|ecommerce|product|sell|market/.test(q)){type="store";label="ONLINE STORE";features=["Product showcase","Shopping experience","Customer call-to-action"]}
   else if(/restaurant|food|cafe|menu|hotel/.test(q)){type="restaurant";label="HOSPITALITY";features=["Menu showcase","Reservations / contact","Location & hours"]}
   else if(/portfolio|developer|designer|freelance|personal/.test(q)){type="portfolio";label="PORTFOLIO";features=["Featured work","About & skills","Contact section"]}
   else if(/school|course|learn|education|academy/.test(q)){type="education";label="LEARNING PLATFORM";features=["Course sections","Learning resources","Student call-to-action"]}
   else if(/business|company|agency|startup|enterprise/.test(q)){type="business";label="BUSINESS WEBSITE";features=["Services","Company story","Lead generation"]}
   else if(/blog|news|magazine|article/.test(q)){type="content";label="CONTENT PLATFORM";features=["Article layout","Categories","Reader call-to-action"]}
   return {type,label,features};
 }
 function build(idea){
   const safe=String(idea).replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
   const t=makeProject(idea);
   const cards=t.features.map((x,i)=>'<article><b>0'+(i+1)+'</b><h3>'+x+'</h3><p>Designed around your '+t.type+' project and ready to customize.</p></article>').join("");
   state.files["index.html"]='<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="'+safe+'"><title>'+safe+'</title><link rel="stylesheet" href="style.css"></head><body><header class="nav"><strong>CMB AI</strong><nav><a href="#features">Features</a><a href="#about">About</a><a href="#contact">Contact</a></nav></header><main><section class="hero"><span>'+t.label+'</span><h1>'+safe+'</h1><p>A purpose-built starting point generated from your idea by CMB AI.</p><a class="cta" href="#features">Explore project →</a></section><section id="features" class="section"><span>✦ PROJECT FEATURES</span><h2>Built around what you want to create.</h2><div class="grid">'+cards+'</div></section><section id="about" class="section split"><div><span>ABOUT</span><h2>Start simple. Keep building.</h2></div><p>CMB AI gives this project a clear structure so you can continue adding pages, APIs, databases, authentication, and AI features.</p></section><section id="contact" class="section final"><h2>Ready to build?</h2><p>Open the Workspace to edit your generated files and preview them.</p><button class="cta" id="startBtn">Open project</button></section></main><footer>Built with CMB AI · '+t.label+'</footer><script src="script.js"></script></body></html>';
   state.files["style.css"]='*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:Inter,system-ui,sans-serif;background:#050b16;color:#edf8ff;line-height:1.6}.nav{position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;align-items:center;padding:18px 7%;background:rgba(5,11,22,.84);backdrop-filter:blur(16px);border-bottom:1px solid rgba(90,190,255,.14)}nav{display:flex;gap:22px}a{color:inherit;text-decoration:none}.nav strong{color:#54ddff}.hero{min-height:72vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:100px 7%;background:radial-gradient(circle,rgba(0,180,255,.12),transparent 55%)}.hero span,.section>span{font-size:11px;letter-spacing:.18em;color:#54ddff;font-weight:800}.hero h1{font-size:clamp(44px,7vw,88px);line-height:1.02;max-width:1000px;margin:18px 0}.hero p{max-width:700px;color:#9bb0c9;font-size:18px}.cta{display:inline-block;margin-top:18px;padding:13px 22px;border-radius:12px;background:linear-gradient(135deg,#28c9ff,#786bff);color:#fff;font-weight:800;border:0;cursor:pointer}.section{max-width:1100px;margin:auto;padding:100px 7%}.section h2{font-size:clamp(30px,5vw,52px);line-height:1.08}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:32px}.grid article,.split,.final{padding:28px;border:1px solid rgba(90,190,255,.14);border-radius:20px;background:rgba(13,27,45,.72)}.grid article b{color:#54ddff}.split{display:grid;grid-template-columns:1fr 1fr;gap:35px}.final{text-align:center}footer{text-align:center;padding:35px;color:#71859d;border-top:1px solid rgba(90,190,255,.12)}@media(max-width:700px){nav{display:none}.section{padding:70px 6%}.grid,.split{grid-template-columns:1fr}.hero{padding:75px 6%}.hero h1{font-size:46px}}';
   state.files["script.js"]='document.getElementById("startBtn")?.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));console.log("CMB AI '+t.type+' project online");';
   state.currentFile="index.html";
   if(typeof renderFiles==="function")renderFiles();
   if(typeof renderEditor==="function")renderEditor();
   if(typeof saveState==="function")saveState();
   return t;
 }
 window.cmbBuildIdeaAwareProject=build;
 const old=btn;
 old.addEventListener("click",()=>{
   const idea=(document.getElementById("builderIdea")?.value||"").trim();
   if(!idea)return;
   const t=build(idea);
   const result=document.getElementById("builderResult");
   if(result)result.innerHTML='<div class="builder-file"><div><b>✓ '+t.label+'</b><br><small>Template selected from your idea.</small></div></div><div class="builder-file"><div><b>Features</b><br><small>'+t.features.join(" · ")+'</small></div></div><div class="builder-file"><div><b>Files ready</b><br><small>index.html · style.css · script.js</small></div></div>';
 });
})();


/* CMB AI — multi-page project generator */
(()=>{
 const btn=document.getElementById("buildProject");
 if(!btn)return;
 const pageSets={
  store:["index.html","products.html","about.html","contact.html"],
  restaurant:["index.html","menu.html","about.html","contact.html"],
  portfolio:["index.html","work.html","about.html","contact.html"],
  education:["index.html","courses.html","about.html","contact.html"],
  business:["index.html","services.html","about.html","contact.html"],
  content:["index.html","articles.html","about.html","contact.html"],
  general:["index.html","features.html","about.html","contact.html"]
 };
 function esc(s){return String(s).replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));}
 function detect(idea){
  const q=idea.toLowerCase();
  if(/shop|store|ecommerce|product|sell|market/.test(q))return "store";
  if(/restaurant|food|cafe|menu|hotel/.test(q))return "restaurant";
  if(/portfolio|developer|designer|freelance|personal/.test(q))return "portfolio";
  if(/school|course|learn|education|academy/.test(q))return "education";
  if(/business|company|agency|startup|enterprise/.test(q))return "business";
  if(/blog|news|magazine|article/.test(q))return "content";
  return "general";
 }
 function makePage(title,idea,type,active){
  const labels={store:"Products",restaurant:"Menu",portfolio:"Work",education:"Courses",business:"Services",content:"Articles",general:"Features"};
  const section=labels[type]||"Features";
  return '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="'+esc(idea)+'"><title>'+esc(title)+' · CMB AI</title><link rel="stylesheet" href="style.css"></head><body><header class="nav"><a class="brand" href="index.html">CMB AI</a><nav><a class="'+(active==="home"?"active":"")+'" href="index.html">Home</a><a class="'+(active==="main"?"active":"")+'" href="'+(type==="store"?"products.html":type==="restaurant"?"menu.html":type==="portfolio"?"work.html":type==="education"?"courses.html":type==="business"?"services.html":"features.html")+'">'+section+'</a><a class="'+(active==="about"?"active":"")+'" href="about.html">About</a><a class="'+(active==="contact"?"active":"")+'" href="contact.html">Contact</a></nav></header><main class="page"><span class="eyebrow">'+esc(type.toUpperCase())+'</span><h1>'+esc(title)+'</h1><p class="lead">'+esc(idea)+'</p><section class="cards"><article><b>01</b><h2>'+section+' experience</h2><p>A structured area ready for real content, components, APIs, and AI features.</p></article><article><b>02</b><h2>Responsive by default</h2><p>This page is designed to adapt across desktop, tablet, and mobile screens.</p></article><article><b>03</b><h2>Keep building</h2><p>Open the Workspace to edit this page and connect it to the rest of your project.</p></article></section></main><footer>Generated by CMB AI · <a href="index.html">Return home</a></footer></body></html>';
 }
 function buildMulti(idea){
  const type=detect(idea), names=pageSets[type], clean=esc(idea);
  state.files={};
  const titles={
   "index.html":clean,
   "products.html":"Products",
   "menu.html":"Menu",
   "work.html":"Featured Work",
   "courses.html":"Courses",
   "services.html":"Services",
   "features.html":"Features",
   "articles.html":"Latest Articles",
   "about.html":"About the Project",
   "contact.html":"Contact"
  };
  names.forEach((file,i)=>state.files[file]=makePage(titles[file],idea,type,i===0?"home":file==="about.html"?"about":file==="contact.html"?"contact":"main"));
  state.files["style.css"]='*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:Inter,system-ui,sans-serif;background:#050b16;color:#edf8ff;line-height:1.65}.nav{position:sticky;top:0;z-index:10;display:flex;justify-content:space-between;align-items:center;padding:18px 7%;background:rgba(5,11,22,.88);backdrop-filter:blur(18px);border-bottom:1px solid rgba(84,221,255,.14)}.brand{font-weight:900;color:#54ddff;font-size:20px}.nav nav{display:flex;gap:20px}.nav nav a{color:#9db1c8;text-decoration:none}.nav nav a:hover,.nav nav a.active{color:#54ddff}.page{max-width:1100px;margin:auto;padding:110px 7%;min-height:75vh}.eyebrow{font-size:11px;letter-spacing:.2em;color:#54ddff;font-weight:900}.page h1{font-size:clamp(44px,7vw,82px);line-height:1.04;max-width:950px;margin:18px 0}.lead{font-size:19px;color:#9db1c8;max-width:760px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:55px}.cards article{padding:28px;border:1px solid rgba(84,221,255,.15);border-radius:20px;background:rgba(12,27,45,.72)}.cards b{color:#54ddff}.cards h2{font-size:22px}.cards p{color:#8ea4bc}footer{text-align:center;padding:35px;color:#71859d;border-top:1px solid rgba(84,221,255,.12)}footer a{color:#54ddff}@media(max-width:720px){.nav{align-items:flex-start}.nav nav{gap:10px;font-size:12px;flex-wrap:wrap;justify-content:flex-end}.page{padding:75px 6%}.cards{grid-template-columns:1fr}.page h1{font-size:48px}}';
  state.files["script.js"]='console.log("CMB AI multi-page project online");';
  state.currentFile="index.html";
  if(typeof renderFiles==="function")renderFiles();
  if(typeof renderEditor==="function")renderEditor();
  if(typeof saveState==="function")saveState();
  return {type,names};
 }
 window.cmbBuildMultiPageProject=buildMulti;
 btn.addEventListener("click",()=>{
  const idea=(document.getElementById("builderIdea")?.value||"").trim();
  if(!idea)return;
  setTimeout(()=>{
   const out=buildMulti(idea), result=document.getElementById("builderResult");
   if(result)result.innerHTML='<div class="builder-file"><div><b>✓ Multi-page project created</b><br><small>Type: '+out.type+'</small></div></div><div class="builder-file"><div><b>Pages</b><br><small>'+out.names.join(" · ")+'</small></div></div><div class="builder-file"><div><b>Ready in Workspace</b><br><small>Edit each page, then use Preview to test the project.</small></div></div>';
  },180);
 });
})();


/* CMB AI — multi-page live preview + internal navigation */
(()=>{
 const modal=document.getElementById("previewModal");
 const open=document.getElementById("preview");
 if(!modal||!open)return;
 function buildDoc(){
   const files=state.files||{};
   let html=files[state.currentFile||"index.html"]||files["index.html"]||"";
   const css=files["style.css"]||"";
   const js=files["script.js"]||"";
   html=html.replace(/<link[^>]+href=["']style\.css["'][^>]*>/gi,"");
   html=html.replace(/<script[^>]+src=["']script\.js["'][^>]*><\/script>/gi,"");
   html=html.replace("</head>",'<style>'+css.replace(/<\/style/gi,"")+'</style></head>');
   const navScript='<script>(function(){document.addEventListener("click",function(e){const a=e.target.closest("a[href]");if(!a)return;const h=a.getAttribute("href");if(!h||h.startsWith("#")||/^(https?:|mailto:|tel:)/i.test(h))return;e.preventDefault();parent.postMessage({type:"cmb-preview-page",file:h},"*")});})();<\/script>';
   html=html.replace("</body>",navScript+'<script>'+js.replace(/<\/script/gi,"")+'</script></body>');
   return html;
 }
 function refresh(){
   const frame=modal.querySelector("iframe");
   if(frame)frame.srcdoc=buildDoc();
 }
 function show(){
   refresh();
   modal.classList.remove("hidden");
 }
 open.addEventListener("click",show);
 window.addEventListener("message",e=>{
   if(e.data?.type!=="cmb-preview-page")return;
   const file=String(e.data.file||"").split("#")[0].replace(/^\.\//,"");
   if(!state.files[file])return;
   state.currentFile=file;
   if(typeof renderFiles==="function")renderFiles();
   if(typeof renderEditor==="function")renderEditor();
   refresh();
 });
 window.cmbRefreshLivePreview=refresh;
})();


/* CMB AI — natural-language project editor */
(()=>{
 const form=document.getElementById("aiCommandForm"),input=document.getElementById("aiCommand"),status=document.getElementById("aiCommandStatus");
 if(!form||!input)return;
 form.addEventListener("submit",async e=>{
  e.preventDefault();
  const instruction=input.value.trim();
  if(!instruction)return;
  const files={...state.files};
  status.textContent="AI is analyzing your project…";
  reactorThinking();
  try{
   const res=await fetch("http://127.0.0.1:5000/api/ai/apply",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
    instruction,
    files,
    current_file:state.currentFile
   })});
   if(!res.ok)throw new Error("AI request failed");
   const data=await res.json();
   const updated=data.files||data.updated_files||data.project;
   if(!updated||typeof updated!=="object")throw new Error("No project changes returned");
   Object.keys(updated).forEach(name=>{if(typeof updated[name]==="string")state.files[name]=updated[name]});
   state.currentFile=data.current_file||state.currentFile;
   if(typeof renderFiles==="function")renderFiles();
   if(typeof renderEditor==="function")renderEditor();
   if(typeof saveState==="function")saveState();
   if(typeof cmbRefreshLivePreview==="function")cmbRefreshLivePreview();
   status.textContent="✓ AI applied the requested project change.";
   reactorResponding();
   input.value="";
  }catch(err){
   status.textContent="AI editor is offline or could not apply that change.";
   reactorError();
  }
 });
})();


/* CMB AI — AI change preview / accept / reject */
(()=>{
 const form=document.getElementById("aiCommandForm"),input=document.getElementById("aiCommand"),status=document.getElementById("aiCommandStatus");
 const previewBtn=document.getElementById("aiPreviewChanges"),acceptBtn=document.getElementById("aiAcceptChanges"),rejectBtn=document.getElementById("aiRejectChanges");
 if(!form||!input||!previewBtn)return;
 let pending=null;
 async function requestChanges(){
   const instruction=input.value.trim();
   if(!instruction){status.textContent="Enter a change first.";return}
   status.textContent="AI is preparing a change preview…"; reactorThinking();
   previewBtn.disabled=true;
   try{
    const res=await fetch("http://127.0.0.1:5000/api/ai/apply",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({instruction,files:{...state.files},current_file:state.currentFile})});
    if(!res.ok)throw new Error("AI request failed");
    const data=await res.json(), updated=data.files||data.updated_files||data.project;
    if(!updated||typeof updated!=="object")throw new Error("No changes returned");
    pending={files:{...updated},current_file:data.current_file||state.currentFile,instruction};
    const changed=Object.keys(pending.files).filter(k=>pending.files[k]!==state.files[k]);
    status.textContent="Preview ready: "+(changed.length||0)+" file(s) changed.";
    acceptBtn.disabled=false; rejectBtn.disabled=false; reactorResponding();
   }catch(err){status.textContent="Could not create the AI preview.";reactorError()}
   finally{previewBtn.disabled=false}
 }
 previewBtn.addEventListener("click",requestChanges);
 form.addEventListener("submit",e=>{e.preventDefault();requestChanges()});
 acceptBtn?.addEventListener("click",()=>{
   if(!pending)return;
   Object.keys(pending.files).forEach(name=>{if(typeof pending.files[name]==="string")state.files[name]=pending.files[name]});
   state.currentFile=pending.current_file||state.currentFile;
   if(typeof renderFiles==="function")renderFiles(); if(typeof renderEditor==="function")renderEditor(); if(typeof saveState==="function")saveState(); if(typeof cmbRefreshLivePreview==="function")cmbRefreshLivePreview();
   status.textContent="✓ Changes accepted and saved to the Workspace."; window.dispatchEvent(new Event("cmb:ai-accepted"));
   pending=null; acceptBtn.disabled=true; rejectBtn.disabled=true; input.value=""; reactorResponding();
 });
 rejectBtn?.addEventListener("click",()=>{
   pending=null; acceptBtn.disabled=true; rejectBtn.disabled=true; status.textContent="Changes rejected. Your project was not modified."; reactorReady();
 });
 window.cmbPendingAiChange=()=>pending;
})();


/* CMB AI — file-by-file AI diff viewer */
(()=>{
 const modal=document.getElementById("aiDiffModal"), filesEl=document.getElementById("aiDiffFiles"), summary=document.getElementById("aiDiffSummary");
 const openBtn=document.getElementById("aiPreviewChanges"), closeBtn=document.getElementById("closeAiDiff");
 if(!modal||!filesEl||!openBtn)return;
 function esc(s){return String(s).replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));}
 function diffLines(a,b){
   const old=(a||"").split("\n"), neu=(b||"").split("\n"), out=[], max=Math.max(old.length,neu.length);
   for(let i=0;i<max;i++){
     if(old[i]===neu[i]) out.push('<div class="diff-line same"><span>'+(i+1)+'</span><code>'+esc(old[i]??"")+'</code></div>');
     else {
       if(old[i]!==undefined) out.push('<div class="diff-line removed"><span>−</span><code>'+esc(old[i])+'</code></div>');
       if(neu[i]!==undefined) out.push('<div class="diff-line added"><span>+</span><code>'+esc(neu[i])+'</code></div>');
     }
   }
   return out.join("");
 }
 function renderDiff(){
   const p=window.cmbPendingAiChange?.();
   if(!p){summary.textContent="No pending AI changes.";filesEl.innerHTML="";return}
   const names=[...new Set([...Object.keys(state.files),...Object.keys(p.files)])];
   const changed=names.filter(n=>(state.files[n]??"")!==(p.files[n]??""));
   summary.innerHTML="<b>"+changed.length+"</b> file(s) changed · Review before accepting.";
   filesEl.innerHTML=changed.map(name=>'<section class="ai-diff-file"><header><strong>'+esc(name)+'</strong><small>'+((state.files[name]||"").split("\n").length)+' → '+((p.files[name]||"").split("\n").length)+' lines</small></header><div class="diff-code">'+diffLines(state.files[name],p.files[name])+'</div></section>').join("")||'<p>No differences found.</p>';
 }
 openBtn.addEventListener("click",()=>{setTimeout(()=>{renderDiff();modal.classList.remove("hidden");modal.setAttribute("aria-hidden","false")},30)});
 closeBtn?.addEventListener("click",()=>{modal.classList.add("hidden");modal.setAttribute("aria-hidden","true")});
 modal.addEventListener("click",e=>{if(e.target===modal)closeBtn?.click()});
 document.addEventListener("click",e=>{if(e.target.closest("#aiAcceptChanges"))setTimeout(()=>{modal.classList.add("hidden");modal.setAttribute("aria-hidden","true")},80)});
})();


/* CMB AI — local project version history */
(()=>{
 const MAX=15,key="cmbai_version_history";
 const history=JSON.parse(localStorage.getItem(key)||"[]");
 function snapshot(label){
   const files={...state.files};
   history.unshift({id:Date.now(),label:label||"Project snapshot",time:new Date().toLocaleString(),currentFile:state.currentFile,files});
   history.splice(MAX);
   localStorage.setItem(key,JSON.stringify(history));
   update();
 }
 function update(){
   const undo=document.getElementById("undoVersion");
   if(undo)undo.disabled=history.length<1;
   const list=document.getElementById("versionList");
   if(!list)return;
   list.innerHTML=history.length?history.map((v,i)=>'<button class="version-item" data-version="'+i+'"><b>'+(i===0?"Latest":"Version "+(history.length-i))+'</b><span>'+v.label+'</span><small>'+v.time+'</small></button>').join(""):'<p>No saved versions yet.</p>';
 }
 function restore(i){
   const v=history[i]; if(!v)return;
   state.files={...v.files}; state.currentFile=v.currentFile||"index.html";
   if(typeof renderFiles==="function")renderFiles();
   if(typeof renderEditor==="function")renderEditor();
   if(typeof saveState==="function")saveState();
   if(typeof cmbRefreshLivePreview==="function")cmbRefreshLivePreview();
   document.getElementById("versionModal")?.classList.add("hidden");
 }
 window.cmbCreateVersion=snapshot;
 window.cmbVersionHistory=history;
 document.getElementById("versionHistory")?.addEventListener("click",()=>{update();document.getElementById("versionModal")?.classList.remove("hidden")});
 document.getElementById("closeVersionHistory")?.addEventListener("click",()=>document.getElementById("versionModal")?.classList.add("hidden"));
 document.getElementById("versionList")?.addEventListener("click",e=>{const b=e.target.closest("[data-version]");if(b)restore(Number(b.dataset.version))});
 document.getElementById("undoVersion")?.addEventListener("click",()=>restore(0));
 update();
 window.addEventListener("cmb:ai-accepted",()=>snapshot("AI change accepted"));
})();


/* CMB AI — project checker */
(()=>{
 const btn=document.getElementById("projectCheck"),modal=document.getElementById("checkModal"),results=document.getElementById("checkResults"),status=document.getElementById("checkStatus");
 if(!btn||!modal||!results)return;
 function item(ok,title,detail){return '<div class="check-item '+(ok?"check-ok":"check-bad")+'"><b>'+(ok?"✓":"!")+ " "+title+'</b><small>'+detail+'</small></div>'}
 function run(){
  const files=state.files||{}, names=Object.keys(files), issues=[], checks=[];
  const htmlFiles=names.filter(n=>/\.html?$/i.test(n));
  const cssFiles=names.filter(n=>/\.css$/i.test(n));
  const jsFiles=names.filter(n=>/\.js$/i.test(n));
  checks.push(["Project files",names.length>0,names.length+" file(s) found."]);
  checks.push(["HTML entry point",!!files["index.html"],files["index.html"]?"index.html is present.":"index.html is missing."]);
  htmlFiles.forEach(n=>{
   const x=files[n]||"";
   const ok=/<html[\s>]/i.test(x)&&/<\/html>/i.test(x)&&/<head[\s>]/i.test(x)&&/<body[\s>]/i.test(x);
   checks.push([n+" structure",ok,ok?"HTML document structure looks valid.":"Missing html, head, or body structure."]);
   const hrefs=[...x.matchAll(/(?:href|src)=["']([^"']+)["']/gi)].map(m=>m[1]).filter(x=>!/^https?:|^data:|^#|^mailto:|^tel:/i.test(x));
   hrefs.forEach(p=>{const clean=p.split("#")[0].split("?")[0].replace(/^\.\//,"");if(clean&&!files[clean])issues.push(n+" references missing file: "+clean)});
  });
  checks.push(["Stylesheet",cssFiles.length>0,cssFiles.length?cssFiles.length+" CSS file(s) found.":"No CSS file found."]);
  checks.push(["JavaScript",jsFiles.length>0,jsFiles.length?jsFiles.length+" JS file(s) found.":"No JavaScript file found."]);
  Object.keys(files).filter(n=>/\.js$/i.test(n)).forEach(n=>{
   const x=files[n]||"", balanced=(x.split("{").length===x.split("}").length);
   checks.push([n+" braces",balanced,balanced?"Basic brace balance passed.":"Unbalanced { } braces detected."]);
  });
  issues.forEach(x=>checks.push(["Broken file reference",false,x]));
  const bad=checks.filter(x=>!x[1]).length, total=checks.length;
  results.innerHTML='<div class="check-score"><b>'+(bad?"⚠ "+bad+" issue(s) found":"✓ Project looks healthy")+'</b><small>'+total+" checks completed</small></div>"+checks.map(x=>item(x[1],x[0],x[2])).join("");
  status.textContent=bad?bad+" issue(s)":"✓ No basic issues";
  modal.classList.remove("hidden");
 }
 btn.addEventListener("click",run);
 document.getElementById("closeCheck")?.addEventListener("click",()=>modal.classList.add("hidden"));
})();


/* CMB AI — checker helper */
(()=>{const b=document.getElementById('projectCheck'),s=document.getElementById('checkStatus');if(!b||!s)return;const x=document.createElement('button');x.className='small';x.textContent='Fix with AI';x.type='button';b.after(x);x.onclick=()=>{const i=document.getElementById('aiCommand'),p=document.getElementById('aiPreviewChanges');if(!i)return;i.value='Fix the issues found by Project Check while preserving my current design.';s.textContent='Fix request prepared. Preview it before accepting.';p?.click()}})();


/* CMB AI — project health dashboard */
(()=>{
 const scoreEl=document.getElementById("healthScore");
 if(!scoreEl)return;
 function scan(){
  const f=state.files||{}, names=Object.keys(f);
  const html=names.filter(n=>/\.html?$/i.test(n)), css=names.filter(n=>/\.css$/i.test(n)), js=names.filter(n=>/\.js$/i.test(n));
  let points=0,total=0;
  function add(ok){total++;if(ok)points++}
  add(!!f["index.html"]); add(html.length>0); add(css.length>0); add(js.length>0);
  html.forEach(n=>{const x=f[n]||"";add(/<html[\s>]/i.test(x)&&/<\/html>/i.test(x));add(/<head[\s>]/i.test(x)&&/<body[\s>]/i.test(x));});
  js.forEach(n=>{const x=f[n]||"";add(x.split("{").length===x.split("}").length)});
  const refs=[];html.forEach(n=>{[...String(f[n]||"").matchAll(/(?:href|src)=["']([^"']+)["']/gi)].forEach(m=>{const p=m[1].split("#")[0].split("?")[0].replace(/^\.\//,"");if(p&&!/^https?:|^data:|^mailto:|^tel:/i.test(p)&&!f[p])refs.push(p)})});add(refs.length===0);
  const score=Math.round((points/Math.max(total,1))*100);
  scoreEl.textContent=score+"%";
  document.getElementById("healthHtml").textContent="HTML "+(html.length?"✓":"!");
  document.getElementById("healthCss").textContent="CSS "+(css.length?"✓":"!");
  document.getElementById("healthJs").textContent="JS "+(js.length?"✓":"!");
  document.getElementById("healthFiles").textContent="Files "+names.length;
  scoreEl.parentElement?.classList.toggle("health-warning",score<80);
 }
 window.cmbRefreshHealth=scan;
 scan();
 window.addEventListener("cmb:ai-accepted",scan);
})();

/* CMB AI — deployment readiness */
(()=>{
 const el=document.getElementById("deployStatus"); if(!el)return;
 function update(){
  const f=state.files||{}, names=Object.keys(f), html=f["index.html"]||"";
  const missing=[];
  [...html.matchAll(/(?:href|src)=["']([^"']+)["']/gi)].forEach(m=>{
   const p=m[1].split("#")[0].split("?")[0].replace(/^\.\//,"");
   if(p&&!/^https?:|^data:|^mailto:|^tel:/i.test(p)&&!f[p])missing.push(p);
  });
  const ready=!!html&&/<html[\s>]/i.test(html)&&/<\/html>/i.test(html)&&!!names.find(n=>/\.css$/i.test(n))&&missing.length===0;
  el.classList.toggle("ready",ready); el.classList.toggle("blocked",!ready);
  el.querySelector("span").textContent=ready?"✓ Ready to Deploy":("⚠ "+(missing.length?"Fix missing files":"Finish project setup"));
 }
 window.cmbRefreshDeployStatus=update; update();
 window.addEventListener("cmb:ai-accepted",update);
})();

/* CMB AI — build & deploy center */
(()=>{
 const validate=document.getElementById("buildValidate"),run=document.getElementById("buildRun"),deploy=document.getElementById("buildDeploy"),log=document.getElementById("buildLog"),status=document.getElementById("buildCenterStatus"),bar=document.getElementById("buildProgress");
 if(!validate||!run||!deploy)return;
 const write=(msg,p)=>{log.textContent=msg;bar.style.width=p+"%";status.textContent=msg};
 function validateProject(){const f=state.files||{},h=f["index.html"]||"",names=Object.keys(f),bad=[];[...h.matchAll(/(?:href|src)=["']([^"']+)["']/gi)].forEach(m=>{const p=m[1].split("#")[0].split("?")[0].replace(/^\.\//,"");if(p&&!/^https?:|^data:|^mailto:|^tel:/i.test(p)&&!f[p])bad.push(p)});return !!h&&/<html[\s>]/i.test(h)&&/<\/html>/i.test(h)&&names.some(n=>/\.css$/i.test(n))&&!bad.length}
 validate.onclick=()=>{const ok=validateProject();write(ok?"✓ Validation passed — project is ready.":"⚠ Validation found issues — run Project Check.",ok?100:35)};
 run.onclick=async()=>{write("Preparing build…",15);await new Promise(r=>setTimeout(r,250));write("Checking project files…",40);await new Promise(r=>setTimeout(r,250));const ok=validateProject();write(ok?"Compiling project…":"Build stopped: validation failed.",ok?65:25);if(!ok)return;await new Promise(r=>setTimeout(r,300));write("✓ Build completed successfully.",100);window.cmbRefreshHealth?.();window.cmbRefreshDeployStatus?.()};
 deploy.onclick=async()=>{if(!validateProject()){write("Deploy blocked: fix validation issues first.",20);return}write("Packaging deployment…",25);await new Promise(r=>setTimeout(r,350));write("Uploading project…",65);await new Promise(r=>setTimeout(r,350));write("✓ Deployment package prepared. Connect a deployment provider to publish it.",100)};
})();

/* CMB AI — GitHub Pages deployment connector */
(()=>{
 const deploy=document.getElementById("buildDeploy"),repo=document.getElementById("githubDeployRepo"),branch=document.getElementById("githubDeployBranch"),log=document.getElementById("buildLog"),status=document.getElementById("buildCenterStatus");
 if(!deploy||!repo||!branch)return;
 repo.value=localStorage.getItem("cmbai_deploy_repo")||repo.value;
 branch.value=localStorage.getItem("cmbai_deploy_branch")||"main";
 function valid(){return /^[^/\s]+\/[^/\s]+$/.test(repo.value.trim())}
 deploy.addEventListener("click",async()=>{
  const r=repo.value.trim(),b=branch.value.trim()||"main";
  if(!valid()){log.textContent="Enter a GitHub repository as owner/repository.";status.textContent="GitHub repo required";return}
  localStorage.setItem("cmbai_deploy_repo",r);localStorage.setItem("cmbai_deploy_branch",b);
  log.textContent="Preparing GitHub Pages deployment…";status.textContent="GitHub deployment";
  try{
   const res=await fetch("http://127.0.0.1:5000/api/github/deploy",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({repo:r,branch:b,files:state.files||{}})});
   if(!res.ok)throw new Error("Deployment endpoint unavailable");
   const data=await res.json();
   log.textContent=data.url?"✓ Deployment started: "+data.url:"✓ GitHub deployment request sent.";
   status.textContent="Deployment started";
  }catch(e){
   log.textContent="⚠ GitHub deployment needs the backend deployment endpoint and GITHUB_TOKEN.";
   status.textContent="Backend deployment not connected";
  }
 });
})();

/* CMB AI — GitHub Pages live deployment status */
(()=>{
 const link=document.getElementById("pagesDeployLink"),status=document.getElementById("pagesDeployStatus");
 if(!link||!status)return;
 const repo=location.hostname==="calebawaya.github.io" ? "calebawaya/CMB-AI" : "";
 const parts=repo.split("/");
 if(parts.length===2){
  link.href="https://"+parts[0]+".github.io/"+parts[1]+"/";
  link.textContent="Open Live Site";
 }else{
  link.href="https://github.com/calebawaya/CMB-AI/actions";
  link.textContent="Open Deploy Actions";
 }
})();

/* CMB AI — command center */
(()=>{
 const root=document.getElementById("commandCenter"); if(!root)return;
 const refresh=()=>{
  const f=state.files||{}, projects=state.projects||[];
  const score=document.getElementById("healthScore")?.textContent||"--";
  document.getElementById("ccProjects").textContent=projects.length;
  document.getElementById("ccFiles").textContent=Object.keys(f).length;
  document.getElementById("ccHealth").textContent=score;
  document.getElementById("ccAI").textContent="READY";
  document.getElementById("ccDeploy").textContent=document.getElementById("deployStatus")?.classList.contains("ready")?"READY":"CHECK";
 };
 refresh(); window.cmbRefreshCommandCenter=refresh;
 window.addEventListener("cmb:ai-accepted",refresh);
 document.addEventListener("click",e=>{
  const b=e.target.closest("[data-command-target]"); if(!b)return;
  const target=b.dataset.commandTarget;
  document.querySelector(`.nav[data-view="${target}"]`)?.click();
 });
 document.getElementById("buildRun")?.addEventListener("click",()=>{document.getElementById("commandActivity").textContent="Build pipeline started…";setTimeout(()=>{document.getElementById("commandActivity").textContent="Build pipeline completed.";refresh()},500)});
 document.getElementById("buildDeploy")?.addEventListener("click",()=>{document.getElementById("commandActivity").textContent="Deployment process started…";setTimeout(()=>{document.getElementById("commandActivity").textContent="Deployment status updated.";refresh()},700)});
})();

/* CMB AI — activity timeline */
(()=>{
 const list=document.getElementById("activityList"),clear=document.getElementById("clearActivity");
 if(!list)return;
 const key="cmbai_activity_log",events=JSON.parse(localStorage.getItem(key)||"[]");
 const icon=t=>t==="AI"?"✦":t==="BUILD"?"⚙":t==="DEPLOY"?"🚀":t==="CHECK"?"✓":"•";
 function render(){list.innerHTML=events.slice(0,20).map(e=>'<div class="activity-item"><span>'+icon(e.type)+'</span><div><b>'+e.message+'</b><small>'+e.time+'</small></div></div>').join("")||'<div class="activity-empty">No activity recorded yet.</div>'}
 function add(message,type="SYSTEM"){events.unshift({message,type,time:new Date().toLocaleTimeString()});events.splice(20);localStorage.setItem(key,JSON.stringify(events));render();const a=document.getElementById("commandActivity");if(a)a.textContent=message}
 window.cmbLogActivity=add;render();
 document.getElementById("buildRun")?.addEventListener("click",()=>add("Build pipeline started.","BUILD"));
 document.getElementById("buildValidate")?.addEventListener("click",()=>add("Project validation requested.","CHECK"));
 document.getElementById("buildDeploy")?.addEventListener("click",()=>add("Deployment process requested.","DEPLOY"));
 document.getElementById("aiPreviewChanges")?.addEventListener("click",()=>add("AI project change preview requested.","AI"));
 document.getElementById("saveCode")?.addEventListener("click",()=>add("Project code saved.","SYSTEM"));
 document.getElementById("preview")?.addEventListener("click",()=>add("Live project preview opened.","SYSTEM"));
 clear?.addEventListener("click",()=>{events.splice(0);localStorage.setItem(key,"[]");render()});
})();

/* CMB AI — notifications center */
(()=>{
 const panel=document.getElementById("notificationCenter"),bell=document.getElementById("notificationBell"),list=document.getElementById("notificationList"),count=document.getElementById("notificationCount"),clear=document.getElementById("clearNotifications");
 if(!panel||!bell||!list)return;
 const key="cmbai_notifications",items=JSON.parse(localStorage.getItem(key)||"[]");
 function render(){list.innerHTML=items.slice(0,30).map(n=>'<div class="notice notice-'+n.type+'"><span>'+n.icon+'</span><div><b>'+n.title+'</b><small>'+n.message+'</small><time>'+n.time+'</time></div></div>').join("")||'<div class="notice-empty">All clear.</div>';count.textContent=items.length}
 function add(title,message,type="info"){const icons={success:"✓",warning:"!",error:"×",info:"i",ai:"✦",build:"⚙",deploy:"🚀"};items.unshift({title,message,type,icon:icons[type]||"i",time:new Date().toLocaleTimeString()});items.splice(30);localStorage.setItem(key,JSON.stringify(items));render();panel.classList.add("show");setTimeout(()=>panel.classList.remove("show"),2600)}
 window.cmbNotify=add;render();
 bell.addEventListener("click",()=>panel.classList.toggle("show"));
 clear?.addEventListener("click",()=>{items.splice(0);localStorage.setItem(key,"[]");render()});
 document.getElementById("buildRun")?.addEventListener("click",()=>add("Build started","The project build pipeline has started.","build"));
 document.getElementById("buildValidate")?.addEventListener("click",()=>add("Validation started","Checking project structure and files.","info"));
 document.getElementById("buildDeploy")?.addEventListener("click",()=>add("Deployment requested","The deployment pipeline was requested.","deploy"));
 document.getElementById("aiPreviewChanges")?.addEventListener("click",()=>add("AI change preview","AI is preparing project changes for review.","ai"));
})();

/* CMB AI — system console */
(()=>{
 const out=document.getElementById("consoleOutput"),clear=document.getElementById("clearConsole");
 if(!out)return;
 const key="cmbai_console_log",logs=JSON.parse(localStorage.getItem(key)||"[]");
 function render(){out.textContent=logs.slice(-80).join("\n")||"[CMB] Console cleared." ;out.scrollTop=out.scrollHeight}
 function log(message,tag="SYSTEM"){const line="["+new Date().toLocaleTimeString()+"][CMB]["+tag+"] "+message;logs.push(line);logs.splice(0,80);localStorage.setItem(key,JSON.stringify(logs));render();window.cmbNotify?.("System event",message,tag==="ERROR"?"error":"info")}
 window.cmbConsoleLog=log;render();
 clear?.addEventListener("click",()=>{logs.splice(0);localStorage.setItem(key,"[]");render()});
 document.getElementById("buildValidate")?.addEventListener("click",()=>log("Project validation started.","CHECK"));
 document.getElementById("buildRun")?.addEventListener("click",()=>log("Build pipeline started.","BUILD"));
 document.getElementById("buildDeploy")?.addEventListener("click",()=>log("Deployment pipeline requested.","DEPLOY"));
 document.getElementById("aiPreviewChanges")?.addEventListener("click",()=>log("AI change analysis requested.","AI"));
 document.getElementById("saveCode")?.addEventListener("click",()=>log("Project code saved.","SAVE"));
 document.getElementById("preview")?.addEventListener("click",()=>log("Live preview opened.","PREVIEW"));
 window.addEventListener("cmb:ai-accepted",()=>log("AI changes accepted and applied.","AI"));
})();

/* CMB AI — multi-language development lab */
(()=>{
 const select=document.getElementById("languageSelect"),info=document.getElementById("languageInfo"),tags=document.getElementById("languageTags");
 if(!select||!info)return;
 const data={
  HTML:["Web structure","Markup","html"],CSS:["Web styling","Stylesheets","css"],JavaScript:["Web logic","Frontend / Backend","js"],TypeScript:["Typed JavaScript","Frontend / Backend","ts"],Python:["AI, automation, backend","General purpose","py"],Java:["Enterprise and Android","General purpose","java"],C:["Systems programming","Low-level","c"],"C++":["Games and systems","Low-level","cpp"],"C#":[".NET applications","General purpose","cs"],Go:["Cloud and backend","General purpose","go"],Rust:["Safe systems software","Systems","rs"],PHP:["Web backend","Server-side","php"],Ruby:["Web and scripting","General purpose","rb"],Swift:["Apple development","App development","swift"],Kotlin:["Android and backend","General purpose","kt"],SQL:["Databases","Query language","sql"],Shell:["Linux automation","Scripting","sh"],PowerShell:["Windows automation","Scripting","ps1"],R:["Statistics and data","Data science","r"],Dart:["Flutter apps","App development","dart"],Lua:["Games and embedded scripting","Scripting","lua"],Scala:["JVM applications","General purpose","scala"],Perl:["Text processing","Scripting","pl"]
 };
 const render=()=>{const d=data[select.value];info.textContent=select.value+" — "+d[0];tags.innerHTML="<span>"+d[1]+"</span><span>."+d[2]+"</span><span>CMB AI ready</span>"};
 select.addEventListener("change",render);render();
 window.cmbLanguageInfo=()=>data[select.value];
})();

/* CMB AI — language workspace templates */
(()=>{
 const lang=document.getElementById("workspaceLanguage"),name=document.getElementById("languageFileName"),btn=document.getElementById("createLanguageFile"),msg=document.getElementById("languageTemplateStatus");
 if(!lang||!name||!btn)return;
 const ext={HTML:"html",CSS:"css",JavaScript:"js",TypeScript:"ts",Python:"py",Java:"java",C:"c","C++":"cpp","C#":"cs",Go:"go",Rust:"rs",PHP:"php",Ruby:"rb",Swift:"swift",Kotlin:"kt",SQL:"sql",Shell:"sh",PowerShell:"ps1",R:"r",Dart:"dart",Lua:"lua",Scala:"scala",Perl:"pl"};
 const templates={HTML:"<!doctype html>\n<html lang=\"en\">\n<head><meta charset=\"UTF-8\"><title>CMB AI Project</title></head>\n<body>\n  <h1>Hello from CMB AI</h1>\n</body>\n</html>",CSS:"body {\n  margin: 0;\n  font-family: system-ui, sans-serif;\n}",JavaScript:"console.log('CMB AI ready');",TypeScript:"const message: string = 'CMB AI ready';\nconsole.log(message);",Python:"def main():\n    print('CMB AI ready')\n\nif __name__ == '__main__':\n    main()",Java:"public class Main {\n  public static void main(String[] args) {\n    System.out.println(\"CMB AI ready\");\n  }\n}",C:"#include <stdio.h>\nint main(void) {\n  printf(\"CMB AI ready\\n\");\n  return 0;\n}", "C++":"#include <iostream>\nint main() {\n  std::cout << \"CMB AI ready\\n\";\n  return 0;\n}", "C#":"using System;\nclass Program {\n  static void Main() { Console.WriteLine(\"CMB AI ready\"); }\n}",Go:"package main\nimport \"fmt\"\nfunc main() { fmt.Println(\"CMB AI ready\") }",Rust:"fn main() {\n    println!(\"CMB AI ready\");\n}",PHP:"<?php\necho 'CMB AI ready';",Ruby:"puts 'CMB AI ready'",Swift:"import Foundation\nprint(\"CMB AI ready\")",Kotlin:"fun main() {\n    println(\"CMB AI ready\")\n}",SQL:"CREATE TABLE projects (id INTEGER PRIMARY KEY, name TEXT);\nSELECT * FROM projects;",Shell:"#!/usr/bin/env bash\necho 'CMB AI ready'",PowerShell:"Write-Host 'CMB AI ready'",R:"message <- 'CMB AI ready'\nprint(message)",Dart:"void main() {\n  print('CMB AI ready');\n}",Lua:"print('CMB AI ready')",Scala:"object Main extends App {\n  println(\"CMB AI ready\")\n}",Perl:"print \"CMB AI ready\\n\";"};
 function update(){const l=lang.value;e=document.getElementById("languageFileName");if(!name.value)name.value="main."+ext[l];msg.textContent=l+" template ready: ."+ext[l]}
 lang.addEventListener("change",update);update();
 btn.addEventListener("click",()=>{const l=lang.value,file=(name.value||"main."+ext[l]).trim();state.files[file]=templates[l]||"";state.currentFile=file;renderFiles?.();renderEditor?.();saveState?.();msg.textContent="✓ Created "+file;window.cmbLogActivity?.("Created "+file+" from "+l+" template.","SYSTEM");window.cmbConsoleLog?.("Created language file "+file,"LANG");window.cmbNotify?.("Language file created",file,"success");});
})();


/* CMB AI language-aware editor upgrade */
(()=>{
 const code=document.getElementById("code"); if(!code)return;
 const extMap={html:["HTML","⌁"],htm:["HTML","⌁"],css:["CSS","◈"],js:["JavaScript","JS"],mjs:["JavaScript","JS"],ts:["TypeScript","TS"],tsx:["TypeScript React","TS"],jsx:["JavaScript React","JS"],py:["Python","PY"],java:["Java","☕"],c:["C","C"],cpp:["C++","C++"],cc:["C++","C++"],cs:["C#","C#"],go:["Go","GO"],rs:["Rust","RS"],php:["PHP","PHP"],rb:["Ruby","RB"],swift:["Swift","SW"],kt:["Kotlin","KT"],kts:["Kotlin","KT"],sql:["SQL","DB"],sh:["Shell","SH"],bash:["Shell","SH"],ps1:["PowerShell","PS"],r:["R","R"],dart:["Dart","DA"],lua:["Lua","LU"],scala:["Scala","SC"],pl:["Perl","PL"],json:["JSON","{}"],xml:["XML","<>"],yaml:["YAML","YML"],yml:["YAML","YML"],md:["Markdown","MD"]};
 const info=name=>{const ext=(name.split(".").pop()||"").toLowerCase();return extMap[ext]||["Plain Text","TXT"]};
 let bar=document.getElementById("editorLanguageBar");
 if(!bar){bar=document.createElement("div");bar.id="editorLanguageBar";bar.className="code-language-bar";bar.innerHTML='<span class="code-file-icon" id="editorFileIcon">TXT</span><strong id="editorLanguageName">Plain Text</strong><span id="editorLanguageMode">text</span><span class="code-editor-tip">Tab inserts spaces · Ctrl/Cmd+S saves</span>';const editor=code.closest(".editor");editor?.insertBefore(bar,code);}
 const nameEl=document.getElementById("editorLanguageName"),iconEl=document.getElementById("editorFileIcon"),modeEl=document.getElementById("editorLanguageMode");
 function update(){const [name,icon]=info(state.currentFile||"");nameEl.textContent=name;iconEl.textContent=icon;modeEl.textContent=(state.currentFile.split(".").pop()||"txt").toUpperCase();code.dataset.language=name;code.dataset.extension=(state.currentFile.split(".").pop()||"").toLowerCase();document.dispatchEvent(new Event("cmb:editor-refresh"));}
 const observer=new MutationObserver(update);observer.observe(document.getElementById("editorTitle"),{childList:true,subtree:true});
 code.addEventListener("keydown",e=>{
   if(e.key==="Tab"){e.preventDefault();const start=code.selectionStart,end=code.selectionEnd;code.setRangeText("  ",start,end,"end");}
   if(e.key==="Enter"){const before=code.value.slice(0,code.selectionStart);const line=before.slice(before.lastIndexOf("\n")+1);const indent=(line.match(/^\s*/)||[""])[0];if(indent){e.preventDefault();const pos=code.selectionStart;code.setRangeText("\n"+indent,pos,code.selectionEnd,"end");}}
 });
 code.addEventListener("input",()=>{code.dataset.dirty="true";bar.classList.add("dirty");});
 document.getElementById("saveCode")?.addEventListener("click",()=>{code.dataset.dirty="false";bar.classList.remove("dirty");setTimeout(update,0);});
 update();
})();

/* Lightweight local syntax highlighting preview */
(()=>{
 const code=document.getElementById("code");if(!code)return;
 const button=document.createElement("button");button.type="button";button.className="small editor-highlight-toggle";button.textContent="Syntax: ON";
 document.querySelector(".editor-actions")?.appendChild(button);
 let enabled=true;
 button.onclick=()=>{enabled=!enabled;button.textContent="Syntax: "+(enabled?"ON":"OFF");document.getElementById("editorSyntaxPreview")?.classList.toggle("hidden",!enabled);};
 const wrap=code.parentElement,preview=document.createElement("pre");preview.id="editorSyntaxPreview";preview.className="editor-syntax-preview";wrap?.insertBefore(preview,code);
 const esc=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
 function highlight(src){
   let x=esc(src),tokens=[];
   const stash=v=>{const id="§§TOK"+tokens.length+"§§";tokens.push(v);return id;};
   x=x.replace(/(&lt;!--[\s\S]*?--&gt;|\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)/g,m=>stash('<span class="tok-comment">'+m+"</span>"));
   x=x.replace(/(&quot;[^&]*?&quot;|'[^']*')/g,m=>stash('<span class="tok-string">'+m+"</span>"));
   x=x.replace(/\b(true|false|null|undefined|None|True|False|public|private|class|function|def|return|import|from|const|let|var|if|else|for|while|new|async|await|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|TABLE)\b/g,'<span class="tok-key">$1</span>');
   x=x.replace(/\b(\d+(?:\.\d+)?)\b/g,'<span class="tok-number">$1</span>');
   tokens.forEach((v,i)=>{x=x.replaceAll("§§TOK"+i+"§§",v)});return x;
 }
 function render(){if(!enabled)return;preview.innerHTML=highlight(code.value)+"\n";preview.scrollTop=code.scrollTop;preview.scrollLeft=code.scrollLeft;}
 code.addEventListener("input",render);code.addEventListener("scroll",()=>{preview.scrollTop=code.scrollTop;preview.scrollLeft=code.scrollLeft});document.addEventListener("cmb:editor-refresh",render);setTimeout(render,0);
})();
/* CMB AI IDE workspace controls */
(()=>{
 const code=document.getElementById("code");if(!code)return;
 const editor=code.closest(".editor");if(!editor)return;
 let bar=document.getElementById("ideTabs");
 if(!bar){bar=document.createElement("div");bar.id="ideTabs";bar.className="ide-tabs";editor.insertBefore(bar,editor.querySelector(".code-language-bar")||code);}
 let find=document.getElementById("ideFind");
 if(!find){find=document.createElement("div");find.id="ideFind";find.className="ide-find hidden";find.innerHTML='<input id="ideFindInput" class="input" placeholder="Find in file"><input id="ideReplaceInput" class="input" placeholder="Replace with"><button class="small" id="ideFindNext">Find</button><button class="small" id="ideReplaceOne">Replace</button><button class="small" id="ideReplaceAll">Replace all</button><button class="small" id="ideFindClose">×</button>';editor.insertBefore(find,code);}
 let minimap=document.getElementById("ideMinimap");
 if(!minimap){minimap=document.createElement("div");minimap.id="ideMinimap";minimap.className="ide-minimap";editor.appendChild(minimap);}
 function openFiles(){return [...new Set(Object.keys(state.files).filter(Boolean))].slice(0,12)}
 function renderTabs(){
   bar.innerHTML="";
   openFiles().forEach(f=>{
    const b=document.createElement("button");b.type="button";b.className="ide-tab "+(f===state.currentFile?"active":"");b.textContent=f;b.title=f;
    b.onclick=()=>openFile(f);bar.appendChild(b);
   });
   const add=document.createElement("button");add.type="button";add.className="ide-tab-add";add.textContent="+";add.onclick=addFile;bar.appendChild(add);
 }
 function renderMinimap(){
   const lines=code.value.split("\n");const max=Math.max(...lines.map(x=>x.length),1);
   minimap.innerHTML=lines.slice(0,120).map((line,i)=>{const w=Math.max(4,Math.round((line.length/max)*68));return '<i style="width:'+w+'px"></i>';}).join("");
 }
 const oldRenderFiles=window.renderFiles;
 if(typeof oldRenderFiles==="function"){
   const original=oldRenderFiles;
   window.renderFiles=()=>{original();renderTabs();renderMinimap();};
 }
 document.addEventListener("cmb:editor-refresh",()=>{renderTabs();renderMinimap();});
 code.addEventListener("input",renderMinimap);
 code.addEventListener("scroll",()=>{const pct=code.scrollTop/Math.max(1,code.scrollHeight-code.clientHeight);minimap.style.setProperty("--scroll",pct);});
 document.addEventListener("keydown",e=>{
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="f"){e.preventDefault();find.classList.remove("hidden");document.getElementById("ideFindInput")?.focus();}
   if(e.key==="Escape")find.classList.add("hidden");
 });
 document.getElementById("ideFindClose")?.addEventListener("click",()=>find.classList.add("hidden"));
 document.getElementById("ideFindNext")?.addEventListener("click",()=>{
   const q=document.getElementById("ideFindInput").value;if(!q)return;const start=code.selectionEnd;const at=code.value.indexOf(q,start);const pos=at<0?code.value.indexOf(q):at;if(pos>=0){code.focus();code.setSelectionRange(pos,pos+q.length);}
 });
 document.getElementById("ideReplaceOne")?.addEventListener("click",()=>{
   const q=document.getElementById("ideFindInput").value,r=document.getElementById("ideReplaceInput").value;if(!q)return;
   const pos=code.selectionStart,found=code.value.indexOf(q,pos);if(found>=0){code.setRangeText(r,found,found+q.length,"end");code.dispatchEvent(new Event("input"));}
 });
 document.getElementById("ideReplaceAll")?.addEventListener("click",()=>{
   const q=document.getElementById("ideFindInput").value,r=document.getElementById("ideReplaceInput").value;if(!q)return;
   code.value=code.value.split(q).join(r);code.dispatchEvent(new Event("input"));
 });
 renderTabs();renderMinimap();
})();

/* CMB AI advanced editor intelligence */
(()=>{
 const code=document.getElementById("code");if(!code)return;
 const editor=code.closest(".editor");if(!editor)return;
 let gutter=document.getElementById("editorGutter");
 if(!gutter){gutter=document.createElement("div");gutter.id="editorGutter";gutter.className="editor-gutter";editor.appendChild(gutter);}
 let suggest=document.getElementById("editorSuggestions");
 if(!suggest){suggest=document.createElement("div");suggest.id="editorSuggestions";suggest.className="editor-suggestions hidden";editor.appendChild(suggest);}
 function refreshGutter(){
   const n=code.value.split("\n").length;
   gutter.innerHTML=Array.from({length:n},(_,i)=>"<span>"+(i+1)+"</span>").join("");
   gutter.scrollTop=code.scrollTop;
 }
 const wordsByLang={
  html:["html","head","body","div","section","header","main","footer","nav","button","input","form","script","style","title"],
  css:["display","position","relative","absolute","fixed","flex","grid","margin","padding","color","background","border","width","height","font-size"],
  javascript:["const","let","var","function","return","if","else","for","while","async","await","fetch","document","window","console","true","false"],
  python:["def","return","import","from","class","if","else","elif","for","while","in","print","True","False","None"],
  sql:["SELECT","FROM","WHERE","INSERT","UPDATE","DELETE","CREATE","TABLE","JOIN","ORDER","GROUP","BY"],
  default:["function","const","let","return","class","if","else","for","while","import","from","true","false","null"]
 };
 function langKey(){return (code.dataset.language||"").toLowerCase().replace(/[^a-z]/g,"")}
 function suggestions(q){
   const key=langKey(),pool=wordsByLang[key]||wordsByLang.default;
   return pool.filter(x=>x.toLowerCase().startsWith(q.toLowerCase())).slice(0,7);
 }
 function showSuggestions(){
   const before=code.value.slice(0,code.selectionStart),m=before.match(/[A-Za-z_][A-Za-z0-9_-]*$/),q=m?m[0]:"";
   if(q.length<2){suggest.classList.add("hidden");return}
   const list=suggestions(q);if(!list.length){suggest.classList.add("hidden");return}
   suggest.innerHTML=list.map((x,i)=>'<button type="button" data-suggestion="'+i+'">'+x+"</button>").join("");
   suggest.querySelectorAll("button").forEach((b,i)=>b.onclick=()=>{const word=list[i],start=code.selectionStart-q.length;code.setRangeText(word,start,code.selectionEnd,"end");suggest.classList.add("hidden");code.focus();});
   suggest.classList.remove("hidden");
 }
 code.addEventListener("input",()=>{refreshGutter();showSuggestions();validate();});
 code.addEventListener("scroll",()=>{gutter.scrollTop=code.scrollTop;});
 code.addEventListener("keydown",e=>{
   if(e.key==="Escape")suggest.classList.add("hidden");
   if(e.key==="Tab"&&!suggest.classList.contains("hidden")){const b=suggest.querySelector("button");if(b){e.preventDefault();b.click();}}
 });
 function validate(){
   let errors=[];
   const text=code.value,lang=langKey();
   if(["javascript","typescript","java","c","cpp","c","c","rust","go"].includes(lang)){
     const opens=(text.match(/[({[]/g)||[]).length,closes=(text.match(/[)}\]]/g)||[]).length;
     if(opens!==closes)errors.push("Possible unmatched bracket");
   }
   if(lang==="html"&&!/<\/?[a-z][\s\S]*>/i.test(text)&&text.trim())errors.push("HTML markup not detected");
   let box=document.getElementById("editorDiagnostics");
   if(!box){box=document.createElement("div");box.id="editorDiagnostics";box.className="editor-diagnostics";editor.appendChild(box);}
   box.textContent=errors.length?"⚠ "+errors.join(" · "):"✓ No basic syntax issues detected";
   box.classList.toggle("error",!!errors.length);
 }
 setTimeout(()=>{refreshGutter();validate();},0);
})();
