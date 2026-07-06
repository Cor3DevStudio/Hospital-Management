@echo off
setlocal EnableExtensions

REM ============================================================================
REM Medical Center CMS — full database setup (schema + users + demo data)
REM Double-click or run from project root:  run-db-setup.bat
REM
REM Logic (same as npm run db:ensure):
REM   - All 6 tables exist  → skip DROP, only refresh seeds
REM   - Any table missing  → DROP database once, run install_all.sql, then seed
REM ============================================================================

cd /d "%~dp0"
title Medical Center CMS — Database Setup

echo.
echo ============================================================
echo   Medical Center CMS - Database setup
echo ============================================================
echo.

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm not found. Install Node.js and add it to PATH.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
  )
)

echo Running database ensure + seed...
echo.
call npm run db:seed
if errorlevel 1 (
  echo.
  echo ERROR: Database setup failed. Check MariaDB is running and .env credentials.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo   Database setup finished successfully.
echo   Default login: admin / admin123
echo ============================================================
echo.
pause
exit /b 0
