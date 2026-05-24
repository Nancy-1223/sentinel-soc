Option Explicit

Dim shell, fso, agentDir, command

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
agentDir = fso.GetParentFolderName(WScript.ScriptFullName)

command = "%ComSpec% /c cd /d """ & agentDir & """ && " & _
    "(where pyw >nul 2>nul && pyw -3 """ & agentDir & "\agent.py"") || " & _
    "(where pythonw >nul 2>nul && pythonw """ & agentDir & "\agent.py"") || " & _
    "(where py >nul 2>nul && py -3 """ & agentDir & "\agent.py"") || " & _
    "python """ & agentDir & "\agent.py"""

shell.Run command, 0, False
