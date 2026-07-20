@echo off
echo ====================================
echo Starting UNBOUND Price-Worker
echo ====================================
echo.
cd price-worker
echo Running: node index.js
echo Database: localhost:55422
echo Interval: 39 seconds
echo.
node index.js
