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
    if not prompt:
        return jsonify({"ok": False, "error": "Prompt is required"}), 400
    if OpenAI is None:
        return jsonify({"ok": False, "error": "OpenAI package is not installed"}), 503
    if not os.getenv("OPENAI_API_KEY"):
        return jsonify({"ok": False, "error": "OPENAI_API_KEY is not configured on the server"}), 503
    try:
        client = OpenAI()
        response = client.responses.create(
            model=os.getenv("OPENAI_MODEL", "gpt-6-luna"),
            input=prompt
        )
        return jsonify({"ok": True, "answer": response.output_text})
    except Exception as exc:
        return jsonify({"ok": False, "error": "AI request failed"}), 502
