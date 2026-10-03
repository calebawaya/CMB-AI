from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.get("/api/health")
def health():
    return jsonify({
        "ok": True,
        "service": "CMB-AI backend",
        "message": "Python backend is running"
    })

@app.post("/api/project")
def create_project():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "Untitled Project")).strip() or "Untitled Project"
    return jsonify({
        "ok": True,
        "project": {
            "name": name,
            "status": "created"
        }
    })

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
