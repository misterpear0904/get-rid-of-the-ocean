@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install the LTS release from https://nodejs.org
  pause
  exit /b 1
)
start "Lastdrop game server" /min node server.mjs
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:5177"
