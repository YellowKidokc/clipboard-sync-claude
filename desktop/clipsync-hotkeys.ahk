#Requires AutoHotkey v2.0
#SingleInstance Force

API_BASE := "http://localhost:5000"
API_KEY := ""
ignoreClipboard := false

OnClipboardChange(ClipboardChanged)

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

^!s::SaveClipboardToNextSlot()
^!p::ShowPrediction()
^!Space::Run(API_BASE)

ClipboardChanged(type) {
  global ignoreClipboard
  if (ignoreClipboard)
    return
  if (type != 1)
    return

  text := A_Clipboard
  if (text = "")
    return

  payload := Map(
    "content_type", "text/plain",
    "text_content", text,
    "source", "clipboard_monitor"
  )
  HttpPost("/api/clips", payload)
}

PasteFromSlot(slot) {
  global ignoreClipboard
  response := HttpGet("/api/clips/hotkeys")
  if (response = "")
    return
  data := Jxon_Load(response)[1]
  if !data.Has("slots")
    return
  if !data["slots"].Has(String(slot))
    return
  clip := data["slots"][String(slot)]
  text := clip.Has("text_content") ? clip["text_content"] : ""
  if (text = "")
    return
  ignoreClipboard := true
  A_Clipboard := text
  Send "^v"
  Sleep 100
  ignoreClipboard := false
}

SaveClipboardToNextSlot() {
  response := HttpGet("/api/clips/hotkeys")
  data := response != "" ? Jxon_Load(response)[1] : Map()
  slots := data.Has("slots") ? data["slots"] : Map()

  nextSlot := 0
  Loop 12 {
    slot := A_Index
    if !slots.Has(String(slot)) {
      nextSlot := slot
      break
    }
  }
  if (nextSlot = 0) {
    ToolTip "All slots are full"
    SetTimer () => ToolTip(""), -1500
    return
  }

  text := A_Clipboard
  if (text = "")
    return

  payload := Map(
    "content_type", "text/plain",
    "text_content", text,
    "hotkey_slot", nextSlot,
    "source", "clipboard_monitor"
  )
  HttpPost("/api/clips", payload)
  ToolTip "Saved to slot " . nextSlot
  SetTimer () => ToolTip(""), -1200
}

ShowPrediction() {
  response := HttpGet("/api/predictions/current")
  if (response = "")
    return
  data := Jxon_Load(response)[1]
  prediction := data.Has("prediction") ? data["prediction"] : ""
  confidence := data.Has("confidence") ? Round(data["confidence"] * 100) : 0
  ToolTip "Prediction: " . prediction . " (" . confidence . "%)"
  SetTimer () => ToolTip(""), -2000
}

HttpGet(path) {
  global API_BASE, API_KEY
  req := ComObject("WinHttp.WinHttpRequest.5.1")
  req.Open("GET", API_BASE . path, false)
  if (API_KEY != "")
    req.SetRequestHeader("x-api-key", API_KEY)
  req.Send()
  return req.ResponseText
}

HttpPost(path, payload) {
  global API_BASE, API_KEY
  req := ComObject("WinHttp.WinHttpRequest.5.1")
  req.Open("POST", API_BASE . path, false)
  req.SetRequestHeader("Content-Type", "application/json")
  if (API_KEY != "")
    req.SetRequestHeader("x-api-key", API_KEY)
  body := Jxon_Dump(payload)
  req.Send(body)
  return req.ResponseText
}

; Jxon library (minimal)
Jxon_Load(ByRef src, args*) {
  static q := Chr(34), ws := " `t`r`n", true := 1, false := 0, null := ""
  if !IsSet(args[1])
    args := [0, 0]
  pos := 1 + args[1]
  ch := SubStr(src, pos, 1)
  while InStr(ws, ch) {
    pos++
    ch := SubStr(src, pos, 1)
  }
  if (ch = q) {
    pos++
    val := ""
    loop {
      ch := SubStr(src, pos, 1)
      if (ch = q) {
        pos++
        break
      } else if (ch = "\") {
        pos++
        ch := SubStr(src, pos, 1)
        if (ch = "u") {
          hex := SubStr(src, pos + 1, 4)
          val .= Chr("0x" . hex)
          pos += 5
          continue
        }
      }
      val .= ch
      pos++
    }
  } else if (ch = "{") {
    obj := Map()
    pos++
    loop {
      ch := SubStr(src, pos, 1)
      while InStr(ws, ch) {
        pos++
        ch := SubStr(src, pos, 1)
      }
      if (ch = "}") {
        pos++
        break
      }
      key := Jxon_Load(src, pos)
      pos := key[2]
      ch := SubStr(src, pos, 1)
      while InStr(ws, ch) {
        pos++
        ch := SubStr(src, pos, 1)
      }
      pos++
      val := Jxon_Load(src, pos)
      pos := val[2]
      obj[key[1]] := val[1]
      ch := SubStr(src, pos, 1)
      while InStr(ws, ch) {
        pos++
        ch := SubStr(src, pos, 1)
      }
      if (ch = ",") {
        pos++
        continue
      } else if (ch = "}") {
        pos++
        break
      }
    }
    val := obj
  } else if (ch = "[") {
    arr := []
    pos++
    loop {
      ch := SubStr(src, pos, 1)
      while InStr(ws, ch) {
        pos++
        ch := SubStr(src, pos, 1)
      }
      if (ch = "]") {
        pos++
        break
      }
      val := Jxon_Load(src, pos)
      pos := val[2]
      arr.Push(val[1])
      ch := SubStr(src, pos, 1)
      while InStr(ws, ch) {
        pos++
        ch := SubStr(src, pos, 1)
      }
      if (ch = ",") {
        pos++
        continue
      } else if (ch = "]") {
        pos++
        break
      }
    }
    val := arr
  } else if RegExMatch(SubStr(src, pos), "^-?\d+(\.\d+)?([eE][+-]?\d+)?", &m) {
    val := m[0] + 0
    pos += StrLen(m[0])
  } else if SubStr(src, pos, 4) = "true" {
    val := true
    pos += 4
  } else if SubStr(src, pos, 5) = "false" {
    val := false
    pos += 5
  } else if SubStr(src, pos, 4) = "null" {
    val := null
    pos += 4
  }
  return [val, pos]
}

Jxon_Dump(obj, indent := "") {
  if (IsObject(obj)) {
    if (obj is Array) {
      out := "["
      for idx, val in obj {
        if (idx > 1)
          out .= ","
        out .= Jxon_Dump(val, indent)
      }
      return out "]"
    }
    out := "{"
    idx := 0
    for key, val in obj {
      if (idx > 0)
        out .= ","
      out .= "\"" . key . "\":" . Jxon_Dump(val, indent)
      idx++
    }
    return out "}"
  }
  if (obj is Number)
    return obj
  if (obj = "")
    return "\"\""
  escaped := StrReplace(obj, "\", "\\")
  escaped := StrReplace(escaped, "\"", "\\\"")
  escaped := StrReplace(escaped, "`r", "\\r")
  escaped := StrReplace(escaped, "`n", "\\n")
  return "\"" . escaped . "\""
}
