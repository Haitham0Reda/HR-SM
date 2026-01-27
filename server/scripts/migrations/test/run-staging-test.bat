@echo off
REM ###############################################################################
REM Staging Migration Test Runner (Windows)
REM
REM This script executes the comprehensive staging migration test suite.
REM It sets up the environment, runs all test phases, and generates reports.
REM
REM Usage:
REM   run-staging-test.bat
REM
REM Requirements: 2.1, 2.5, 2.6, 7.5, 12.1, 12.2, 12.3
REM ###############################################################################

setlocal enabledelayedexpansion

REM Get script directory and project root
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..\..\..\..

REM Display header
echo ================================================================================
echo                     STAGING MIGRATION TEST SUITE
echo ================================================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
  echo Error: Node.js is not installed
  exit /b 1
)

REM Check if .env file exists
if not exist "%PROJECT_ROOT%\server\.env" (
  echo Error: .env file not found
  echo Please create server\.env with database configuration
  exit /b 1
)

REM Display test configuration
echo Test Configuration:
echo   Project Root: %PROJECT_ROOT%
echo.

REM Confirm execution
echo WARNING: This will execute a full migration test in staging
echo          This includes running the migration and testing rollback
echo.
set /p CONFIRM="Do you want to continue? (y/N): "

if /i not "%CONFIRM%"=="y" (
  echo Test cancelled by user
  exit /b 0
)

REM Change to project root
cd /d "%PROJECT_ROOT%"

REM Create logs directory if it doesn't exist
if not exist "logs\migrations\staging-tests" mkdir "logs\migrations\staging-tests"

REM Run the test suite
echo.
echo Starting test suite...
echo.

REM Execute the Node.js test script
node server\scripts\migrations\test\staging-migration-test.js

REM Capture exit code
set TEST_EXIT_CODE=%ERRORLEVEL%

REM Display results
echo.
if %TEST_EXIT_CODE% equ 0 (
  echo [32m✓ Test suite completed successfully[0m
) else (
  echo [31m✗ Test suite failed with exit code %TEST_EXIT_CODE%[0m
)

REM Display report location
echo.
echo Test reports available in:
echo   logs\migrations\staging-tests\
echo.

exit /b %TEST_EXIT_CODE%
