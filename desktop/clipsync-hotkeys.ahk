#Requires AutoHotkey v2.0
#SingleInstance Force

; ── Config ──────────────────────────────────────────────────────────────
; Change this to your NAS IP once the server is deployed there
API_BASE := "http://localhost:5000"
API_KEY := ""
ignoreClipboard := false

; ── Clipboard Monitor ───────────────────────────────────────────────────
OnClipboardChange(ClipboardChanged)

; ── Hotkeys ─────────────────────────────────────────────────────────────
; Ctrl+Alt+1-12: Paste from hotkey slot
^!1::PasteFromSlot(1)
^!2::PasteFromSlot(2)
^!3::PasteFromSlot(3)
^!4::PasteFromSlot(4)
^!5::PasteFromSlot(5)
^!6::PasteFromSlot(6)
^!7::PasteFromSlot(7)
^!8::PasteFromSlot(8)
^!9::PasteFromSlot(9)
^!0::PasteFromSlot(10)
^!-::PasteFromSlot(11)
^!=::PasteFromSlot(12)

; Ctrl+Alt+S: Save current clipboard to next available slot
^!s::SaveClipboardToNextSlot()
; Ctrl+Alt+P: Show AI prediction
^!p::ShowPrediction()
; Ctrl+Alt+Space: Open web UI in browser
^!Space::Run(API_BASE)

; ── Tray Menu ───────────────────────────────────────────────────────────
A_TrayMenu.Delete()
A_TrayMenu.Add("Open ClipSync Web UI", (*) => Run(API_BASE))
A_TrayMenu.Add()
A_TrayMenu.Add("Show Prediction (Ctrl+Alt+P)", (*) => ShowPrediction())
A_TrayMenu.Add("Save to Slot (Ctrl+Alt+S)", (*) => SaveClipboardToNextSlot())
A_TrayMenu.Add()
A_TrayMenu.Add("Reload", (*) => Reload())
A_TrayMenu.Add("Exit", (*) => ExitApp())
A_TrayMenu.Default := "Open ClipSync Web UI"
TraySetIcon("shell32.dll", 44)
A_IconTip := "ClipSync - Clipboard Monitor"

; Show startup notification
TrayTip "ClipSync is running`nCtrl+Alt+1-12 to paste from slots`nCtrl+Alt+S to save to slot", "ClipSync", 0x1
SetTimer () => TrayTip(), -3000

; ── Clipboard Changed Handler ───────────────────────────────────────────
ClipboardChanged(type) {
    global ignoreClipboard
    if (ignoreClipboard)
        return
    if (type != 1)  ; Only text
        return

    text := A_Clipboard
    if (text = "")
        return

    body := '{"content_type":"text/plain","text_content":' . JsonEscape(text) . ',"source":"clipboard_monitor"}'
    try {
        HttpPost("/api/clips", body)
    }
}

; ── Paste From Slot ─────────────────────────────────────────────────────
PasteFromSlot(slot) {
    global ignoreClipboard
    try {
        response := HttpGet("/api/clips/hotkeys")
        if (response = "")
            return
    } catch {
        ToolTip "ClipSync server not reachable"
        SetTimer () => ToolTip(), -1500
        return
    }

    ; Parse the response to find the slot
    ; Look for the slot's text_content in the JSON response
    slotText := ExtractSlotText(response, slot)
    if (slotText = "")
        return

    ignoreClipboard := true
    A_Clipboard := slotText
    Send "^v"
    Sleep 100
    ignoreClipboard := false
    ToolTip "Pasted slot " . slot
    SetTimer () => ToolTip(), -800
}

; ── Save To Next Slot ───────────────────────────────────────────────────
SaveClipboardToNextSlot() {
    text := A_Clipboard
    if (text = "")
        return

    ; Find next available slot (1-12)
    try {
        response := HttpGet("/api/clips/hotkeys")
    } catch {
        response := ""
    }

    nextSlot := 1
    if (response != "") {
        Loop 12 {
            slotText := ExtractSlotText(response, A_Index)
            if (slotText = "") {
                nextSlot := A_Index
                break
            }
            if (A_Index = 12)
                nextSlot := 0
        }
    }

    if (nextSlot = 0) {
        ToolTip "All 12 slots are full!"
        SetTimer () => ToolTip(), -1500
        return
    }

    body := '{"content_type":"text/plain","text_content":' . JsonEscape(text) . ',"hotkey_slot":' . nextSlot . ',"source":"clipboard_monitor"}'
    try {
        HttpPost("/api/clips", body)
        ToolTip "Saved to slot " . nextSlot
        SetTimer () => ToolTip(), -1200
    } catch {
        ToolTip "Failed to save"
        SetTimer () => ToolTip(), -1500
    }
}

; ── Show Prediction ─────────────────────────────────────────────────────
ShowPrediction() {
    try {
        response := HttpGet("/api/predictions/current")
        if (response = "")
            return

        ; Extract prediction text and confidence from JSON
        prediction := ExtractJsonString(response, "prediction")
        confidence := ExtractJsonNumber(response, "confidence")
        pct := Round(confidence * 100)

        if (prediction = "") {
            ToolTip "No prediction available"
        } else {
            ToolTip "AI Prediction (" . pct . "%):`n" . SubStr(prediction, 1, 200)
        }
        SetTimer () => ToolTip(), -3000
    } catch {
        ToolTip "Could not reach prediction engine"
        SetTimer () => ToolTip(), -1500
    }
}

; ── HTTP Helpers ────────────────────────────────────────────────────────
HttpGet(path) {
    global API_BASE, API_KEY
    req := ComObject("WinHttp.WinHttpRequest.5.1")
    req.Open("GET", API_BASE . path, false)
    if (API_KEY != "")
        req.SetRequestHeader("x-api-key", API_KEY)
    req.Send()
    return req.ResponseText
}

HttpPost(path, body) {
    global API_BASE, API_KEY
    req := ComObject("WinHttp.WinHttpRequest.5.1")
    req.Open("POST", API_BASE . path, false)
    req.SetRequestHeader("Content-Type", "application/json")
    if (API_KEY != "")
        req.SetRequestHeader("x-api-key", API_KEY)
    req.Send(body)
    return req.ResponseText
}

; ── JSON Helpers (simple, no external lib needed) ───────────────────────
JsonEscape(str) {
    str := StrReplace(str, "\", "\\")
    str := StrReplace(str, "`"", "\`"")
    str := StrReplace(str, "`n", "\n")
    str := StrReplace(str, "`r", "\r")
    str := StrReplace(str, "`t", "\t")
    return "`"" . str . "`""
}

ExtractJsonString(json, key) {
    needle := "`"" . key . "`"`s*:`s*`""
    if RegExMatch(json, needle . "(.*?)`"", &m)
        return m[1]
    return ""
}

ExtractJsonNumber(json, key) {
    needle := "`"" . key . "`"`s*:`s*(-?[\d.]+)"
    if RegExMatch(json, needle, &m)
        return m[1] + 0
    return 0
}

ExtractSlotText(json, slot) {
    ; Look for "hotkey_slot":N followed by "text_content":"..."
    ; This is a simplified parser for the hotkeys endpoint response
    needle := "`"hotkey_slot`"`s*:`s*" . slot . ".*?`"text_content`"`s*:`s*`"(.*?)`""
    if RegExMatch(json, "s)" . needle, &m)
        return StrReplace(StrReplace(m[1], "\n", "`n"), "\\", "\")
    return ""
}
