# Usage: powershell -File scripts/take-screenshots.ps1
# Starts a dev server, then captures the demo screens at a phone-like 500x1083 (headless Edge has a
# minimum width of about 500px) at 2.5x, in dark mode.
param([string]$Out = (Join-Path $PSScriptRoot '..\docs\screenshots'))

$env:Path = "C:\Program Files\nodejs;" + $env:Path
$env:CI = '1'
Set-Location (Join-Path $PSScriptRoot '..')
New-Item -ItemType Directory -Force $Out | Out-Null

$port = 8098
$server = Start-Process -FilePath 'C:\Program Files\nodejs\npx.cmd' -ArgumentList 'expo', 'start', '--port', "$port" -PassThru -WindowStyle Hidden -RedirectStandardOutput "$env:TEMP\wd-shots-out.log" -RedirectStandardError "$env:TEMP\wd-shots-err.log"

try {
  # Wait for the server, and warm up each route so the bundles are built before capturing.
  $routes = 'feed', 'activity', 'chat', 'profile'
  foreach ($route in $routes) {
    for ($i = 0; $i -lt 60; $i++) {
      try { Invoke-WebRequest "http://localhost:$port/demo/$route" -UseBasicParsing -TimeoutSec 120 | Out-Null; break } catch { Start-Sleep 2 }
    }
  }

  $edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
  foreach ($route in $routes) {
    $file = Join-Path $Out "$route.png"
    $profileDir = Join-Path $env:TEMP "wd-edge-$route"
    & $edge --headless=new --disable-gpu --hide-scrollbars --no-first-run "--user-data-dir=$profileDir" `
      --window-size=500,1083 --force-device-scale-factor=2.5 --blink-settings=preferredColorScheme=0 `
      --virtual-time-budget=15000 "--screenshot=$file" "http://localhost:$port/demo/$route" 2>$null | Out-Null
    Start-Sleep 1
    if (Test-Path $file) { "saved $file ($((Get-Item $file).Length) bytes)" } else { "FAILED $route" }
  }
}
finally {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
}
