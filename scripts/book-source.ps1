param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$BookArguments
)

$ErrorActionPreference = 'Stop'
$bookPythonCandidates = @()
$bookPythonCommand = Get-Command python.exe -ErrorAction SilentlyContinue
if ($bookPythonCommand -and $bookPythonCommand.Source -notlike '*\WindowsApps\*') {
    $bookPythonCandidates += $bookPythonCommand.Source
}
$bookPythonCandidates += (Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe')
$bookPythonExecutable = $null
foreach ($bookPythonCandidate in ($bookPythonCandidates | Select-Object -Unique)) {
    if (Test-Path -LiteralPath $bookPythonCandidate -PathType Leaf) {
        try {
            & $bookPythonCandidate -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)' 2>$null
        } catch {
            continue
        }
        if ($LASTEXITCODE -eq 0) {
            $bookPythonExecutable = $bookPythonCandidate
            break
        }
    }
}
if (-not $bookPythonExecutable) {
    throw 'No usable Python 3.11+ found.'
}
& $bookPythonExecutable (Join-Path $PSScriptRoot 'book_source.py') @BookArguments
exit $LASTEXITCODE
