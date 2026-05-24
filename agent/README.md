# Day 2 Endpoint Agent

Safe demo-only endpoint monitor for the AI-Based SOC Virus Detection System.
Use EICAR or fake suspicious files only. Do not test with real malware.

## Folder Structure

```text
SOC Project/
  Backend/
    main.py
    model.pkl
    soc_backend.db
  agent/
    agent.py
    requirements.txt
    README.md
  quarantine/
    suspicious_file.bat
    suspicious_file.bat.quarantine.json
```

## Setup

Install the agent dependencies:

```powershell
pip install -r agent\requirements.txt
```

Start the backend first:

```powershell
cd Backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Register an endpoint in the backend and note its `endpoint_id`. Then run the
Windows installer from the project root:

```powershell
python agent\install_agent.py
```

The installer asks for:

- Backend URL, for example `http://127.0.0.1:8000` or your deployed backend URL.
- Endpoint ID from the SOC dashboard.
- PC name to show in dashboard telemetry and alerts.

It saves those values to `agent\.env` and creates a Windows Startup folder
shortcut named `Sentinel SOC Agent.lnk`. After that, the agent starts
automatically when the Windows user signs in.

To start the agent immediately without VS Code, double-click:

```text
agent\start_agent.bat
```

To stop the agent, double-click:

```text
agent\stop_agent.bat
```

The original terminal method still works from the project root:

```powershell
$env:SOC_ENDPOINT_ID="1"
python agent\agent.py
```

Optional environment variables:

```powershell
$env:SOC_BACKEND_URL="http://10.170.117.155:8000"
$env:SOC_PC_NAME="LAB-PC-01"
```

If these environment variables are not set manually, `agent.py` reads the same
values from `agent\.env`.

For public deployment, point agents at the Render backend:

```powershell
$env:SOC_BACKEND_URL="https://your-backend.onrender.com"
$env:SOC_ENDPOINT_ID="2"
$env:SOC_PC_NAME="PC_2"
python agent\agent.py
```

## Safe Demo Flow

1. Run the backend.
2. Register the endpoint from the dashboard.
3. Run `python agent\install_agent.py` once and enter the endpoint details.
4. Double-click `agent\start_agent.bat` or restart/sign in to let Windows auto-start it.
5. Place a fake suspicious `.bat`, `.ps1`, `.js`, or EICAR test file in
   `C:\Users\<username>\Downloads`.
6. The agent detects the file, blocks malicious/high-risk execution locally,
   quarantines or force deletes it, and uploads the alert to `/upload-alert`.

Manual terminal testing is still supported:

```powershell
python agent\agent.py
```

Then place a fake suspicious `.bat`, `.ps1`, `.js`, or EICAR test file in
`C:\Users\<username>\Downloads`.

Example fake suspicious `.bat` content:

```bat
echo demo only
echo powershell cmd registry startup taskkill download encrypt delete
```

Expected logs:

```text
[INFO] Monitoring Downloads folder...
[INFO] New file detected: fake_suspicious.bat
[INFO] Extracting file features...
[INFO] AI Prediction: Malicious
[BLOCKED] fake_suspicious.bat
[QUARANTINED] fake_suspicious.bat
[INFO] Alert uploaded successfully
```

Protection behavior:

- EICAR files are always treated as `Malicious` with risk score `95`.
- `.bat`, `.cmd`, `.ps1`, `.exe`, `.vbs`, `.scr`, and `.js` files with suspicious keywords are blocked immediately.
- Malicious file hashes are remembered in `agent\malicious_hashes.json`; repeat files are blocked without another backend prediction.
- Duplicate alerts for the same path are suppressed for 30 seconds.
