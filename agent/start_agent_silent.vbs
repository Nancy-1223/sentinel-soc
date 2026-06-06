Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\ProgramData\SentinelSOC"
WshShell.Run """C:\ProgramData\SentinelSOC\agent.exe""", 0, False
