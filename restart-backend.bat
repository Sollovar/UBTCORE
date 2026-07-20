@echo off
echo ========================================
echo Restarting UNBOUND Backend
echo ========================================
echo.
echo Building backend...
cd backend
go build -o backend.exe ./cmd/api
if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    pause
    exit /b 1
)
echo Build successful!
echo.
echo Starting backend on port 8080...
echo Press Ctrl+C to stop
echo.
backend.exe
