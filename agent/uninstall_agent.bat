@echo off
setlocal
cd /d "%~dp0"
echo Uninstalling Sentinel SOC Agent startup entry...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$startup = [Environment]::GetFolderPath('Startup'); $shortcut = Join-Path $startup 'Sentinel SOC Agent.lnk'; if (Test-Path $shortcut) { Remove-Item -LiteralPath $shortcut -Force; Write-Output ('Removed startup shortcut: ' + $shortcut) } else { Write-Output 'Startup shortcut was not found.' }"
echo Stopping Sentinel SOC Agent if it is running...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$agentPath = (Resolve-Path '.\agent.py').Path.ToLower(); $matches = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine.ToLower().Contains($agentPath) }; if ($matches) { $matches | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Output ('Stopped PID ' + $_.ProcessId) } } else { Write-Output 'No Sentinel SOC Agent process found.' }"
echo Done.
pause
