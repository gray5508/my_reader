$ErrorActionPreference = 'Stop'
$readerRoot = Join-Path $PSScriptRoot 'reader-web'
$npmCommand = (Get-Command npm.cmd -ErrorAction Stop).Source

Push-Location $readerRoot
try {
    if (-not (Test-Path -LiteralPath (Join-Path $readerRoot 'node_modules'))) {
        Write-Host '首次启动，正在安装阅读器依赖……'
        & $npmCommand install
        if ($LASTEXITCODE -ne 0) { throw '阅读器依赖安装失败。' }
    }

    $browserJob = Start-Job -ScriptBlock {
        $readerUrl = 'http://localhost:3000/'
        for ($attempt = 0; $attempt -lt 60; $attempt++) {
            try {
                $response = Invoke-WebRequest -UseBasicParsing -Uri $readerUrl -TimeoutSec 1
                if ($response.StatusCode -eq 200) {
                    Start-Process $readerUrl
                    return
                }
            } catch {
                Start-Sleep -Milliseconds 500
            }
        }
    }

    Write-Host '阅读器启动后会自动打开浏览器。关闭此窗口或按 Ctrl+C 可停止。'
    & $npmCommand run dev
} finally {
    if ($browserJob) { Remove-Job -Job $browserJob -Force -ErrorAction SilentlyContinue }
    Pop-Location
}
