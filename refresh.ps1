# DOD US refresh — scrape every source, rebuild web/public/jobs.json, redeploy to Vercel.
# Run manually:  powershell -ExecutionPolicy Bypass -File D:\dod-usa\refresh.ps1
# Uses the local Vercel CLI login (no token needed). Output is logged to refresh-last.log.

$ErrorActionPreference = 'SilentlyContinue'
$log = 'D:\dod-usa\refresh-last.log'
$py  = 'D:\dod-usa\.venv\Scripts\python.exe'

"=== DOD US refresh started $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File $log -Encoding utf8
$env:PYTHONPATH = 'D:\dod-usa'
$env:PYTHONIOENCODING = 'utf-8'

& $py D:\dod-usa\poll.py --seed *>> $log
& $py D:\dod-usa\export.py      *>> $log
& $py D:\dod-usa\ledger.py      *>> $log

Set-Location 'D:\dod-usa\web'
& npx --yes vercel@latest --prod --yes *>> $log
Set-Location 'D:\dod-usa'

"=== DOD US refresh finished $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File $log -Append -Encoding utf8
