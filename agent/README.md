# Sentinel SOC Windows Endpoint Agent

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
    start_agent_silent.vbs
    install_agent.bat
    uninstall_agent.bat
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

## Dashboard Onboarding

Normal users should not use Swagger or terminal commands for endpoint
registration.

1. Login to the Sentinel SOC dashboard.
2. Open Endpoint Management.
3. Enter the PC name.
4. Click Register Endpoint.
5. Click Download Agent.
6. Extract the downloaded zip.
7. Double-click `install_agent.bat` once.

The zip contains `agent.py`, `install_agent.py`, `install_agent.bat`,
`start_agent_silent.vbs`, `start_agent.bat`, `stop_agent.bat`,
`uninstall_agent.bat`, and a pre-filled `.env` file. The installer creates a
Windows Startup shortcut to the silent launcher and starts the agent
immediately in the background. After that, telemetry and Downloads malware
detection start automatically when Windows signs in.

## Install

For downloaded dashboard packages, extract the zip and double-click:

```text
install_agent.bat
```

The installer saves or reuses `agent\.env`, installs Python dependencies, and
creates a Windows Startup shortcut named `Sentinel SOC Agent.lnk`. The shortcut
points to `start_agent_silent.vbs`, so no command window stays open while the
agent runs.

## Start

Normal background start:

```text
start_agent_silent.vbs
```

Developer/testing start with visible logs:

```text
start_agent.bat
```

The existing terminal method also still works:

```powershell
python agent\agent.py
```

## Stop

Double-click:

```text
stop_agent.bat
```

This stops the local Python process whose command line contains `agent.py`.

## Uninstall

Double-click:

```text
uninstall_agent.bat
```

This removes the `Sentinel SOC Agent.lnk` Startup shortcut and stops the
currently running agent process. It does not delete `.env`, logs, quarantine
metadata, or the downloaded agent folder.

## Status And Logs

The agent writes status and runtime logs to:

```text
agent\agent_status.json
agent\agent.log
```

`agent_status.json` shows the current state, endpoint ID, PC name, backend URL,
process ID, and last update time. `agent.log` records telemetry, detection,
quarantine, and backend upload messages even when the agent is launched
silently.

## Verify Dashboard Online Status

1. Confirm the backend URL in `agent\.env` matches the dashboard backend.
2. Run `install_agent.bat` once, or double-click `start_agent_silent.vbs`.
3. Open `agent\agent_status.json` and confirm the state is `running`.
4. Open the Sentinel SOC dashboard and check Endpoint Management.
5. The endpoint should change to Online after the next telemetry post.

## Developer Setup

Register an endpoint in the dashboard or backend and note its `endpoint_id`.
Then run the Windows installer from the project root:

```powershell
python agent\install_agent.py
```

The installer asks for:

- Backend URL, for example `http://127.0.0.1:8000` or your deployed backend URL.
- Endpoint ID from the SOC dashboard.
- PC name to show in dashboard telemetry and alerts.

It saves those values to `agent\.env` and creates a Windows Startup folder
shortcut named `Sentinel SOC Agent.lnk`. After that, the agent starts
automatically and silently when the Windows user signs in.

To start the agent immediately without VS Code, double-click:

```text
agent\start_agent_silent.vbs
```

For visible testing logs, double-click:

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
4. Double-click `agent\start_agent_silent.vbs` or restart/sign in to let Windows auto-start it.
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
