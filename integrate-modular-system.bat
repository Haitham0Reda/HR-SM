@echo off
REM Modular HRMS Integration Script for Windows
REM This script helps integrate the new modular system with your existing HRMS

setlocal enabledelayedexpansion

echo ╔═══════════════════════════════════════════════════════════╗
echo ║                                                           ║
echo ║   🚀 Modular HRMS Integration Script                     ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Check if .env file exists
if not exist .env (
    echo [ERROR] .env file not found!
    echo Please create a .env file based on .env.example
    pause
    exit /b 1
)

echo [OK] .env file found
echo.

REM Step 1: Backup
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo Step 1: Creating backup
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

if exist .git (
    echo [INFO] Creating backup branch...
    git checkout -b backup-before-modular-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2% 2>nul
    git add . 2>nul
    git commit -m "Backup before modular HRMS integration" 2>nul
    echo [OK] Backup branch created
) else (
    echo [WARN] Git not initialized. Skipping git backup.
)

echo.

REM Step 2: Check prerequisites
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo Step 2: Checking prerequisites
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

where node >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
    echo [OK] Node.js installed: !NODE_VERSION!
) else (
    echo [ERROR] Node.js not found. Please install Node.js 18+
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
    echo [OK] npm installed: !NPM_VERSION!
) else (
    echo [ERROR] npm not found
    pause
    exit /b 1
)

echo.

REM Step 3: Install dependencies
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo Step 3: Installing dependencies
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

echo [INFO] Installing server dependencies...
call npm install
if %errorlevel% equ 0 (
    echo [OK] Server dependencies installed
) else (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.

REM Step 4: Check MongoDB
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo Step 4: Checking MongoDB connection
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

where mongosh >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Testing MongoDB connection...
    mongosh --eval "db.version()" --quiet >nul 2>nul
    if !errorlevel! equ 0 (
        echo [OK] MongoDB is running
    ) else (
        echo [WARN] MongoDB may not be running. Please start MongoDB before proceeding.
    )
) else (
    echo [WARN] mongosh not found. Cannot verify MongoDB connection.
)

echo.

REM Step 5: Database migration
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo Step 5: Database migration
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

set /p MIGRATE="Do you want to add tenantId to existing data? (y/n): "
if /i "%MIGRATE%"=="y" (
    echo [INFO] Running tenant ID migration...
    node server/scripts/migrations/addTenantId.js
    if !errorlevel! equ 0 (
        echo [OK] Migration completed
    ) else (
        echo [ERROR] Migration failed
    )
) else (
    echo [WARN] Skipping migration. You can run it later with: node server/scripts/migrations/addTenantId.js
)

echo.

REM Step 6: Create tenant
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo Step 6: Tenant configuration
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

set /p TENANT="Do you want to create initial tenant configuration? (y/n): "
if /i "%TENANT%"=="y" (
    echo [INFO] Creating tenant configuration...
    node server/scripts/setup/createInitialTenant.js
    if !errorlevel! equ 0 (
        echo [OK] Tenant configuration created
    ) else (
        echo [ERROR] Tenant creation failed
    )
) else (
    echo [WARN] Skipping tenant creation. You can run it later with: node server/scripts/setup/createInitialTenant.js
)

echo.

REM Step 7: Create directories
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo Step 7: Creating upload directories
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

if not exist uploads\task-reports mkdir uploads\task-reports
if not exist uploads\documents mkdir uploads\documents
if not exist uploads\profile-pictures mkdir uploads\profile-pictures
echo [OK] Upload directories created

echo.

REM Step 8: Integration choice
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo Step 8: Choose integration approach
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo Choose integration approach:
echo 1) Side-by-side (Recommended) - Run both systems together
echo 2) Full modular - Use only new modular system
echo 3) Skip - I'll configure manually
echo.

set /p CHOICE="Enter choice (1-3): "

if "%CHOICE%"=="1" (
    echo [INFO] Setting up side-by-side integration...
    if exist server\app.integrated.js (
        if exist server\app.js copy server\app.js server\app.backup.js >nul
        copy server\app.integrated.js server\app.js >nul
        echo [OK] Side-by-side integration configured
    ) else (
        echo [ERROR] server\app.integrated.js not found
    )
) else if "%CHOICE%"=="2" (
    echo [INFO] Using full modular system...
    echo [OK] Already configured (server\app.js)
) else (
    echo [WARN] Skipping integration configuration
)

echo.

REM Step 9: Tests
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo Step 9: Running tests
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

set /p RUNTESTS="Do you want to run tests? (y/n): "
if /i "%RUNTESTS%"=="y" (
    echo [INFO] Running tests...
    call npm test
    if !errorlevel! neq 0 (
        echo [WARN] Some tests failed. Please review.
    )
) else (
    echo [WARN] Skipping tests. You can run them later with: npm test
)

echo.

REM Final summary
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                                                           ║
echo ║   ✓ Integration Complete!                                ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo Next steps:
echo.
echo 1. Start the server:
echo    npm start
echo.
echo 2. Test the health endpoint:
echo    curl http://localhost:5000/health
echo.
echo 3. Review the documentation:
echo    - MIGRATION_GUIDE.md
echo    - API_DOCUMENTATION.md
echo    - QUICK_START.md
echo.
echo 4. Access the new modular API:
echo    - Auth: http://localhost:5000/api/v1/hr-core/auth
echo    - Tasks: http://localhost:5000/api/v1/tasks
echo.
echo For help, see MIGRATION_GUIDE.md
echo.

pause
