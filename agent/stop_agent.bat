@echo off
setlocal
cd /d "C:\ProgramData\SentinelSOC" 2>nul
echo Stopping Sentinel SOC Agent...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$agentPath = 'C:\ProgramData\SentinelSOC\agent.exe'.ToLower(); $matches = Get-CimInstance Win32_Process | Where-Object { ($_.ExecutablePath -and $_.ExecutablePath.ToLower() -eq $agentPath) -or ($_.CommandLine -and $_.CommandLine.ToLower().Contains($agentPath)) }; if ($matches) { $matches | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Output ('Stopped PID ' + $_.ProcessId) } } else { Write-Output 'No Sentinel SOC Agent process found.' }"
echo Done.
pause
