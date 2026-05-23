$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$envPath = Join-Path $projectRoot ".env.local"

function Test-GeminiKeyConfigured {
  if (-not (Test-Path -LiteralPath $envPath)) {
    return $false
  }

  $content = Get-Content -LiteralPath $envPath -Raw -Encoding UTF8
  return $content -match "(?m)^\s*(GEMINI_API_KEY|GOOGLE_API_KEY)\s*=\s*\S+"
}

function Stop-ExistingCoursewareServer {
  $connection = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $connection) {
    return
  }

  $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$($connection.OwningProcess)"
  if (-not $processInfo) {
    throw "Port 3000 is already in use, but the process could not be inspected."
  }

  $commandLine = [string]$processInfo.CommandLine
  if ($commandLine -match "node(\.exe)?[`" ]+.*server\.js") {
    Write-Host "Stopping old courseware server on port 3000..."
    Stop-Process -Id $connection.OwningProcess -Force
    Start-Sleep -Milliseconds 500
    return
  }

  throw "Port 3000 is already in use by another process: $commandLine"
}

if (-not (Test-GeminiKeyConfigured)) {
  Write-Host "First launch: save Gemini API Key to local .env.local."
  Write-Host "The key will be hidden while typing."

  $secureKey = Read-Host "Gemini API Key" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)

  try {
    $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    if (-not $plainKey -or -not $plainKey.Trim()) {
      throw "Gemini API Key cannot be empty."
    }

    Set-Content -LiteralPath $envPath -Value "GEMINI_API_KEY=$($plainKey.Trim())" -Encoding UTF8
    Write-Host "Saved to local .env.local."
  } finally {
    if ($bstr -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
  }
}

Write-Host "Starting courseware server: http://localhost:3000"
Set-Location -LiteralPath $projectRoot
Stop-ExistingCoursewareServer
node .\server.js
