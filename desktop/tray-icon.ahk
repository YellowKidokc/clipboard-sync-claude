#Requires AutoHotkey v2.0
#SingleInstance Force

API_BASE := "http://localhost:5000"

A_TrayMenu.Delete()
A_TrayMenu.Add("Open ClipSync", (*) => Run(API_BASE))
A_TrayMenu.Add("Open Hotkey Script", (*) => Run(A_ScriptDir . "\clipsync-hotkeys.ahk"))
A_TrayMenu.Add("Exit", (*) => ExitApp())

TraySetIcon("shell32.dll", 44)

return
