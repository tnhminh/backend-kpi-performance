$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker is required. Install Docker Desktop or Docker Engine first.'
}

if (-not (Test-Path .env)) {
  Copy-Item .env.production.example .env
  Write-Host 'Created .env. Set POSTGRES_PASSWORD and Jira values, then run this script again.'
  exit 2
}

$envLines = Get-Content .env | Where-Object { $_ -and -not $_.StartsWith('#') }
foreach ($line in $envLines) {
  $pair = $line -split '=', 2
  if ($pair.Count -eq 2) { [Environment]::SetEnvironmentVariable($pair[0], $pair[1]) }
}

if ($env:POSTGRES_PASSWORD -eq 'replace-with-a-long-random-password' -or [string]::IsNullOrWhiteSpace($env:POSTGRES_PASSWORD)) {
  throw 'Set a strong POSTGRES_PASSWORD in .env before deploying.'
}

docker compose pull db redis
docker compose build --pull
docker compose up -d
docker compose ps
& "$Root\scripts\healthcheck.ps1"
