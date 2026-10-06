from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import sqlite3
from pathlib import Path

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

BASE_DIR = Path(__file__).resolve().parent
DB_FILE = BASE_DIR / "cmb_ai.db"
SCHEMA_FILE = BASE_DIR / "schema.sql"
AI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.6-luna")

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None


def db():
    connection = sqlite3.connect(DB_FILE)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db():
    with db() as connection:
        schema = SCHEMA_FILE.read_text(encoding="utf-8") if SCHEMA_FILE.exists() else ""
        if schema:
            connection.executescript(schema)


def row_dict(row):
    return dict(row) if row else None


def project_payload(connection, project_id):
    project = connection.execute(
        "SELECT * FROM projects WHERE id = ?", (project_id,)
    ).fetchone()
    if not project:
        return None
    files = connection.execute(
        "SELECT path, content, language, updated_at FROM project_files WHERE project_id = ? ORDER BY path",
        (project_id,),
    ).fetchall()
    tasks = connection.execute(
        "SELECT id, title, completed, position, updated_at FROM project_tasks WHERE project_id = ? ORDER BY position, id",
        (project_id,),
    ).fetchall()
    return {
        **row_dict(project),
        "files": {item["path"]: item["content"] for item in files},
        "file_meta": [row_dict(item) for item in files],
        "tasks": [row_dict(item) for item in tasks],
    }


def language_for(path):
    ext = Path(path).suffix.lower()
    return {
        ".html": "html", ".css": "css", ".js": "javascript", ".py": "python",
        ".json": "json", ".md": "markdown", ".sql": "sql"
    }.get(ext, "text")


def log_event(connection, project_id, event_type, message):
    connection.execute(
        "INSERT INTO workspace_events(project_id, event_type, message) VALUES (?, ?, ?)",
        (project_id, event_type, message),
    )


@app.get("/")
def root():
    return jsonify({
        "ok": True,
        "service": "CMB-AI backend",
        "status": "online",
        "health": "/api/health",
    })


@app.get("/api/health")
def health():
    with db() as connection:
        project_count = connection.execute("SELECT COUNT(*) FROM projects").fetchone()[0]
    return jsonify({
        "ok": True,
        "service": "CMB-AI backend",
        "status": "online",
        "database": "sqlite",
        "database_file": DB_FILE.name,
        "project_count": project_count,
        "ai_package": OpenAI is not None,
        "ai_configured": bool(os.getenv("OPENAI_API_KEY")),
        "ai_model": AI_MODEL,
        "github_configured": bool(os.getenv("GITHUB_TOKEN")),
    })


@app.get("/api/system")
def system_status():
    with db() as connection:
        tables = connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        ).fetchall()
        counts = {}
        for table in tables:
            name = table["name"]
            counts[name] = connection.execute(f'SELECT COUNT(*) FROM "{name}"').fetchone()[0]
    return jsonify({
        "ok": True,
        "service": "CMB-AI backend",
        "status": "online",
        "python": True,
        "flask": True,
        "sqlite": DB_FILE.exists(),
        "openai_package": OpenAI is not None,
        "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
        "openai_model": AI_MODEL,
        "github_configured": bool(os.getenv("GITHUB_TOKEN")),
        "database": DB_FILE.name,
        "tables": counts,
    })


@app.get("/api/ai/status")
def ai_status():
    package_ready = OpenAI is not None
    key_configured = bool(os.getenv("OPENAI_API_KEY"))
    ready = package_ready and key_configured
    return jsonify({
        "ok": ready,
        "service": "CMB-AI AI backend",
        "status": "ready" if ready else "not_ready",
        "openai_package": package_ready,
        "api_key_configured": key_configured,
        "model": AI_MODEL,
    })


@app.get("/api/db/status")
def database_status():
    with db() as connection:
        tables = connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        ).fetchall()
        counts = {}
        for table in tables:
            name = table["name"]
            counts[name] = connection.execute(f'SELECT COUNT(*) FROM "{name}"').fetchone()[0]
    return jsonify({"ok": True, "database": DB_FILE.name, "tables": counts})


