# Network Portal refresh — scrape every source, rebuild web/public/jobs.json, redeploy to Vercel.
# Run manually:  powershell -ExecutionPolicy Bypass -File D:\network-portal\refresh.ps1
# Uses the local Vercel CLI login (no token needed). Output is logged to refresh-last.log.

$ErrorActionPreference = 'SilentlyContinue'
$log = 'D:\network-portal\refresh-last.log'
$py  = 'D:\network-portal\.venv\Scripts\python.exe'

"=== Network Portal refresh started $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File $log -Encoding utf8
$env:PYTHONPATH = 'D:\network-portal'
$env:PYTHONIOENCODING = 'utf-8'

& $py D:\network-portal\poll.py --seed *>> $log
& $py D:\network-portal\export.py      *>> $log
& $py D:\network-portal\ledger.py      *>> $log

Set-Location 'D:\network-portal\web'
& npx --yes vercel@latest --prod --yes *>> $log
Set-Location 'D:\network-portal'

"=== Network Portal refresh finished $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File $log -Append -Encoding utf8
