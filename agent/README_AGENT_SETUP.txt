Sentinel SOC Endpoint Agent - Windows Setup

This package runs without Python, pip, VS Code, or Python IDLE on the target PC.

Package contents:
- agent.exe
- .env
- install_agent.bat
- start_agent_silent.vbs
- stop_agent.bat
- uninstall_agent.bat
- README_AGENT_SETUP.txt

Before installing:
1. Open .env and confirm these values:
   SOC_BACKEND_URL="https://your-backend-url"
   SOC_ENDPOINT_ID="1"
   SOC_ENDPOINT_TOKEN="paste-endpoint-token-here"
   SOC_PC_NAME="PC_NAME"
2. Keep all package files in the same extracted folder.

Install on a clean Windows laptop:
1. Extract the ZIP.
2. Right-click install_agent.bat.
3. Choose Run as administrator.
4. The installer copies files to C:\ProgramData\SentinelSOC\.
5. It creates a Windows startup entry for this user.
6. It starts C:\ProgramData\SentinelSOC\agent.exe silently.

Stop the agent:
- Run C:\ProgramData\SentinelSOC\stop_agent.bat.

Uninstall:
1. Right-click C:\ProgramData\SentinelSOC\uninstall_agent.bat.
2. Choose Run as administrator.
3. The uninstaller stops agent.exe, removes startup entries, deletes
   C:\ProgramData\SentinelSOC\, and removes local Sentinel runtime files.

Build the executable on the developer PC:
1. Install dependencies in the agent folder:
   pip install -r requirements.txt pyinstaller
2. Build:
   pyinstaller --onefile --noconsole agent.py
3. Copy dist\agent.exe into the endpoint ZIP beside .env and the scripts.

Expected clean-PC test:
- No Python installed.
- Extract ZIP.
- Run install_agent.bat as Administrator.
- Endpoint appears online in the dashboard.
- Telemetry works.
- Alerts work.
- Quarantine works.