@app.get("/api/projects")
def get_projects():
    with db() as connection:
        rows = connection.execute(
            "SELECT * FROM projects ORDER BY updated_at DESC, id DESC"
        ).fetchall()
        projects = [project_payload(connection, row["id"]) for row in rows]
    return jsonify({"ok": True, "projects": projects})


@app.get("/api/project/<int:project_id>")
def get_project(project_id):
    with db() as connection:
        project = project_payload(connection, project_id)
    if not project:
        return jsonify({"ok": False, "error": "Project not found"}), 404
    return jsonify({"ok": True, "project": project})


@app.post("/api/project")
def create_project():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "Untitled Project")).strip() or "Untitled Project"
    description = str(data.get("description", data.get("idea", ""))).strip()
    files = data.get("files") or {
        "index.html": "<!doctype html>\n<html lang=\"en\">\n<head><meta charset=\"UTF-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"><title>CMB AI Project</title><link rel=\"stylesheet\" href=\"style.css\"></head>\n<body><h1>Hello from CMB AI</h1><script src=\"script.js\"></script></body>\n</html>",
        "style.css": "body{font-family:system-ui;margin:0;padding:40px}",
        "script.js": "console.log('CMB AI project ready');",
    }
    tasks = data.get("tasks") or []
    with db() as connection:
        cursor = connection.execute(
            "INSERT INTO projects(name, description) VALUES (?, ?)", (name, description)
        )
        project_id = cursor.lastrowid
        for path, content in files.items():
            connection.execute(
                "INSERT INTO project_files(project_id, path, content, language) VALUES (?, ?, ?, ?)",
                (project_id, str(path), str(content), language_for(str(path))),
            )
        for position, task in enumerate(tasks):
            title = str(task.get("title", task) if isinstance(task, dict) else task).strip()
            if title:
                connection.execute(
                    "INSERT INTO project_tasks(project_id, title, position) VALUES (?, ?, ?)",
                    (project_id, title, position),
                )
        log_event(connection, project_id, "project.created", f"Project '{name}' created")
        project = project_payload(connection, project_id)
    return jsonify({"ok": True, "project": project}), 201


@app.patch("/api/project/<int:project_id>")
@app.put("/api/project/<int:project_id>")
def update_project(project_id):
    data = request.get_json(silent=True) or {}
    with db() as connection:
        existing = connection.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not existing:
            return jsonify({"ok": False, "error": "Project not found"}), 404
        fields = []
        values = []
        for key in ("name", "description", "status", "progress"):
            if key in data:
                value = data[key]
                if key == "name":
                    value = str(value).strip() or existing["name"]
                if key == "progress":
                    value = max(0, min(100, int(value)))
                fields.append(f"{key} = ?")
                values.append(value)
        if fields:
            fields.append("updated_at = CURRENT_TIMESTAMP")
            connection.execute(
                f"UPDATE projects SET {', '.join(fields)} WHERE id = ?",
                (*values, project_id),
            )
        log_event(connection, project_id, "project.updated", "Project details updated")
        project = project_payload(connection, project_id)
    return jsonify({"ok": True, "project": project})


