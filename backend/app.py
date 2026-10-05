from flask import Flask, jsonify, request
import json
from pathlib import Path
import os
from flask_cors import CORS

app = Flask(__name__)

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None
DATA_FILE = Path(__file__).with_name("projects.json")

def load_projects():
    if not DATA_FILE.exists():
        return []
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []

def save_projects(projects):
    DATA_FILE.write_text(json.dumps(projects, indent=2), encoding="utf-8")
CORS(app)

@app.get("/api/health")
def health():
    return jsonify({
        "ok": True,
        "service": "CMB-AI backend",
        "message": "Python backend is running"
    })

@app.get("/api/projects")
def get_projects():
    return jsonify({"ok": True, "projects": load_projects()})

@app.post("/api/project")
def create_project():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "Untitled Project")).strip() or "Untitled Project"
    projects = load_projects()
    project = {"id": len(projects) + 1, "name": name, "status": "created"}
    projects.append(project)
    save_projects(projects)
    return jsonify({"ok": True, "project": project})

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)

@app.put("/api/project/<int:project_id>")
def update_project(project_id):
    data = request.get_json(silent=True) or {}
    projects = load_projects()
    project = next((p for p in projects if p.get("id") == project_id), None)
    if not project:
        return jsonify({"ok": False, "error": "Project not found"}), 404
    if "name" in data:
        project["name"] = str(data["name"]).strip() or project["name"]
    if "status" in data:
        project["status"] = str(data["status"])
    save_projects(projects)
    return jsonify({"ok": True, "project": project})

@app.delete("/api/project/<int:project_id>")
def delete_project(project_id):
    projects = load_projects()
    remaining = [p for p in projects if p.get("id") != project_id]
    if len(remaining) == len(projects):
        return jsonify({"ok": False, "error": "Project not found"}), 404
    save_projects(remaining)
    return jsonify({"ok": True, "deleted": project_id})


@app.patch("/api/project/<int:project_id>")
def patch_project(project_id):
    data = request.get_json(silent=True) or {}
    projects = load_projects()
    project = next((p for p in projects if p.get("id") == project_id), None)
    if project is None:
        return jsonify({"ok": False, "error": "Project not found"}), 404
    if data.get("name"):
        project["name"] = str(data["name"]).strip()
    save_projects(projects)
    return jsonify({"ok": True, "project": project})


@app.post("/api/ai")
def ai_message():
    data = request.get_json(silent=True) or {}
    prompt = str(data.get("prompt", "")).strip()
    project = data.get("project", {}) or {}
    project_name = str(project.get("name", "CMB-AI project"))
    project_files = project.get("files", {}) or {}

    if not prompt:
        return jsonify({"ok": False, "error": "Prompt is required"}), 400
    if OpenAI is None:
        return jsonify({"ok": False, "error": "OpenAI package is not installed"}), 503
    if not os.getenv("OPENAI_API_KEY"):
        return jsonify({"ok": False, "error": "OPENAI_API_KEY is not configured on the server"}), 503

    try:
        client = OpenAI()
        file_context = "\n".join(
            f"--- {name} ---\n{str(content)[:10000]}"
            for name, content in project_files.items()
        )
        instructions = """You are CMB AI, a friendly coding assistant inside a project workspace.
Help the user build real web projects step by step.
Be beginner-friendly, practical, and concise.
Use the supplied project context when it is relevant.
When suggesting code, clearly identify the file it belongs in.
Do not claim you changed files unless the user actually used a build/apply action.
Prefer safe, maintainable HTML, CSS, and JavaScript.
If the user asks what to do next, give one clear next step plus the reason."""

        response = client.responses.create(
            model=os.getenv("OPENAI_MODEL", "gpt-5.6-luna"),
            instructions=instructions,
            input=f"""Project name: {project_name}

Current project files:
{file_context}

User request:
{prompt}"""
        )
        return jsonify({"ok": True, "answer": response.output_text})
    except Exception as exc:
        print(f"CMB AI error: {exc}")
        return jsonify({"ok": False, "error": "AI request failed"}), 502

@app.post("/api/ai/apply")
def apply_ai_change():
    data = request.get_json(silent=True) or {}
    request_text = str(data.get("request", "")).strip()
    files = data.get("files", {}) or {}
    if not request_text:
        return jsonify({"ok": False, "error": "Change request is required"}), 400
    if OpenAI is None or not os.getenv("OPENAI_API_KEY"):
        return jsonify({"ok": False, "error": "AI backend is not configured"}), 503
    prompt = f"""You are a code assistant for CMB-AI.
User request: {request_text}

Return JSON only with exactly these keys:
index.html, style.css, script.js
For each key, return either null if that file should not change, or the complete replacement file content.
Do not use markdown fences.
Current files:
HTML:
{str(files.get("index.html",""))[:14000]}
CSS:
{str(files.get("style.css",""))[:14000]}
JavaScript:
{str(files.get("script.js",""))[:14000]}
"""
    try:
        client = OpenAI()
        response = client.responses.create(model=os.getenv("OPENAI_MODEL", "gpt-5.6-luna"), input=prompt)
        raw = response.output_text.strip()
        result = json.loads(raw)
        return jsonify({"ok": True, "files": result})
    except Exception:
        return jsonify({"ok": False, "error": "Could not generate a safe code change"}), 502
