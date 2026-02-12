# ClipSync Desktop Hotkeys (AutoHotkey v2)

## Requirements
- Windows 10/11
- AutoHotkey v2 installed
- ClipSync server running on `http://localhost:5000`

## Files
- `clipsync-hotkeys.ahk` sets up clipboard monitoring and hotkeys
- `tray-icon.ahk` adds a tray menu to launch ClipSync

## Setup
1. Install AutoHotkey v2 from https://www.autohotkey.com
2. Edit `API_BASE` in `clipsync-hotkeys.ahk` if the server is remote.
3. If you use API keys, set `API_KEY` in `clipsync-hotkeys.ahk`.
4. Double-click `clipsync-hotkeys.ahk` to start hotkeys.
5. Optional: run `tray-icon.ahk` for a tray menu.

## Auto-Start
- Place a shortcut to `clipsync-hotkeys.ahk` in:
  `shell:startup`

## Default Hotkeys
- `Ctrl+Alt+1` to `Ctrl+Alt+9`: paste clip from slots 1-9
- `Ctrl+Alt+0`: paste clip from slot 10
- `Ctrl+Alt+-`: paste clip from slot 11
- `Ctrl+Alt+=`: paste clip from slot 12
- `Ctrl+Alt+S`: save current clipboard to next available slot
- `Ctrl+Alt+P`: show current AI prediction
- `Ctrl+Alt+Space`: open ClipSync in the browser
