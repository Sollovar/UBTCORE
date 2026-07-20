@echo off
echo ========================================
echo Rebuilding UNBOUND Frontend
echo ========================================
echo.
echo This will rebuild the frontend with the fix for:
echo - Volume disappearing
echo - Exchange prices being overridden
echo.
cd artifacts\dex
echo Installing dependencies (if needed)...
call npm install
echo.
echo Building frontend...
call npm run build
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Hard refresh your browser: Ctrl+Shift+R
    echo 2. Clear browser cache if needed
    echo 3. Test volume persistence
    echo 4. Test exchange price independence
    echo.
) else (
    echo.
    echo BUILD FAILED!
    echo Check the error messages above.
    echo.
)
pause
