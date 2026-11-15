# terra.pura one-command installer for Windows (PowerShell 5.1+).
# NASA Space Apps Challenge 2026. Code generated with Super Intelligence (SI): Claude by Anthropic;
# designed, reviewed and tested by the terra.pura team.
#
# Run in PowerShell:
#   irm 'https://raw.githubusercontent.com/SorilaDevelopment/NASA-Space-Apps-Projects/main/2026%20Hackathon%20-%20terra.pura/install.ps1' | iex
#
# It downloads terra.pura, gets Python if you don't have it (a portable copy, no admin needed),
# then asks how you want to run it: on this computer, shared on your network, kept running in the background, or removed.
# Optional settings for scripted use: $env:TP_MODE = local | lan | always | always-lan | remove ; $env:TP_PORT = 5173

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # much faster downloads in Windows PowerShell 5.1
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch {}

$Repo      = 'SorilaDevelopment/NASA-Space-Apps-Projects'
$Branch    = 'main'
$Folder    = '2026 Hackathon - terra.pura'
$Home_     = Join-Path $env:LOCALAPPDATA 'terra.pura'
$AppDir    = Join-Path $Home_ 'app'
$PyDir     = Join-Path $Home_ 'python'
$PyVersion = '3.12.7'
$Startup   = Join-Path ([Environment]::GetFolderPath('Startup')) 'terra.pura.lnk'
$RuleName  = 'terra.pura (local web server)'

function Say($text, $color = 'Gray') { Write-Host $text -ForegroundColor $color }
function Title($text) { Write-Host ''; Write-Host $text -ForegroundColor White }

function Stop-Background {
  # stop any terra.pura server started from this install
  Get-CimInstance Win32_Process -Filter "Name='pythonw.exe' OR Name='python.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine -like "*$AppDir*serve.py*" } |
    ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force } catch {} }
}

function Test-PortFree([int]$p) {
  try { $l = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Any, $p); $l.Start(); $l.Stop(); return $true } catch { return $false }
}

function Get-LanIp {
  try {
    $ip = Get-NetIPConfiguration -ErrorAction Stop | Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } |
      Select-Object -First 1 -ExpandProperty IPv4Address | Select-Object -First 1 -ExpandProperty IPAddress
    if ($ip) { return $ip }
  } catch {}
  return $null
}

function Find-Python {
  # 1) the portable copy we installed before, 2) a real system Python 3.8+ (not the Microsoft Store stub)
  $portable = Join-Path $PyDir 'python.exe'
  if (Test-Path $portable) { return @{ exe = $portable; w = (Join-Path $PyDir 'pythonw.exe') } }
  # WindowsApps holds real Python shortcuts (Microsoft Store Python, Python install manager) and a stub that only opens the Store; only trust it if a Python Software Foundation app is installed
  $storePy = $null
  try { $storePy = Get-AppxPackage -Name 'PythonSoftwareFoundation.*' -ErrorAction SilentlyContinue } catch {}
  foreach ($cmd in @('py', 'python', 'python3')) {
    $c = Get-Command $cmd -ErrorAction SilentlyContinue
    if (-not $c) { continue }
    if ($c.Source -like '*WindowsApps*' -and -not $storePy) { continue }
    try {
      $args_ = if ($cmd -eq 'py') { @('-3', '-c') } else { @('-c') }
      # no double quotes in the code: Windows PowerShell 5.1 strips them when calling programs
      $exe = (& $c.Source @args_ 'import sys;print(sys.executable if sys.version_info>=(3,8) else 0)' 2>$null | Select-Object -First 1)
      if ($exe -and $exe.Trim() -ne '0' -and (Test-Path $exe.Trim())) {
        $exe = $exe.Trim(); $w = Join-Path (Split-Path $exe) 'pythonw.exe'
        if (-not (Test-Path $w)) { $w = $exe }
        return @{ exe = $exe; w = $w }
      }
    } catch {}
  }
  return $null
}

