param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

Write-Host "This will save your Gemini API key to .env.local in this project only."
Write-Host "The key will not be printed here."

$secureKey = Read-Host "Paste Gemini API Key" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)

try {
  $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  if (-not $plainKey -or -not $plainKey.Trim()) {
    throw "Gemini API key is empty."
  }

  $envPath = Join-Path $ProjectRoot ".env.local"
  Set-Content -LiteralPath $envPath -Value "GEMINI_API_KEY=$($plainKey.Trim())" -Encoding UTF8

  Write-Host ""
  Write-Host "Saved: $envPath"
  Write-Host "Now restart the courseware server:"
  Write-Host "  node .\server.js"
  Write-Host ""
  Write-Host "Then check:"
  Write-Host "  http://localhost:3000/api/status"
} finally {
  if ($bstr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}