@app.delete("/api/project/<int:project_id>")
def delete_project(project_id):
    with db() as connection:
        existing = connection.execute("SELECT id FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not existing:
            return jsonify({"ok": False, "error": "Project not found"}), 404
        connection.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    return jsonify({"ok": True, "deleted": project_id})


@app.put("/api/project/<int:project_id>/file")
def save_project_file(project_id):
    data = request.get_json(silent=True) or {}
    path = str(data.get("path", "")).strip()
    if not path or ".." in Path(path).parts:
        return jsonify({"ok": False, "error": "A safe file path is required"}), 400
    content = str(data.get("content", ""))
    with db() as connection:
        if not connection.execute("SELECT id FROM projects WHERE id = ?", (project_id,)).fetchone():
            return jsonify({"ok": False, "error": "Project not found"}), 404
        connection.execute(
            "INSERT INTO project_files(project_id, path, content, language) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(project_id, path) DO UPDATE SET content=excluded.content, language=excluded.language, updated_at=CURRENT_TIMESTAMP",
            (project_id, path, content, language_for(path)),
        )
        connection.execute("UPDATE projects SET updated_at=CURRENT_TIMESTAMP WHERE id=?", (project_id,))
        log_event(connection, project_id, "file.saved", f"Saved {path}")
    return jsonify({"ok": True, "path": path, "language": language_for(path)})


@app.delete("/api/project/<int:project_id>/file")
def delete_project_file(project_id):
    path = str(request.args.get("path", "")).strip()
    with db() as connection:
        result = connection.execute(
            "DELETE FROM project_files WHERE project_id = ? AND path = ?", (project_id, path)
        )
        if result.rowcount == 0:
            return jsonify({"ok": False, "error": "File not found"}), 404
        connection.execute("UPDATE projects SET updated_at=CURRENT_TIMESTAMP WHERE id=?", (project_id,))
        log_event(connection, project_id, "file.deleted", f"Deleted {path}")
    return jsonify({"ok": True, "deleted": path})


@app.post("/api/project/<int:project_id>/task")
def create_task(project_id):
    data = request.get_json(silent=True) or {}
    title = str(data.get("title", "")).strip()
    if not title:
        return jsonify({"ok": False, "error": "Task title is required"}), 400
    with db() as connection:
        if not connection.execute("SELECT id FROM projects WHERE id=?", (project_id,)).fetchone():
            return jsonify({"ok": False, "error": "Project not found"}), 404
        position = connection.execute("SELECT COALESCE(MAX(position), -1)+1 FROM project_tasks WHERE project_id=?", (project_id,)).fetchone()[0]
        cursor = connection.execute(
            "INSERT INTO project_tasks(project_id,title,position) VALUES(?,?,?)",
            (project_id, title, position),
        )
        task = connection.execute("SELECT * FROM project_tasks WHERE id=?", (cursor.lastrowid,)).fetchone()
    return jsonify({"ok": True, "task": row_dict(task)}), 201


@app.patch("/api/project/<int:project_id>/task/<int:task_id>")
def update_task(project_id, task_id):
    data = request.get_json(silent=True) or {}
    with db() as connection:
        task = connection.execute(
            "SELECT * FROM project_tasks WHERE id=? AND project_id=?", (task_id, project_id)
        ).fetchone()
        if not task:
            return jsonify({"ok": False, "error": "Task not found"}), 404
        if "title" in data:
            connection.execute("UPDATE project_tasks SET title=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", (str(data["title"]).strip(), task_id))
        if "completed" in data:
            connection.execute("UPDATE project_tasks SET completed=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", (1 if data["completed"] else 0, task_id))
        task = connection.execute("SELECT * FROM project_tasks WHERE id=?", (task_id,)).fetchone()
    return jsonify({"ok": True, "task": row_dict(task)})


@app.post("/api/project/<int:project_id>/event")
def create_event(project_id):
    data = request.get_json(silent=True) or {}
    event_type = str(data.get("type", "workspace.event")).strip()
    message = str(data.get("message", "Workspace event")).strip()
    with db() as connection:
        if not connection.execute("SELECT id FROM projects WHERE id=?", (project_id,)).fetchone():
            return jsonify({"ok": False, "error": "Project not found"}), 404
        log_event(connection, project_id, event_type, message)
    return jsonify({"ok": True})


@app.get("/api/project/<int:project_id>/events")
def get_events(project_id):
    limit = max(1, min(100, int(request.args.get("limit", 50))))
    with db() as connection:
        events = connection.execute(
            "SELECT * FROM workspace_events WHERE project_id=? ORDER BY id DESC LIMIT ?",
            (project_id, limit),
        ).fetchall()
    return jsonify({"ok": True, "events": [row_dict(x) for x in reversed(events)]})


@app.get("/api/project/<int:project_id>/chat")
def get_chat(project_id):
    with db() as connection:
        messages = connection.execute(
            "SELECT * FROM chat_messages WHERE project_id=? ORDER BY id ASC", (project_id,)
        ).fetchall()
    return jsonify({"ok": True, "messages": [row_dict(x) for x in messages]})


@app.post("/api/project/<int:project_id>/chat")
def save_chat(project_id):
    data = request.get_json(silent=True) or {}
    role = str(data.get("role", "user"))
    message = str(data.get("message", "")).strip()
    if role not in {"user", "assistant", "system"} or not message:
        return jsonify({"ok": False, "error": "Valid role and message are required"}), 400
    with db() as connection:
        if not connection.execute("SELECT id FROM projects WHERE id=?", (project_id,)).fetchone():
            return jsonify({"ok": False, "error": "Project not found"}), 404
        cursor = connection.execute(
            "INSERT INTO chat_messages(project_id,role,message) VALUES(?,?,?)",
            (project_id, role, message),
        )
        row = connection.execute("SELECT * FROM chat_messages WHERE id=?", (cursor.lastrowid,)).fetchone()
    return jsonify({"ok": True, "message": row_dict(row)}), 201


@app.post("/api/ai")
def ai_message():
    data = request.get_json(silent=True) or {}
    prompt = str(data.get("prompt", "")).strip()
    project_id = data.get("project_id")

    if not prompt:
        return jsonify({"ok": False, "error": "Prompt is required"}), 400
    if len(prompt) > 12000:
        return jsonify({"ok": False, "error": "Prompt is too long (maximum 12000 characters)"}), 400
    if OpenAI is None:
        return jsonify({"ok": False, "error": "OpenAI package is not installed"}), 503
    if not os.getenv("OPENAI_API_KEY"):
        return jsonify({"ok": False, "error": "OPENAI_API_KEY is not configured on the server"}), 503

    project = data.get("project", {}) or {}
    if project_id is not None:
        try:
            project_id = int(project_id)
        except (TypeError, ValueError):
            return jsonify({"ok": False, "error": "project_id must be an integer"}), 400
        with db() as connection:
            stored_project = project_payload(connection, project_id)
        if not stored_project:
            return jsonify({"ok": False, "error": "Project not found"}), 404
        project = stored_project

    project_name = str(project.get("name", "CMB-AI project"))
    project_files = project.get("files", {}) or {}

    try:
        client = OpenAI()
        file_context = "\n".join(
            f"--- {name} ---\n{str(content)[:10000]}"
            for name, content in list(project_files.items())[:30]
        )
        instructions = """You are CMB AI, a friendly coding assistant inside a project workspace.
Help the user build real web projects step by step. Be beginner-friendly, practical, and concise.
Use the supplied project context when relevant. When suggesting code, identify the file.
Do not claim you changed files unless the user used an apply action."""
        response = client.responses.create(
            model=AI_MODEL,
            instructions=instructions,
            input=f"Project name: {project_name}\n\nCurrent project files:\n{file_context}\n\nUser request:\n{prompt}",
        )
        answer = str(getattr(response, "output_text", "") or "").strip()
        if not answer:
            return jsonify({"ok": False, "error": "AI returned an empty response"}), 502

        if project_id is not None:
            with db() as connection:
                connection.execute(
                    "INSERT INTO chat_messages(project_id,role,message) VALUES(?,?,?)",
                    (project_id, "user", prompt),
                )
                connection.execute(
                    "INSERT INTO chat_messages(project_id,role,message) VALUES(?,?,?)",
                    (project_id, "assistant", answer),
                )
                log_event(connection, project_id, "ai.response", "CMB AI generated a response")

        return jsonify({
            "ok": True,
            "answer": answer,
            "model": AI_MODEL,
            "project_id": project_id,
        })
    except Exception as exc:
        print(f"CMB AI error: {type(exc).__name__}: {exc}")
        if project_id is not None:
            with db() as connection:
                log_event(connection, project_id, "ai.error", "CMB AI request failed")
        return jsonify({"ok": False, "error": "AI request failed"}), 502


@app.post("/api/preflight")
def preflight():
    data = request.get_json(silent=True) or {}
    files = data.get("files", {}) or {}
    if not isinstance(files, dict):
        return jsonify({"ok": False, "error": "files must be an object"}), 400

    issues = []
    warnings = []
    names = {str(k) for k in files.keys()}
    for required in ("index.html",):
        if required not in names:
            issues.append({"severity": "error", "code": "missing_file", "file": required, "message": f"Required file {required} is missing."})

    html = str(files.get("index.html", ""))
    css = str(files.get("style.css", ""))
    js = str(files.get("script.js", ""))

    if html and "<html" not in html.lower():
        warnings.append({"severity": "warning", "code": "html_root", "file": "index.html", "message": "index.html does not appear to contain an <html> root element."})
    if html and "<title" not in html.lower():
        warnings.append({"severity": "warning", "code": "missing_title", "file": "index.html", "message": "index.html has no <title> element."})
    if html and "<script" in html.lower() and js and "script.js" not in html:
        warnings.append({"severity": "warning", "code": "script_reference", "file": "index.html", "message": "index.html contains a script tag, but script.js was not detected in its source."})
    if html and "<link" in html.lower() and css and "style.css" not in html:
        warnings.append({"severity": "warning", "code": "css_reference", "file": "index.html", "message": "index.html contains stylesheet links, but style.css was not detected in its source."})

    brace_balance = js.count("{") - js.count("}")
    if js and brace_balance != 0:
        issues.append({"severity": "error", "code": "js_braces", "file": "script.js", "message": "JavaScript braces appear unbalanced."})

    paren_balance = js.count("(") - js.count(")")
    if js and paren_balance != 0:
        issues.append({"severity": "error", "code": "js_parentheses", "file": "script.js", "message": "JavaScript parentheses appear unbalanced."})

    status = "fail" if issues else ("warn" if warnings else "pass")
    return jsonify({
        "ok": True,
        "status": status,
        "ready": not issues,
        "checked_files": sorted(names),
        "issues": issues,
        "warnings": warnings,
        "summary": {"errors": len(issues), "warnings": len(warnings), "files": len(names)}
    })


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
Return JSON only with exactly these keys: index.html, style.css, script.js.
For each key, return null if it should not change, otherwise return the complete replacement file content.
Do not use markdown fences.
Current files:
HTML:\n{str(files.get('index.html',''))[:14000]}
CSS:\n{str(files.get('style.css',''))[:14000]}
JavaScript:\n{str(files.get('script.js',''))[:14000]}"""
    try:
        client = OpenAI()
        response = client.responses.create(model=AI_MODEL, input=prompt)
        return jsonify({"ok": True, "files": json.loads(response.output_text.strip())})
    except Exception:
        return jsonify({"ok": False, "error": "Could not generate a safe code change"}), 502


@app.get("/api/github/deployment-status")
def github_deployment_status():
    repo = str(request.args.get("repo", "calebawaya/CMB-AI")).strip()
    branch = str(request.args.get("branch", "main")).strip() or "main"
    if not repo or "/" not in repo:
        return jsonify({"ok": False, "error": "Repository must look like owner/name"}), 400
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        return jsonify({"ok": False, "error": "GITHUB_TOKEN is not configured on the server"}), 503

    import urllib.request
    import urllib.parse

    api_headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "User-Agent": "CMB-AI",
    }
    runs_url = (
        f"https://api.github.com/repos/{repo}/actions/runs"
        f"?branch={urllib.parse.quote(branch)}&per_page=20"
    )

    try:
        req = urllib.request.Request(runs_url, headers=api_headers)
        with urllib.request.urlopen(req, timeout=15) as response:
            payload = json.loads(response.read().decode("utf-8"))

        runs = payload.get("workflow_runs", [])
        # Only monitor the CMB AI Pages workflow. This prevents an unrelated
        # Actions workflow from being reported as a Pages deployment failure.
        pages_runs = [
            run for run in runs
            if str(run.get("path", "")).endswith(".github/workflows/pages.yml")
            or run.get("name") == "Deploy CMB AI to GitHub Pages"
        ]
        latest = pages_runs[0] if pages_runs else None

        if not latest:
            return jsonify({
                "ok": True, "repo": repo, "branch": branch,
                "status": "not_started", "conclusion": None, "run": None
            })

        status = latest.get("status") or "unknown"
        conclusion = latest.get("conclusion")
        if status == "completed":
            state = "success" if conclusion == "success" else "failed"
        elif status in {"queued", "in_progress", "waiting", "requested", "pending"}:
            state = "running"
        else:
            state = "unknown"

        run_info = {
            "id": latest.get("id"),
            "name": latest.get("name"),
            "event": latest.get("event"),
            "created_at": latest.get("created_at"),
            "updated_at": latest.get("updated_at"),
            "html_url": latest.get("html_url"),
        }

        # When a deployment fails, inspect its jobs so the dashboard can show
        # the actual failed job/step instead of a generic FAILED message.
        if state == "failed" and latest.get("id"):
            jobs_url = f"https://api.github.com/repos/{repo}/actions/runs/{latest['id']}/jobs?per_page=20"
            jobs_req = urllib.request.Request(jobs_url, headers=api_headers)
            with urllib.request.urlopen(jobs_req, timeout=15) as jobs_response:
                jobs_payload = json.loads(jobs_response.read().decode("utf-8"))

            failed_jobs = []
            for job in jobs_payload.get("jobs", []):
                if job.get("conclusion") not in {"failure", "cancelled", "timed_out", "action_required"}:
                    continue
                failed_steps = [
                    {
                        "name": step.get("name"),
                        "status": step.get("status"),
                        "conclusion": step.get("conclusion"),
                        "number": step.get("number"),
                    }
                    for step in (job.get("steps") or [])
                    if step.get("conclusion") in {"failure", "cancelled", "timed_out", "action_required"}
                ]
                failed_jobs.append({
                    "name": job.get("name"),
                    "conclusion": job.get("conclusion"),
                    "html_url": job.get("html_url"),
                    "failed_steps": failed_steps,
                })

            run_info["failed_jobs"] = failed_jobs
            if failed_jobs:
                run_info["failure_summary"] = (
                    f"{len(failed_jobs)} failed job(s): " +
                    ", ".join(job["name"] for job in failed_jobs if job.get("name"))
                )

        return jsonify({
            "ok": True,
            "repo": repo,
            "branch": branch,
            "status": state,
            "workflow_status": status,
            "conclusion": conclusion,
            "run": run_info,
        })
    except Exception as exc:
        print(f"GitHub deployment status error: {type(exc).__name__}: {exc}")
        return jsonify({"ok": False, "error": "Could not read GitHub Actions deployment status"}), 502


@app.get("/api/github/tree")
def github_tree():
    repo = str(request.args.get("repo", "")).strip()
    branch = str(request.args.get("branch", "main")).strip() or "main"
    if not repo or "/" not in repo:
        return jsonify({"ok": False, "error": "Repository must look like owner/name"}), 400
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        return jsonify({"ok": False, "error": "GITHUB_TOKEN is not configured on the server"}), 503
    import urllib.request
    url = f"https://api.github.com/repos/{repo}/git/trees/{branch}?recursive=1"
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json", "Authorization": f"Bearer {token}", "User-Agent": "CMB-AI"})
        with urllib.request.urlopen(req, timeout=15) as response:
            payload = json.loads(response.read().decode("utf-8"))
        files = [x.get("path") for x in payload.get("tree", []) if x.get("type") == "blob"]
        return jsonify({"ok": True, "repo": repo, "branch": branch, "files": files})
    except Exception as exc:
        print(f"GitHub tree error: {exc}")
        return jsonify({"ok": False, "error": "Could not read the GitHub repository"}), 502


init_db()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
