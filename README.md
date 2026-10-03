# CMB-AI

CMB-AI is a browser-based website builder with a visual builder, code editor, assets, live preview, themes, project dashboard, and export tools.

## Python backend

The optional Python backend is in `backend/app.py`.

### Setup on Windows

```powershell
cd backend
python -m pip install -r requirements.txt
python app.py
```

The API will run at `http://127.0.0.1:5000`.

### Test

Open:

`http://127.0.0.1:5000/api/health`

This backend is intentionally small for the first step. More services such as project storage, authentication, databases, and AI endpoints can be added later.
