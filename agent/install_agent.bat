@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "INSTALL_DIR=C:\ProgramData\SentinelSOC"
set "LOG_DIR=C:\ProgramData\SentinelSOC\logs"
set "RUN_KEY=HKLM\Software\Microsoft\Windows\CurrentVersion\Run"
set "RUN_NAME=SentinelSOCAgent"
set "INSTALL_LOG=C:\ProgramData\SentinelSOC\install_agent.log"

net session >nul 2>&1
if not "%ERRORLEVEL%"=="0" (
    echo Sentinel SOC Agent installer must be run as Administrator.
    echo Right-click install_agent.bat and choose "Run as administrator".
    pause
    exit /b 1
)

if not exist "%~dp0agent.exe" (
    echo agent.exe was not found in this folder.
    echo Build it first with: pyinstaller --onefile --noconsole agent.py
    pause
    exit /b 1
)

if not exist "%~dp0.env" (
    echo .env was not found in this folder.
    echo Download a fresh agent ZIP from the Sentinel SOC dashboard.
    pause
    exit /b 1
)

findstr /B /C:"BACKEND_URL=" "%~dp0.env" >nul || goto env_failed
findstr /B /C:"ENDPOINT_ID=" "%~dp0.env" >nul || goto env_failed
findstr /B /C:"ENDPOINT_TOKEN=" "%~dp0.env" >nul || goto env_failed
findstr /B /C:"PC_NAME=" "%~dp0.env" >nul || goto env_failed

echo Installing Sentinel SOC Agent to "%INSTALL_DIR%"...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
echo [%DATE% %TIME%] Installing Sentinel SOC Agent > "%INSTALL_LOG%"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$agentPath = 'C:\ProgramData\SentinelSOC\agent.exe'.ToLower(); Get-CimInstance Win32_Process | Where-Object { ($_.ExecutablePath -and $_.ExecutablePath.ToLower() -eq $agentPath) -or ($_.CommandLine -and $_.CommandLine.ToLower().Contains($agentPath)) } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >> "%INSTALL_LOG%" 2>&1

copy /Y "%~dp0agent.exe" "%INSTALL_DIR%\agent.exe" >> "%INSTALL_LOG%" 2>&1
if errorlevel 1 goto copy_failed
copy /Y "%~dp0.env" "%INSTALL_DIR%\.env" >> "%INSTALL_LOG%" 2>&1
if errorlevel 1 goto copy_failed
copy /Y "%~dp0start_agent_silent.vbs" "%INSTALL_DIR%\start_agent_silent.vbs" >> "%INSTALL_LOG%" 2>&1
if errorlevel 1 goto copy_failed
copy /Y "%~dp0stop_agent.bat" "%INSTALL_DIR%\stop_agent.bat" >> "%INSTALL_LOG%" 2>&1
if errorlevel 1 goto copy_failed
copy /Y "%~dp0uninstall_agent.bat" "%INSTALL_DIR%\uninstall_agent.bat" >> "%INSTALL_LOG%" 2>&1
if errorlevel 1 goto copy_failed
if exist "%~dp0README_AGENT_SETUP.txt" copy /Y "%~dp0README_AGENT_SETUP.txt" "%INSTALL_DIR%\README_AGENT_SETUP.txt" >> "%INSTALL_LOG%" 2>&1
if exist "%~dp0malicious_hashes.json" copy /Y "%~dp0malicious_hashes.json" "%INSTALL_DIR%\malicious_hashes.json" >> "%INSTALL_LOG%" 2>&1

powershell -NoProfile -ExecutionPolicy Bypass -Command "New-Item -Path 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run' -Force | Out-Null; New-ItemProperty -Path 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'SentinelSOCAgent' -Value 'wscript.exe ""C:\ProgramData\SentinelSOC\start_agent_silent.vbs""' -PropertyType String -Force | Out-Null" >> "%INSTALL_LOG%" 2>&1
if errorlevel 1 (
    echo Failed to create Windows startup entry.
    echo See "%INSTALL_LOG%" for details.
    pause
    exit /b 1
)

echo Starting Sentinel SOC Agent silently...
wscript.exe "%INSTALL_DIR%\start_agent_silent.vbs" >> "%INSTALL_LOG%" 2>&1
timeout /t 3 /nobreak >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "$agentPath = 'C:\ProgramData\SentinelSOC\agent.exe'.ToLower(); $running = Get-CimInstance Win32_Process | Where-Object { ($_.ExecutablePath -and $_.ExecutablePath.ToLower() -eq $agentPath) -or ($_.CommandLine -and $_.CommandLine.ToLower().Contains($agentPath)) }; if (-not $running) { exit 1 }" >> "%INSTALL_LOG%" 2>&1
if errorlevel 1 (
    echo Sentinel SOC Agent files were installed, but agent.exe did not stay running.
    echo Check "%INSTALL_DIR%\agent.log" and "%INSTALL_LOG%" for the exact error.
    if exist "%INSTALL_DIR%\agent.log" type "%INSTALL_DIR%\agent.log"
    pause
    exit /b 1
)

echo.
echo Sentinel SOC Agent installed successfully.
echo Install folder: %INSTALL_DIR%
echo Runtime log: %INSTALL_DIR%\agent.log
echo The agent will start automatically when this Windows user signs in.
pause
exit /b 0

:env_failed
echo .env is missing one or more required values.
echo Required keys: BACKEND_URL, ENDPOINT_ID, ENDPOINT_TOKEN, PC_NAME
echo Download a fresh agent ZIP from the Sentinel SOC dashboard and try again.
pause
exit /b 1

:copy_failed
echo Failed to copy Sentinel SOC Agent files to "%INSTALL_DIR%".
echo Close any running agent.exe process and run this installer as Administrator again.
echo See "%INSTALL_LOG%" for details.
pause
exit /b 1
