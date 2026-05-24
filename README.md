# Sentinel SOC

AI-Based SOC Threat Detection Platform.

## Windows Endpoint Agent

Normal users should onboard endpoints from the Sentinel SOC dashboard:

1. Login to the dashboard.
2. Open Endpoint Details.
3. Enter the PC name.
4. Click Register Endpoint.
5. Click Download Agent.
6. Extract the zip and double-click `install_agent.bat` once.

The downloaded package already contains the endpoint configuration. The
installer creates a Windows Startup entry and starts telemetry plus Downloads
malware detection.

Developer/testing setup is still available. After registering an endpoint from
the dashboard, install the Windows-friendly background agent manually:

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
