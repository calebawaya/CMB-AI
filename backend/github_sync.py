"""Secure GitHub sync extension for the CMB AI Flask backend.

The browser sends project files to this server endpoint. The GitHub token stays
server-side in Render and is never returned to the browser.
"""

from flask import jsonify, request
import base64
import hashlib
import json
import os
import urllib.error
import urllib.parse
import urllib.request


MAX_FILES = 80
MAX_FILE_BYTES = 300_000
BLOCKED_PREFIXES = (".git/", ".github/", "backend/", "instance/")
BLOCKED_FILES = {"render.yaml", "gunicorn.conf.py"}


def _github_request(url, token, method="GET", payload=None):
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "User-Agent": "CMB-AI",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    body = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=20) as response:
        raw = response.read().decode("utf-8")
        return json.loads(raw) if raw else {}


def _safe_path(path):
    normalized = str(path or "").replace("\\", "/").lstrip("/")
    parts = [part for part in normalized.split("/") if part]
    if not normalized or any(part in {".", ".."} for part in parts):
        return None
    if normalized.startswith(BLOCKED_PREFIXES) or normalized in BLOCKED_FILES:
        return None
    if any(part.startswith(".") for part in parts):
        return None
    return "/".join(parts)


def register_github_sync(app):
    @app.get("/api/github/sync/status")
    def github_sync_status():
        configured = bool(os.getenv("GITHUB_TOKEN"))
        repo = os.getenv("CMB_GITHUB_REPO", "calebawaya/CMB-AI")
        branch = os.getenv("CMB_GITHUB_BRANCH", "main")
        return jsonify({
            "ok": True,
            "configured": configured,
            "repo": repo,
            "branch": branch,
            "token_exposed": False,
        })

    @app.post("/api/github/sync/verify")
    def github_sync_verify():
        """Verify whether a known commit is still the current remote branch head.

        The browser may send a public commit SHA, but the GitHub credential remains
        server-side. This endpoint never returns the token or any credential data.
        """
        data = request.get_json(silent=True) or {}
        token = os.getenv("GITHUB_TOKEN")
        allowed_repo = os.getenv("CMB_GITHUB_REPO", "calebawaya/CMB-AI")
        allowed_branch = os.getenv("CMB_GITHUB_BRANCH", "main")
        repo = str(data.get("repo", allowed_repo)).strip()
        branch = str(data.get("branch", allowed_branch)).strip() or allowed_branch
        commit = str(data.get("commit", "")).strip()

        if not token:
            return jsonify({"ok": False, "error": "GITHUB_TOKEN is not configured on the server"}), 503
        if repo != allowed_repo:
            return jsonify({"ok": False, "error": "Repository is not allowed for CMB AI sync"}), 403
        if branch != allowed_branch:
            return jsonify({"ok": False, "error": "Branch is not allowed for CMB AI sync"}), 403
        if not commit or len(commit) not in {40, 64} or any(ch not in "0123456789abcdefABCDEF" for ch in commit):
            return jsonify({"ok": False, "error": "A valid commit SHA is required"}), 400

        api_root = f"https://api.github.com/repos/{repo}"
        try:
            ref = _github_request(
                f"{api_root}/git/ref/heads/{urllib.parse.quote(branch, safe='')}", token
            )
            head_sha = ref["object"]["sha"]
            matches = head_sha.lower() == commit.lower()
            return jsonify({
                "ok": True,
                "repo": repo,
                "branch": branch,
                "commit": commit,
                "head_commit": head_sha,
                "matches_head": matches,
                "status": "verified" if matches else "branch_ahead",
                "token_exposed": False,
            })
        except urllib.error.HTTPError as exc:
            try:
                detail = json.loads(exc.read().decode("utf-8")).get("message", "GitHub request failed")
            except Exception:
                detail = "GitHub request failed"
            print(f"GitHub sync verify HTTP error: {exc.code}: {detail}")
            return jsonify({"ok": False, "error": "GitHub verification failed", "detail": detail}), 502
        except Exception as exc:
            print(f"GitHub sync verify error: {type(exc).__name__}: {exc}")
            return jsonify({"ok": False, "error": "GitHub verification failed"}), 502

    @app.post("/api/github/sync")
    def github_sync():
        data = request.get_json(silent=True) or {}
        token = os.getenv("GITHUB_TOKEN")
        allowed_repo = os.getenv("CMB_GITHUB_REPO", "calebawaya/CMB-AI")
        allowed_branch = os.getenv("CMB_GITHUB_BRANCH", "main")
        repo = str(data.get("repo", allowed_repo)).strip()
        branch = str(data.get("branch", allowed_branch)).strip() or allowed_branch
        message = str(data.get("message", "chore: sync workspace from CMB AI")).strip()
        files = data.get("files") or {}

        if not token:
            return jsonify({"ok": False, "error": "GITHUB_TOKEN is not configured on the server"}), 503
        if repo != allowed_repo:
            return jsonify({"ok": False, "error": "Repository is not allowed for CMB AI sync"}), 403
        if branch != allowed_branch:
            return jsonify({"ok": False, "error": "Branch is not allowed for CMB AI sync"}), 403
        if not isinstance(files, dict) or not files:
            return jsonify({"ok": False, "error": "At least one workspace file is required"}), 400
        if len(files) > MAX_FILES:
            return jsonify({"ok": False, "error": f"A maximum of {MAX_FILES} files can be synced at once"}), 400
        if len(message) > 140:
            message = message[:140]

        safe_files = {}
        for raw_path, raw_content in files.items():
            path = _safe_path(raw_path)
            if not path:
                return jsonify({"ok": False, "error": f"Unsafe or protected file path: {raw_path}"}), 400
            content = str(raw_content if raw_content is not None else "")
            if len(content.encode("utf-8")) > MAX_FILE_BYTES:
                return jsonify({"ok": False, "error": f"File is too large to sync: {path}"}), 400
            safe_files[path] = content

        api_root = f"https://api.github.com/repos/{repo}"
        try:
            ref = _github_request(
                f"{api_root}/git/ref/heads/{urllib.parse.quote(branch, safe='')}", token
            )
            head_sha = ref["object"]["sha"]
            head = _github_request(f"{api_root}/git/commits/{head_sha}", token)
            base_tree = head["tree"]["sha"]

            tree_entries = []
            changed_files = []
            current_tree = _github_request(f"{api_root}/git/trees/{base_tree}?recursive=1", token)
            current_blobs = {item.get("path"): item.get("sha") for item in current_tree.get("tree", []) if item.get("type") == "blob"}
            for path, content in safe_files.items():
                raw = content.encode("utf-8")
                blob_sha = hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw).hexdigest()
                if current_blobs.get(path) == blob_sha:
                    continue
                blob = _github_request(
                    f"{api_root}/git/blobs",
                    token,
                    method="POST",
                    payload={
                        "content": base64.b64encode(raw).decode("ascii"),
                        "encoding": "base64",
                    },
                )
                tree_entries.append({"path": path, "mode": "100644", "type": "blob", "sha": blob["sha"]})
                changed_files.append(path)

            if not changed_files:
                return jsonify({
                    "ok": True, "noop": True, "repo": repo, "branch": branch,
                    "commit": head_sha, "files": [], "count": 0, "token_exposed": False,
                    "message": "Workspace already matches the GitHub branch",
                })

            tree = _github_request(
                f"{api_root}/git/trees",
                token,
                method="POST",
                payload={"base_tree": base_tree, "tree": tree_entries},
            )
            commit = _github_request(
                f"{api_root}/git/commits",
                token,
                method="POST",
                payload={"message": message, "tree": tree["sha"], "parents": [head_sha]},
            )
            try:
                _github_request(
                    f"{api_root}/git/refs/heads/{urllib.parse.quote(branch, safe='')}",
                    token,
                    method="PATCH",
                    payload={"sha": commit["sha"], "force": False},
                )
            except urllib.error.HTTPError as exc:
                # The branch may have moved after we read head_sha. Never force-push
                # or overwrite a newer commit; report a safe conflict instead.
                try:
                    latest_ref = _github_request(
                        f"{api_root}/git/ref/heads/{urllib.parse.quote(branch, safe='')}",
                        token,
                    )
                    latest_sha = latest_ref.get("object", {}).get("sha")
                except Exception:
                    latest_sha = None
                if latest_sha and latest_sha != head_sha:
                    print(f"GitHub sync conflict: branch moved from {head_sha} to {latest_sha}")
                    return jsonify({
                        "ok": False,
                        "conflict": True,
                        "error": "GitHub branch changed during sync",
                        "message": "The main branch changed while syncing. No branch update was forced.",
                        "current_commit": latest_sha,
                    }), 409
                raise

            return jsonify({
                "ok": True,
                "repo": repo,
                "branch": branch,
                "commit": commit["sha"],
                "files": sorted(changed_files),
                "count": len(changed_files),
                "token_exposed": False,
            })
        except urllib.error.HTTPError as exc:
            try:
                detail = json.loads(exc.read().decode("utf-8")).get("message", "GitHub request failed")
            except Exception:
                detail = "GitHub request failed"
            print(f"GitHub sync HTTP error: {exc.code}: {detail}")
            return jsonify({"ok": False, "error": "GitHub sync failed", "detail": detail}), 502
        except Exception as exc:
            print(f"GitHub sync error: {type(exc).__name__}: {exc}")
            return jsonify({"ok": False, "error": "GitHub sync failed"}), 502

    return app
