# ClipSync Desktop Installer
# Creates desktop shortcut and startup entry for the AHK clipboard monitor

$AhkExe = "C:\Program Files\AutoHotkey\v2\AutoHotkey64.exe"
$ScriptPath = Join-Path $PSScriptRoot "clipsync-hotkeys.ahk"
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$StartupPath = [Environment]::GetFolderPath("Startup")

if (-not (Test-Path $AhkExe)) {
    Write-Host "ERROR: AutoHotkey v2 not found at $AhkExe" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $ScriptPath)) {
    Write-Host "ERROR: clipsync-hotkeys.ahk not found at $ScriptPath" -ForegroundColor Red
    exit 1
}

# Create Desktop shortcut
$WshShell = New-Object -ComObject WScript.Shell
$DesktopShortcut = $WshShell.CreateShortcut("$DesktopPath\ClipSync.lnk")
$DesktopShortcut.TargetPath = $AhkExe
$DesktopShortcut.Arguments = "`"$ScriptPath`""
$DesktopShortcut.WorkingDirectory = $PSScriptRoot
$DesktopShortcut.Description = "ClipSync Clipboard Monitor"
$DesktopShortcut.IconLocation = "shell32.dll,44"
$DesktopShortcut.Save()
Write-Host "Desktop shortcut created: $DesktopPath\ClipSync.lnk" -ForegroundColor Green

# Create Startup shortcut (auto-start on login)
$StartupShortcut = $WshShell.CreateShortcut("$StartupPath\ClipSync.lnk")
$StartupShortcut.TargetPath = $AhkExe
$StartupShortcut.Arguments = "`"$ScriptPath`""
$StartupShortcut.WorkingDirectory = $PSScriptRoot
$StartupShortcut.Description = "ClipSync Clipboard Monitor"
$StartupShortcut.IconLocation = "shell32.dll,44"
$StartupShortcut.Save()
Write-Host "Startup shortcut created: $StartupPath\ClipSync.lnk" -ForegroundColor Green

Write-Host ""
Write-Host "ClipSync installed!" -ForegroundColor Cyan
Write-Host "  - Desktop shortcut: double-click to start"
Write-Host "  - Auto-starts on login"
Write-Host "  - Ctrl+Alt+1-12: Paste from slots"
Write-Host "  - Ctrl+Alt+S: Save clipboard to slot"
Write-Host "  - Ctrl+Alt+P: Show AI prediction"
Write-Host "  - Ctrl+Alt+Space: Open web UI"
Write-Host ""
Write-Host "Starting ClipSync now..." -ForegroundColor Yellow
Start-Process $AhkExe -ArgumentList "`"$ScriptPath`""
