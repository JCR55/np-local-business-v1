@echo off
cd /d "%~dp0"
echo Pushing NP Local Business to GitHub...
echo.
git push -u origin main
echo.
echo If GitHub asks you to sign in, complete the browser sign-in window, then return here.
echo.
pause
