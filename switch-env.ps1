param(
    [Parameter(Position = 0)]
    [ValidateSet("local", "prod", "")]
    [string]$Mode = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

$LOCAL_API = "http://localhost:3000"
$PROD_API = "https://justpoker-api.onrender.com"

function Show-Status {
    $clientEnv = Join-Path $root "client\.env"
    $serverEnv = Join-Path $root "server\.env"

    Write-Host ""
    Write-Host "=== JustPoker Environment Status ===" -ForegroundColor Cyan
    Write-Host ""

    if (Test-Path $clientEnv) {
        $apiLine = Get-Content $clientEnv | Where-Object { $_ -match "VITE_API_BASE_URL" }
        if ($apiLine -match "localhost") {
            Write-Host "  Client:  LOCAL  (localhost:3000)" -ForegroundColor Yellow
        } else {
            Write-Host "  Client:  PROD   (justpoker-api.onrender.com)" -ForegroundColor Green
        }
    } else {
        Write-Host "  Client:  not configured" -ForegroundColor Red
    }

    if (Test-Path $serverEnv) {
        $corsLine = Get-Content $serverEnv | Where-Object { $_ -match "CORS_ORIGIN" }
        if ($corsLine -match "localhost") {
            Write-Host "  Server:  LOCAL  (CORS_ORIGIN=localhost:5173)" -ForegroundColor Yellow
        } else {
            Write-Host "  Server:  PROD   (CORS_ORIGIN=just-poker.vercel.app)" -ForegroundColor Green
        }
    } else {
        Write-Host "  Server:  not configured" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Gray
    Write-Host "  .\switch-env.ps1 local   # switch to local dev" -ForegroundColor Gray
    Write-Host "  .\switch-env.ps1 prod    # switch to production" -ForegroundColor Gray
    Write-Host ""
}

function Switch-ToLocal {
    Write-Host ""
    Write-Host ">>> Switching to [LOCAL] environment" -ForegroundColor Yellow
    Write-Host ""

    $clientEnv = Join-Path $root "client\.env"
    $content1 = "VITE_API_BASE_URL=$LOCAL_API"
    $content2 = "VITE_WS_URL=$LOCAL_API"
    Set-Content -Path $clientEnv -Value "$content1`n$content2" -Encoding UTF8
    Write-Host "  [OK] client/.env" -ForegroundColor Green

    $serverEnv = Join-Path $root "server\.env"
    $lines = @(
        "# Supabase (not needed for local dev - uses in-memory storage)",
        "SUPABASE_URL=",
        "SUPABASE_ANON_KEY=",
        "",
        "# Server",
        "PORT=3000",
        "NODE_ENV=development",
        "CORS_ORIGIN=http://localhost:5173"
    )
    Set-Content -Path $serverEnv -Value ($lines -join "`n") -Encoding UTF8
    Write-Host "  [OK] server/.env" -ForegroundColor Green

    Write-Host ""
    Write-Host "Done. Run: npm run dev" -ForegroundColor Cyan
    Write-Host ""
}

function Switch-ToProd {
    Write-Host ""
    Write-Host ">>> Switching to [PRODUCTION] environment" -ForegroundColor Green
    Write-Host ""

    $clientEnv = Join-Path $root "client\.env"
    $content1 = "VITE_API_BASE_URL=$PROD_API"
    $content2 = "VITE_WS_URL=$PROD_API"
    Set-Content -Path $clientEnv -Value "$content1`n$content2" -Encoding UTF8
    Write-Host "  [OK] client/.env" -ForegroundColor Green

    $serverEnv = Join-Path $root "server\.env"
    $lines = @(
        "# Supabase",
        "SUPABASE_URL=your-supabase-url",
        "SUPABASE_ANON_KEY=your-supabase-key",
        "",
        "# Server",
        "PORT=3000",
        "NODE_ENV=production",
        "CORS_ORIGIN=https://just-poker.vercel.app"
    )
    Set-Content -Path $serverEnv -Value ($lines -join "`n") -Encoding UTF8
    Write-Host "  [OK] server/.env" -ForegroundColor Green

    Write-Host ""
    Write-Host "Done. Fill in SUPABASE credentials in server/.env" -ForegroundColor Magenta
    Write-Host "Push to GitHub to trigger Render/Vercel deploy" -ForegroundColor Magenta
    Write-Host ""
}

switch ($Mode) {
    "local" { Switch-ToLocal }
    "prod"  { Switch-ToProd }
    default { Show-Status }
}