function Install-PortablePython {
  $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'amd64' }
  $url = "https://www.python.org/ftp/python/$PyVersion/python-$PyVersion-embed-$arch.zip"
  Say "  Downloading a portable Python $PyVersion from python.org (about 11 MB)..."
  $zip = Join-Path $env:TEMP "tp-python-$PyVersion.zip"
  Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
  if (Test-Path $PyDir) { Remove-Item $PyDir -Recurse -Force }
  Expand-Archive -Path $zip -DestinationPath $PyDir -Force
  Remove-Item $zip -Force
  return @{ exe = (Join-Path $PyDir 'python.exe'); w = (Join-Path $PyDir 'pythonw.exe') }
}

function Get-App {
  New-Item -ItemType Directory -Force -Path $Home_ | Out-Null
  if ($env:TP_SOURCE) {
    # testing: copy from a local folder instead of GitHub
    Say "  Copying from $($env:TP_SOURCE)..."
    if (Test-Path $AppDir) { Remove-Item $AppDir -Recurse -Force }
    Copy-Item -Path $env:TP_SOURCE -Destination $AppDir -Recurse
    return
  }
  Say "  Downloading terra.pura from github.com/$Repo..."
  $zip = Join-Path $env:TEMP 'tp-terrapura.zip'
  $tmp = Join-Path $env:TEMP 'tp-terrapura-extract'
  Invoke-WebRequest -Uri "https://codeload.github.com/$Repo/zip/refs/heads/$Branch" -OutFile $zip -UseBasicParsing
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
  Expand-Archive -Path $zip -DestinationPath $tmp -Force
  $src = Get-ChildItem $tmp -Directory | Select-Object -First 1 | ForEach-Object { Join-Path $_.FullName $Folder }
  if (-not (Test-Path (Join-Path $src 'serve.py'))) { throw "Couldn't find '$Folder' in the download." }
  if (Test-Path $AppDir) { Remove-Item $AppDir -Recurse -Force }
  Move-Item -Path $src -Destination $AppDir
  Remove-Item $tmp -Recurse -Force; Remove-Item $zip -Force
}

function Open-Firewall([int]$port) {
  # only needed for network access; asks Windows for permission once
  $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  $cmd = "Remove-NetFirewallRule -DisplayName '$RuleName' -ErrorAction SilentlyContinue; New-NetFirewallRule -DisplayName '$RuleName' -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow -Profile Private | Out-Null"
  try {
    if ($isAdmin) { Invoke-Expression $cmd }
    else {
      Say '  Windows will ask for permission to let other devices on your network reach terra.pura...' 'Yellow'
      Start-Process powershell -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList '-NoProfile', '-Command', $cmd
    }
    Say "  Firewall: allowed on private networks (port $port)." 'Green'
  } catch {
    Say '  Firewall rule skipped. If Windows shows a "Windows Defender Firewall" pop-up, tick Private networks and click Allow.' 'Yellow'
  }
}

function Wait-Server([int]$port) {
  for ($i = 0; $i -lt 40; $i++) {
    try { Invoke-WebRequest -Uri "http://127.0.0.1:$port/" -UseBasicParsing -TimeoutSec 2 | Out-Null; return $true } catch { Start-Sleep -Milliseconds 250 }
  }
  return $false
}

function Show-Urls([int]$port, [bool]$lan) {
  Title 'terra.pura is running'
  Say "  On this computer:   http://localhost:$port" 'Green'
  if ($lan) {
    $ip = Get-LanIp
    if ($ip) { Say "  On your network:    http://${ip}:$port  (phones, tablets and other computers on the same Wi-Fi)" 'Green' }
  }
}

