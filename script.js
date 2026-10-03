const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const state={projects:JSON.parse(localStorage.getItem("cmbai_projects")||"[]"),active:null,files:{"index.html":"<!doctype html>\n<html>\n<body><h1>Hello from CMB AI</h1></body>\n</html>","style.css":"body{font-family:system-ui;margin:0}","script.js":"console.log('CMB AI ready');"},currentFile:"index.html"};
function save(){localStorage.setItem("cmbai_projects",JSON.stringify(state.projects))}
function toast(x){const t=$("#toast");t.textContent=x;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
function view(n){$$(".view").forEach(x=>x.classList.add("hidden"));$("#"+n).classList.remove("hidden");$$(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===n));const names={dashboard:"Build something great.",workspace:"Your project workspace.",projects:"Your projects.",github:"Connect and deploy.",settings:"Make CMB AI yours."};$("#title").textContent=names[n];$("#eyebrow").textContent=n.toUpperCase();if(n==="projects")renderProjects()}
function newProject(){const p={id:Date.now(),name:"New CMB AI Project",idea:"",progress:0,created:new Date().toLocaleDateString()};state.projects.unshift(p);state.active=p;save();openProject(p);view("workspace");toast("New project created")}
function openProject(p){state.active=p;$("#projectName").textContent=p.name;$("#idea").value=p.idea||"";setProgress(p.progress||0)}
function setProgress(v){if(state.active){state.active.progress=v;save()}$("#progressBar").style.width=v+"%";$("#progressText").textContent=v+"%";$("#progressCount").textContent=v+"%"}
function makePlan(){let idea=$("#idea").value.trim();if(!idea){toast("Describe your project first");return}if(!state.active){newProject();return}state.active.idea=idea;state.active.name=idea.split(/\s+/).slice(0,4).join(" ")+" Project";$("#projectName").textContent=state.active.name;const tasks=["Define the main user problem","Design the page structure","Build the HTML interface","Style the responsive UI","Add JavaScript interactions","Test desktop and mobile","Prepare for GitHub"];$("#tasks").innerHTML=tasks.map(x=>"<label class='task'><input type='checkbox'> "+x+"</label>").join("");$$(".task input").forEach(x=>x.onchange=()=>setProgress(Math.round($$(".task input:checked").length/tasks.length*100)));save();addChat("CMB AI","I created a 7-step build plan for your idea. Complete each task to track progress.");toast("Build plan created")}
function addChat(who,msg){const a=document.createElement("article");const b=document.createElement("b");b.textContent=who;const p=document.createElement("p");p.textContent=msg;a.append(b,p);$("#chatLog").appendChild(a);$("#chatLog").scrollTop=$("#chatLog").scrollHeight}
function answer(q){const s=q.toLowerCase();let a=s.includes("html")?"Use semantic HTML for the page structure, then connect style.css and script.js.":s.includes("css")?"Keep layout, spacing, colors, and responsive rules in style.css.":s.includes("javascript")||s.includes("js")?"Use script.js for buttons, forms, interactions, and project state.":s.includes("github")?"Your CMB-AI repository is connected to GitHub Pages. Keep frontend files in the repository root.":"Start with a small first version, test it, then add features one at a time.";addChat("CMB AI",a)}
function renderFiles(){$("#fileList").innerHTML=Object.keys(state.files).map(f=>"<div class='file-item "+(f===state.currentFile?"active":"")+"' data-file='"+f+"'>▱ "+f+" <span>›</span></div>").join("");$$(".file-item").forEach(x=>x.onclick=()=>openFile(x.dataset.file));openFile(state.currentFile)}
function openFile(f){state.currentFile=f;$("#editorTitle").textContent=f;$("#code").value=state.files[f]||"";$$(".file-item").forEach(x=>x.classList.toggle("active",x.dataset.file===f))}
function renderProjects(){const b=$("#projectsList");b.innerHTML="";if(!state.projects.length){b.innerHTML="<div class='panel'><h3>No projects yet</h3><p>Start a new project to create your first workspace.</p></div>";return}state.projects.forEach(p=>{const d=document.createElement("div");d.className="project-card";d.innerHTML="<small>PROJECT</small><h3></h3><p></p><small>"+p.progress+"% complete · "+p.created+"</small><br><button class='small'>Open →</button>";d.querySelector("h3").textContent=p.name;d.querySelector("p").textContent=p.idea||"No description yet.";d.querySelector("button").onclick=()=>{openProject(p);view("workspace")};b.appendChild(d)})}
$$(".nav").forEach(x=>x.onclick=()=>view(x.dataset.view));$$("[data-open]").forEach(x=>x.onclick=()=>view(x.dataset.open));
$("#newProject").onclick=newProject;$("#newProject2").onclick=newProject;$("#start").onclick=newProject;$("#plan").onclick=makePlan;
$("#addFile").onclick=()=>{const n=prompt("File name, e.g. about.html");if(!n||state.files[n])return;state.files[n]="";state.currentFile=n;renderFiles();toast("File added")};
$("#saveCode").onclick=()=>{state.files[state.currentFile]=$("#code").value;toast("File saved in workspace")};
$("#chatForm").onsubmit=e=>{e.preventDefault();const q=$("#chatInput").value.trim();if(!q)return;addChat("You",q);$("#chatInput").value="";setTimeout(()=>answer(q),220)};
$("#rename").onclick=()=>{if(!state.active){toast("Create a project first");return}const n=prompt("Project name",state.active.name);if(n){state.active.name=n;$("#projectName").textContent=n;save();toast("Project renamed")}};
$("#theme").onclick=()=>{document.body.classList.toggle("light");localStorage.setItem("cmbai_theme",document.body.classList.contains("light")?"light":"dark")};
if(localStorage.getItem("cmbai_theme")==="light")document.body.classList.add("light");
if(state.projects.length)openProject(state.projects[0]);renderFiles();renderProjects();$("#projectCount").textContent=state.projects.length;
function buildPreview(){
  const html=state.files["index.html"]||"";
  const css=state.files["style.css"]||"";
  const script=state.files["script.js"]||"";
  const doc=html.includes("<html")?html:"<!doctype html><html><head></head><body>"+html+"</body></html>";
  const withCss=doc.replace("</head>", "<style>"+css.replace(/<\\/style/gi,"<\\\\/style")+"<\\/style></head>");
  const withJs=withCss.replace("</body>", "<script>"+script.replace(/<\\/script/gi,"<\\\\/script")+"<\\/script></body>");
  const frame=$("#previewFrame");
  frame.srcdoc=withJs;
  $("#previewModal").classList.remove("hidden");
}
$("#preview").onclick=()=>{state.files[state.currentFile]=$("#code").value;buildPreview()};
$("#refreshPreview").onclick=buildPreview;
$("#closePreview").onclick=()=>$("#previewModal").classList.add("hidden");
$("#previewModal").addEventListener("click",e=>{if(e.target.id==="previewModal")$("#previewModal").classList.add("hidden")});
