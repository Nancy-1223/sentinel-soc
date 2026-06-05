# Sentinel SOC Public Deployment Guide

This project deploys as two public services:

- Backend API on Render: `https://your-backend.onrender.com`
- Frontend dashboard on Vercel: `https://your-project.vercel.app`

Endpoint agents stay distributed. Each PC agent connects to the deployed backend using `SOC_BACKEND_URL`.

## GitHub Repository Structure

```text
sentinel-soc/
  render.yaml
  DEPLOYMENT.md
  .gitignore
  Backend/
    main.py
    start.py
    requirements.txt
    database.py
    auth.py
    detector.py
    models.py
    model.pkl
    .env.example
  frontend/
    package.json
    package-lock.json
    vite.config.js
    vercel.json
    .env.example
    src/
  agent/
    agent.py
    requirements.txt
    README.md
```

Do not commit local generated folders such as `.venv/`, `frontend/node_modules/`, `frontend/dist/`, `quarantine/`, or `Backend/soc_backend.db`.

## Git Commands

Run these from the project root:

```powershell
git init
git add .
git commit -m "Prepare Sentinel SOC for public deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sentinel-soc.git
git push -u origin main
```

For later changes:

```powershell
git add .
git commit -m "Update Sentinel SOC deployment config"
git push
```

## Render Backend Deployment

Recommended: use `render.yaml` from the repo root as a Render Blueprint.

Manual Render settings:

```text
Service Type: Web Service
Name: sentinel-soc-backend
Runtime: Python
Root Directory: Backend
Build Command: pip install -r requirements.txt
Start Command: python start.py
```

Environment variables:

```text
PYTHON_VERSION=3.11.9
DATABASE_URL=<Render PostgreSQL internal connection string>
SECRET_KEY=<generate a long random value>
ALLOWED_ORIGINS=https://your-project.vercel.app,http://localhost:5173,http://127.0.0.1:5173
```

Use a persistent hosted database for deployed accounts. The included `render.yaml` provisions Render PostgreSQL and injects `DATABASE_URL` automatically when deployed as a Blueprint.

After deployment, test:

```text
https://your-backend.onrender.com/health
```

Expected response:

```json
{"status":"online"}
```

## Vercel Frontend Deployment

Import the same GitHub repository into Vercel.

Vercel settings:

```text
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Environment variables:

```text
VITE_API_URL=https://your-backend.onrender.com
```

Vercel builds Vite environment variables into the frontend bundle, so redeploy the frontend after changing `VITE_API_URL`.

## Deployment Order

1. Push the project to GitHub.
2. Deploy the backend on Render.
3. Confirm `https://your-backend.onrender.com/health` works.
4. Deploy the frontend on Vercel with `VITE_API_URL=https://your-backend.onrender.com`.
5. Copy the final Vercel URL.
6. Update Render `ALLOWED_ORIGINS` to include the exact Vercel URL.
7. Redeploy the Render backend.
8. Open `https://your-project.vercel.app`.
9. Register/login from the frontend.
10. Run endpoint agents against the Render backend URL.

## Endpoint Agents

Install agent dependencies on each endpoint PC:

```powershell
pip install -r agent\requirements.txt
```

Run an endpoint agent:

```powershell
$env:SOC_BACKEND_URL="https://your-backend.onrender.com"
$env:SOC_ENDPOINT_ID="2"
$env:SOC_PC_NAME="PC_2"
python agent\agent.py
```

For PC3:

```powershell
$env:SOC_BACKEND_URL="https://your-backend.onrender.com"
$env:SOC_ENDPOINT_ID="3"
$env:SOC_PC_NAME="PC_3"
python agent\agent.py
```

The deployed backend keeps the same API routes used locally:

- `POST /login`
- `POST /register`
- `POST /register-endpoint`
- `POST /predict`
- `POST /upload-alert`
- `POST /telemetry`
- Admin-only: `GET /telemetry`, `GET /endpoints/status`, `GET /get-alerts`, `GET /users`
- Endpoint-only: `GET /my/endpoint`, `GET /my/alerts`, `GET /my/quarantine`, `GET /my/behavior`, `GET /my/health`
- quarantine restore/delete routes

## Local Development

Backend:

```powershell
cd Backend
python start.py
```

Frontend:

```powershell
cd frontend
npm run dev -- --host
```

Optional local frontend env:

```text
VITE_API_URL=http://127.0.0.1:8000
```

## Notes

- SQLite is kept for local development. Render should use `DATABASE_URL` with persistent PostgreSQL so registered users survive restarts and redeploys.
- Free Render services may sleep when idle. The first request after sleep can take longer.
- Keep `SECRET_KEY` stable after users log in, or existing tokens will become invalid.
- Keep `ALLOWED_ORIGINS` updated with your final Vercel production URL.
