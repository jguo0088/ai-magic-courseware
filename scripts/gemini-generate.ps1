param(
  [string]$InputPath
)

$ErrorActionPreference = "Stop"
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

if ($InputPath) {
  $inputJson = Get-Content -LiteralPath $InputPath -Raw -Encoding UTF8
} else {
  $inputJson = [Console]::In.ReadToEnd()
}
$request = $inputJson | ConvertFrom-Json
$apiKey = $env:GEMINI_API_KEY

if (-not $apiKey) {
  $apiKey = $env:GOOGLE_API_KEY
}

if (-not $apiKey) {
  throw "GEMINI_API_KEY is not configured."
}

$model = [string]$request.model
if (-not $model) {
  if ([string]$request.mode -eq "image") {
    $model = "gemini-3.1-flash-image-preview"
  } else {
    $model = "gemini-2.5-flash"
  }
}

$body = @{
  contents = @(
    @{
      parts = @(
        @{
          text = [string]$request.prompt
        }
      )
    }
  )
}

if ([string]$request.mode -eq "image") {
  $body.generationConfig = @{
    responseModalities = @("TEXT", "IMAGE")
  }
}

$body = $body | ConvertTo-Json -Depth 20
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)

try {
  $response = Invoke-RestMethod `
    -Uri "https://generativelanguage.googleapis.com/v1beta/models/$model`:generateContent?key=$apiKey" `
    -Method Post `
    -ContentType "application/json; charset=utf-8" `
    -Body $bodyBytes

  $response | ConvertTo-Json -Depth 40 -Compress
} catch {
  $status = 500
  $message = $_.Exception.Message

  if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
    $message = $_.ErrorDetails.Message
  }

  if ($_.Exception.Response) {
    $status = [int]$_.Exception.Response.StatusCode
  }

  [Console]::Error.WriteLine($message)
  exit $status
}
