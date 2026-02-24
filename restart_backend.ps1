# Kill all running uvicorn/python instances for this project
Write-Output "Stopping all uvicorn instances..."
Get-WmiObject Win32_Process | Where-Object {
    $_.CommandLine -like "*uvicorn*" -or ($_.CommandLine -like "*multiprocessing.spawn*" -and $_.CommandLine -like "*python*")
} | ForEach-Object {
    Write-Output "  Killing PID $($_.ProcessId)"
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}

Start-Sleep -Seconds 2

# Check port 8000 is free
$check = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($check) {
    Write-Output "Port 8000 still in use by PID $($check.OwningProcess), killing..."
    Stop-Process -Id $check.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

Write-Output "Starting backend..."
Set-Location C:\elev\backend
& "C:\elev\backend\venv\Scripts\python.exe" -m uvicorn app.main:app --reload --port 8000
