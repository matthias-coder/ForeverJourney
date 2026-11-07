# Legt eine Autostart-Verknüpfung für ForeverJourney an (oder entfernt sie mit -Remove).
param([switch]$Remove)

$ErrorActionPreference = "Stop"
$toolDir = $PSScriptRoot
$startup = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
$link = Join-Path $startup "ForeverJourney.lnk"

if ($Remove) {
    if (Test-Path $link) { Remove-Item $link; Write-Host "Autostart entfernt." }
    else { Write-Host "Kein Autostart-Eintrag vorhanden." }
    exit 0
}

$pythonw = Join-Path $toolDir ".venv\Scripts\pythonw.exe"
if (-not (Test-Path $pythonw)) {
    Write-Error "pythonw.exe nicht gefunden: $pythonw. Bitte zuerst das venv einrichten (siehe README.md)."
}

$shell = New-Object -ComObject WScript.Shell
$sc = $shell.CreateShortcut($link)
$sc.TargetPath = $pythonw
$sc.Arguments = "-m foreverjourney tray"
$sc.WorkingDirectory = $toolDir
$sc.IconLocation = Join-Path $toolDir "icon.ico"
$sc.Description = "ForeverJourney"
$sc.Save()
Write-Host "Autostart angelegt: $link"
