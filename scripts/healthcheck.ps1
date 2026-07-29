$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root
$Port = if ($env:HTTP_PORT) { $env:HTTP_PORT } else { '8080' }
$Url = "http://127.0.0.1:$Port/api/health"
for ($attempt = 1; $attempt -le 30; $attempt++) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing $Url
    if ($response.StatusCode -eq 200) { $response.Content; exit 0 }
  } catch {}
  Start-Sleep -Seconds 2
}
docker compose ps
docker compose logs --tail=80 backend
exit 1
