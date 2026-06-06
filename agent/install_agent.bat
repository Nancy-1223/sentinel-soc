@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "INSTALL_DIR=C:\ProgramData\SentinelSOC"
set "RUN_KEY=HKCU\Software\Microsoft\Windows\CurrentVersion\Run"
set "RUN_NAME=SentinelSOCAgent"

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
    echo Add SOC_BACKEND_URL, SOC_ENDPOINT_ID, SOC_ENDPOINT_TOKEN, and SOC_PC_NAME before installing.
    pause
    exit /b 1
)

echo Installing Sentinel SOC Agent to "%INSTALL_DIR%"...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
copy /Y "%~dp0agent.exe" "%INSTALL_DIR%\agent.exe" >nul
copy /Y "%~dp0.env" "%INSTALL_DIR%\.env" >nul
copy /Y "%~dp0start_agent_silent.vbs" "%INSTALL_DIR%\start_agent_silent.vbs" >nul
copy /Y "%~dp0stop_agent.bat" "%INSTALL_DIR%\stop_agent.bat" >nul
copy /Y "%~dp0uninstall_agent.bat" "%INSTALL_DIR%\uninstall_agent.bat" >nul
if exist "%~dp0README_AGENT_SETUP.txt" copy /Y "%~dp0README_AGENT_SETUP.txt" "%INSTALL_DIR%\README_AGENT_SETUP.txt" >nul
if exist "%~dp0malicious_hashes.json" copy /Y "%~dp0malicious_hashes.json" "%INSTALL_DIR%\malicious_hashes.json" >nul

powershell -NoProfile -ExecutionPolicy Bypass -Command "New-Item -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Force | Out-Null; New-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'SentinelSOCAgent' -Value 'wscript.exe ""C:\ProgramData\SentinelSOC\start_agent_silent.vbs""' -PropertyType String -Force | Out-Null"
if errorlevel 1 (
    echo Failed to create Windows startup entry.
    pause
    exit /b 1
)

echo Starting Sentinel SOC Agent silently...
wscript.exe "%INSTALL_DIR%\start_agent_silent.vbs"

echo.
echo Sentinel SOC Agent installed successfully.
echo Install folder: %INSTALL_DIR%
echo The agent will start automatically when this Windows user signs in.
pause
