const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];

const state={
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
  const names={dashboard:"Build something great.",workspace:"Your project workspace.",projects:"Your projects.",github:"Connect and deploy.",settings:"Make CMB AI yours."};
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
