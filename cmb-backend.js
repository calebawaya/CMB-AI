/* CMB AI Frontend ↔ Backend ↔ SQLite bridge */
(function(){
  const API = window.CMB_API_BASE || "http://127.0.0.1:5000/api";
  const client = {
    async request(path, options={}){
      const response = await fetch(API + path, {
        headers: {"Content-Type":"application/json", ...(options.headers||{})},
        ...options
      });
      const data = await response.json().catch(()=>({ok:false,error:"Invalid server response"}));
      if(!response.ok || data.ok === false) throw new Error(data.error || `Request failed (${response.status})`);
      return data;
    },
    health(){ return this.request("/health"); },
    databaseStatus(){ return this.request("/db/status"); },
    projects(){ return this.request("/projects"); },
    project(id){ return this.request(`/project/${encodeURIComponent(id)}`); },
    createProject(project){ return this.request("/project", {method:"POST",body:JSON.stringify(project)}); },
    updateProject(id, data){ return this.request(`/project/${encodeURIComponent(id)}`, {method:"PATCH",body:JSON.stringify(data)}); },
    deleteProject(id){ return this.request(`/project/${encodeURIComponent(id)}`, {method:"DELETE"}); },
    saveFile(id, path, content){ return this.request(`/project/${encodeURIComponent(id)}/file`, {method:"PUT",body:JSON.stringify({path,content})}); },
    deleteFile(id, path){ return this.request(`/project/${encodeURIComponent(id)}/file?path=${encodeURIComponent(path)}`, {method:"DELETE"}); },
    createTask(id, title){ return this.request(`/project/${encodeURIComponent(id)}/task`, {method:"POST",body:JSON.stringify({title})}); },
    updateTask(projectId, taskId, data){ return this.request(`/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(taskId)}`, {method:"PATCH",body:JSON.stringify(data)}); },
    chat(id, role, message){ return this.request(`/project/${encodeURIComponent(id)}/chat`, {method:"POST",body:JSON.stringify({role,message})}); },
    events(id){ return this.request(`/project/${encodeURIComponent(id)}/events`); },
    event(id, type, message){ return this.request(`/project/${encodeURIComponent(id)}/event`, {method:"POST",body:JSON.stringify({type,message})}); }
  };

  window.CMBAIBackend = client;
  window.CMBAIBackendConnected = false;

  async function checkBackend(){
    try{
      const [health, database] = await Promise.all([client.health(), client.databaseStatus()]);
      window.CMBAIBackendConnected = true;
      window.CMBAIBackendInfo = {health, database};
      document.dispatchEvent(new CustomEvent("cmb:backend-status", {detail:{online:true,health,database}}));
      return true;
    }catch(error){
      window.CMBAIBackendConnected = false;
      document.dispatchEvent(new CustomEvent("cmb:backend-status", {detail:{online:false,error:String(error.message||error)}}));
      return false;
    }
  }

  async function ensureBackendProject(project){
    if(!project || !window.CMBAIBackendConnected) return null;
    if(project.backendId){
      try { return (await client.project(project.backendId)).project; } catch(_) {}
    }
    const result = await client.createProject({
      name: project.name || "Untitled Project",
      description: project.idea || project.description || "",
      progress: Number(project.progress || 0),
      files: project.files || {},
      tasks: []
    });
    project.backendId = result.project.id;
    return result.project;
  }

  async function syncActiveProject(){
    const state = window.state;
    if(!state?.active?.id || !window.CMBAIBackendConnected) return;
    const project = state.active;
    try{
      const backendProject = await ensureBackendProject(project);
      if(!backendProject) return;
      const result = await client.updateProject(project.backendId, {
        name: project.name || "Untitled Project",
        description: project.idea || project.description || "",
        progress: Number(project.progress || 0)
      });
      for(const [path,content] of Object.entries(state.files||{})){
        await client.saveFile(project.backendId, path, String(content));
      }
      await client.event(project.backendId, "workspace.sync", "Frontend workspace synchronized with SQLite backend");
      document.dispatchEvent(new CustomEvent("cmb:backend-sync", {detail:{ok:true,projectId:result.project.id}}));
    }catch(error){
      document.dispatchEvent(new CustomEvent("cmb:backend-sync", {detail:{ok:false,error:String(error.message||error)}}));
    }
  }

  async function createBackendProjectFromState(project){
    if(!project || !window.CMBAIBackendConnected) return null;
    try { return await ensureBackendProject(project); }
    catch(error){ console.warn("CMB AI backend project creation failed:", error); return null; }
  }

  window.CMBAISync = {checkBackend, syncActiveProject, createBackendProjectFromState, ensureBackendProject};
  document.addEventListener("DOMContentLoaded", ()=>{
    checkBackend();
    setTimeout(syncActiveProject, 1200);
  });
})();
