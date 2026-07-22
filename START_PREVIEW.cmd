@echo off
setlocal
cd /d "%~dp0"
set PORT=3000
echo Starting NP Local Business preview...
echo.
echo Open this address in your browser:
echo http://localhost:3000/
echo.
node "%~dp0..\..\work\serve-current-folder.mjs"
pause
