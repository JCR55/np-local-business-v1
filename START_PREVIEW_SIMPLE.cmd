@echo off
setlocal
cd /d "%~dp0"
set PORT=3000
echo Starting NP Local Business preview...
echo.
echo Leave this window open while previewing.
echo.
echo Open:
echo http://localhost:3000/
echo.
node "%~dp0preview-server.mjs"
pause
