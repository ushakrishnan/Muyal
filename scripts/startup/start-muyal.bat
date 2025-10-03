@echo off
echo Starting Muyal Agent and Playground...
echo ===============================================

REM Check if configuration exists
if not exist ".env" (
    echo ERROR: Configuration file not found: .env
    echo Please copy .env.example to .env and configure your AI providers
    pause
    exit /b 1
)

REM Kill existing node processes
echo Cleaning up existing Node.js processes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 >nul

REM Start playground in background
echo Starting Microsoft 365 Agents Playground...
start "Muyal Playground" cmd /k "npm run dev:teamsfx:launch-playground"

REM Wait for playground to start
timeout /t 5

REM Start agent application in background  
echo Starting Muyal agent application...
start "Muyal Agent" cmd /k "npm run dev:teamsfx:playground"

echo.
echo Muyal Agent Startup Complete!
echo =================================
echo Services should now be running in separate windows:
echo   • Microsoft 365 Playground: http://localhost:56150 (Teams testing)
echo   • Web Chat Interface: http://localhost:3978 (Direct web chat)
echo   • Agent API: Running on port 3978
echo.
echo Waiting for services to start up...
echo Playground will auto-open. Opening web interface in 15 seconds...
timeout /t 15

echo Opening Web Chat Interface...
start http://localhost:3978

echo.
echo SUCCESS! Both interfaces available!
echo   • Microsoft 365 Playground: http://localhost:56150 (Auto-opened by service)
echo   • Web Chat Interface: http://localhost:3978 (Just opened)
echo.
echo TIP: If pages don't load immediately, wait a moment for services to fully start
echo.
echo To stop: Close both command windows (Muyal Playground and Muyal Agent)
echo.
pause