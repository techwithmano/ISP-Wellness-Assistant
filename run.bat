@echo off
REM ManoMed AI - One-Click Launcher

echo.
echo ============================================
echo     ManoMed AI - Starting Application
echo ============================================
echo.

REM Check if Node.js is installed
node -v >nul 2>&1
if errorlevel 1 (
    echo Node.js not found. Installing from winget...
    echo.
    winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
    
    REM Refresh PATH for this session
    set "PATH=%PATH%;C:\Program Files\nodejs"
    
    REM Verify installation
    node -v >nul 2>&1
    if errorlevel 1 (
        echo.
        echo ERROR: Node.js installation failed.
        echo Please restart your computer and try again.
        echo.
        pause
        exit /b 1
    )
    
    echo Node.js installed successfully!
    echo.
)

echo Checking project dependencies...
if not exist "node_modules" goto install_deps
goto start_app

:install_deps
echo Installing dependencies (this may take a few minutes)...
call npm install
if errorlevel 1 (
    echo.
    echo ERROR: Failed to install dependencies.
    echo.
    pause
    exit /b 1
)

:start_app
echo.
echo Starting the application...
echo.
echo ============================================
echo The app will open at: http://localhost:9003
echo Press Ctrl+C to stop the server
echo ============================================
echo.

call npm run dev
pause
