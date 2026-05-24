# Sentinel SOC

AI-Based SOC Threat Detection Platform.

## Windows Endpoint Agent

After registering an endpoint from the dashboard, install the Windows-friendly
background agent once:

```powershell
python agent\install_agent.py
```

Enter the backend URL, endpoint ID, and PC name. The installer writes
`agent\.env` and creates a Windows Startup shortcut so `agent.py` starts when
Windows signs in.

Useful double-click files:

- `agent\start_agent.bat` starts telemetry and Downloads malware detection.
- `agent\stop_agent.bat` stops the local Sentinel SOC agent process.

The old terminal method still works:

```powershell
python agent\agent.py
```

See `agent\README.md` for the full agent setup and safe demo flow.
