@echo off
setlocal EnableExtensions

set "INSTALL_DIR=C:\ProgramData\SentinelSOC"
set "RUN_KEY=HKLM\Software\Microsoft\Windows\CurrentVersion\Run"
set "RUN_NAME=SentinelSOCAgent"

net session >nul 2>&1
if not "%ERRORLEVEL%"=="0" (
    echo Sentinel SOC Agent uninstaller must be run as Administrator.
    echo Right-click uninstall_agent.bat and choose "Run as administrator".
    pause
    exit /b 1
)

echo Stopping Sentinel SOC Agent if it is running...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$agentPath = 'C:\ProgramData\SentinelSOC\agent.exe'.ToLower(); $matches = Get-CimInstance Win32_Process | Where-Object { ($_.ExecutablePath -and $_.ExecutablePath.ToLower() -eq $agentPath) -or ($_.CommandLine -and $_.CommandLine.ToLower().Contains($agentPath)) }; if ($matches) { $matches | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Output ('Stopped PID ' + $_.ProcessId) } } else { Write-Output 'No Sentinel SOC Agent process found.' }"

echo Removing Windows startup entry...
reg delete "%RUN_KEY%" /v "%RUN_NAME%" /f >nul 2>nul
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "%RUN_NAME%" /f >nul 2>nul
schtasks /Delete /TN "SentinelSOCAgent" /F >nul 2>nul

echo Removing installed Sentinel SOC files...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$installDir = 'C:\ProgramData\SentinelSOC'; if (Test-Path -LiteralPath $installDir) { Remove-Item -LiteralPath $installDir -Recurse -Force -ErrorAction SilentlyContinue; Write-Output ('Removed ' + $installDir) } else { Write-Output 'Install folder was not found.' }; $localFiles = @('agent.exe','agent.log','agent.pid','agent_status.json','malicious_hashes.json'); foreach ($name in $localFiles) { $path = Join-Path (Get-Location) $name; if ((Get-Location).Path -ne $installDir -and (Test-Path -LiteralPath $path)) { Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue; Write-Output ('Removed local ' + $name) } }"

echo Sentinel SOC Agent uninstalled.
pause
