"""Gunicorn configuration for the CMB AI backend."""

preload_app = True


def on_starting(server):
    try:
        from github_sync import register_github_sync
        register_github_sync(server.app.wsgi())
        server.log.info("CMB AI secure GitHub sync extension loaded")
    except Exception as exc:
        server.log.error("CMB AI GitHub sync extension failed to load: %s", exc)
        raise
