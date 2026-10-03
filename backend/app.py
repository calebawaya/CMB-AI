from flask import Flask, jsonify, request
import json
from pathlib import Path
from flask_cors import CORS

app = Flask(__name__)
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
