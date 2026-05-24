@echo off
setlocal
cd /d "%~dp0"
echo Installing Sentinel SOC Agent...
where py >nul 2>nul
if %ERRORLEVEL%==0 (
    py -3 "%~dp0install_agent.py"
) else (
    python "%~dp0install_agent.py"
)
pause
