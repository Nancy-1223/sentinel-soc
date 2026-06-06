@echo off
setlocal
cd /d "%~dp0"
echo Starting Sentinel SOC Agent...
where py >nul 2>nul
if %ERRORLEVEL%==0 (
    py -3 "%~dp0agent.py"
) else (
    python "%~dp0agent.py"
)
exit /b %ERRORLEVEL%
