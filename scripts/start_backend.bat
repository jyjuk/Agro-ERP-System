@echo off
echo === Starting Agro ERP Backend ===
cd C:\elev\backend
call venv\Scripts\activate
uvicorn app.main:app --host localhost --port 8000 --reload
pause
