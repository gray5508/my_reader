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
$bookPythonCandidates += 'C:/Users/cicii/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
$bookPythonExecutable = $null
foreach ($bookPythonCandidate in ($bookPythonCandidates | Select-Object -Unique)) {
    if (Test-Path -LiteralPath $bookPythonCandidate -PathType Leaf) {
        try {
            & $bookPythonCandidate -c 'import pypdf' 2>$null
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
    throw 'No usable Python with pypdf found. Install Python 3.11+ and run: python -m pip install pypdf'
}
& $bookPythonExecutable (Join-Path $PSScriptRoot 'book_source.py') @BookArguments
exit $LASTEXITCODE
