@echo off
:: Self-elevates (shows the "allow this app" popup) then opens port 8811 for the phone app.
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting administrator permission...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo Opening port 8811 so your phone can reach this laptop over WiFi...
netsh advfirewall firewall add rule name="Ledger Records Backend" dir=in action=allow protocol=TCP localport=8811 profile=private,domain

echo.
echo Done. You can close this window now.
pause
