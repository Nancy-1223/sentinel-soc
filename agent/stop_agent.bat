@echo off
setlocal
cd /d "%~dp0"
echo Stopping Sentinel SOC Agent...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$agentPath = (Resolve-Path '.\agent.py').Path.ToLower(); $matches = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine.ToLower().Contains($agentPath) }; if ($matches) { $matches | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Output ('Stopped PID ' + $_.ProcessId) } } else { Write-Output 'No Sentinel SOC Agent process found.' }"
echo Done.
pause