function Remove-All {
  Title 'Removing terra.pura'
  Stop-Background
  if (Test-Path $Startup) { Remove-Item $Startup -Force; Say '  Removed it from startup.' }
  if (Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue) {
    try { Start-Process powershell -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList '-NoProfile', '-Command', "Remove-NetFirewallRule -DisplayName '$RuleName'"; Say '  Removed the firewall rule.' } catch { Say '  Firewall rule left in place (permission declined).' 'Yellow' }
  }
  if (Test-Path $Home_) { Remove-Item $Home_ -Recurse -Force; Say "  Deleted $Home_." }
  Say '  Done. Your farms were stored in your browser; clear them in terra.pura (Settings > Start over) or with your browser data.' 'Green'
}

# ------------------------------------------------------------------------------------------------
Write-Host ''
Write-Host '  terra' -NoNewline -ForegroundColor White; Write-Host '.' -NoNewline -ForegroundColor Green; Write-Host 'pura' -ForegroundColor White
Say '  Find out what''s worth growing on your land, using NASA Earth data.'

$mode = $env:TP_MODE
if (-not $mode) {
  Title 'How do you want to run it?'
  Say '  [1] Open it now, on this computer only             (default)'
  Say '  [2] Open it now, and share it on my network (LAN)   (phones and other computers on your Wi-Fi)'
  Say '  [3] Keep it running in the background 24/7         (starts when you log in)'
  Say '  [4] Keep it running 24/7 AND share it on my network'
  Say '  [5] Remove terra.pura from this computer'
  $choice = Read-Host '  Choose 1-5'
  $mode = switch ($choice) { '2' { 'lan' } '3' { 'always' } '4' { 'always-lan' } '5' { 'remove' } default { 'local' } }
}
if ($mode -eq 'remove') { Remove-All; return }

$lan = $mode -in @('lan', 'always-lan')
$always = $mode -in @('always', 'always-lan')
$bindHost = if ($lan) { '0.0.0.0' } else { '127.0.0.1' }

Title 'Getting everything ready'
Stop-Background
Get-App
$py = Find-Python
if ($py) { Say "  Using Python at $($py.exe)" } else { $py = Install-PortablePython }

$port = if ($env:TP_PORT) { [int]$env:TP_PORT } else { 5173 }
while (-not (Test-PortFree $port)) { $port++ }
if ($lan) { Open-Firewall $port }

$serve = Join-Path $AppDir 'serve.py'
$args_ = @("`"$serve`"", "$port", '--host', $bindHost)

if ($always) {
  # background server now, and again every time you log in
  if (Test-Path $Startup) { Remove-Item $Startup -Force }
  $ws = New-Object -ComObject WScript.Shell
  $lnk = $ws.CreateShortcut($Startup)
  $lnk.TargetPath = $py.w
  $lnk.Arguments = ($args_ + '--quiet') -join ' '
  $lnk.WorkingDirectory = $AppDir
  $lnk.Description = 'terra.pura local server'
  $lnk.Save()
  Start-Process -FilePath $py.w -ArgumentList ($args_ + '--quiet') -WorkingDirectory $AppDir -WindowStyle Hidden
  if (-not (Wait-Server $port)) { Say '  The server didn''t answer. Try option 1 to see any error messages.' 'Red'; return }
  Show-Urls $port $lan
  Say '  It now runs in the background and starts automatically whenever you log in to Windows.'
  Say '  To stop it and remove it, run the same command again and choose 5.'
  if (-not $env:TP_NOBROWSER) { Start-Process "http://localhost:$port" }
  return
}

# foreground: runs in this window until you press Ctrl+C
$proc = Start-Process -FilePath $py.exe -ArgumentList $args_ -WorkingDirectory $AppDir -NoNewWindow -PassThru
if (-not (Wait-Server $port)) { Say '  The server didn''t start. See the messages above.' 'Red'; return }
Show-Urls $port $lan
Say '  Keep this window open while you use it. Press Ctrl+C to stop.'
if (-not $env:TP_NOBROWSER) { Start-Process "http://localhost:$port" }
try { Wait-Process -Id $proc.Id } finally { if (-not $proc.HasExited) { Stop-Process -Id $proc.Id -Force } }
