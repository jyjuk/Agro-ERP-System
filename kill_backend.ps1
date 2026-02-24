# Kill ALL uvicorn/python processes related to this project
Write-Output "Killing all uvicorn instances..."

$procs = Get-WmiObject Win32_Process | Where-Object {
    $_.CommandLine -like "*uvicorn*" -or
    ($_.CommandLine -like "*multiprocessing.spawn*" -and $_.CommandLine -like "*python*")
}

foreach ($p in $procs) {
    Write-Output "  Killing PID=$($p.ProcessId)"
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2

# Double-check port 8000
$conn = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($conn) {
    Write-Output "Force killing PID=$($conn.OwningProcess) still on port 8000"
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
}

Write-Output "Done. Now run: cd C:\elev\backend && venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"
