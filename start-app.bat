@echo off
setlocal
set ROOT=%~dp0

where mongod >nul 2>nul
if %errorlevel%==0 (
  set MONGO_EXE=mongod
) else (
  set MONGO_EXE="C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe"
)

set DBPATH=%ROOT%data\db
set LOGDIR=%ROOT%data\log
if not exist "%DBPATH%" mkdir "%DBPATH%"
if not exist "%LOGDIR%" mkdir "%LOGDIR%"

echo Starting MongoDB (local, offline)...
start "Ledger MongoDB" %MONGO_EXE% --dbpath "%DBPATH%" --logpath "%LOGDIR%\mongod.log" --port 27017 --bind_ip 127.0.0.1

timeout /t 3 /nobreak >nul

echo Starting Backend Server...
start "Ledger Backend" cmd /k "cd /d "%ROOT%backend" && npm start"

timeout /t 2 /nobreak >nul

echo Starting Frontend...
start "Ledger Frontend" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

timeout /t 4 /nobreak >nul

start http://localhost:5173

echo.
echo All services started in separate windows.
echo Keep the "Ledger MongoDB", "Ledger Backend" and "Ledger Frontend" windows open while using the app.
echo Close this window any time.
pause
