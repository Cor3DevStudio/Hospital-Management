@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================================================
REM Medical Center CMS — start frontend + API (TanStack Start) + MariaDB
REM Double-click or run from project root:  run-dev.bat
REM ============================================================================

cd /d "%~dp0"
title Medical Center CMS — Dev Server

echo.
echo ============================================================
echo   Medical Center CMS - Starting development environment
echo ============================================================
echo.

REM --------------------------------------------------------------------------
REM 1) Terminate existing connections / processes
REM --------------------------------------------------------------------------
echo [1/4] Terminating existing dev server connections...

call :KillPort 5173
call :KillPort 5174
call :KillPort 3000
call :KillPort 4173

REM Stop Node processes running from this project (vite / npm run dev)
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*modern-dev-tools*' } | ForEach-Object { Write-Host ('        Stopping Node PID ' + $_.ProcessId); Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

timeout /t 2 /nobreak >nul
echo        Done.
echo.

REM --------------------------------------------------------------------------
REM 2) Start MariaDB (database backend)
REM --------------------------------------------------------------------------
echo [2/4] Ensuring MariaDB is running...

set "DB_STARTED=0"
for %%S in (MariaDB MySQL MySQL80 mariadb) do (
  if "!DB_STARTED!"=="0" (
    sc query "%%S" >nul 2>&1
    if not errorlevel 1 (
      sc query "%%S" | findstr /i "RUNNING" >nul 2>&1
      if not errorlevel 1 (
        echo        Service "%%S" is already running.
        set "DB_STARTED=1"
      ) else (
        echo        Starting service "%%S"...
        net start "%%S" >nul 2>&1
        if not errorlevel 1 (
          echo        Service "%%S" started.
          set "DB_STARTED=1"
        )
      )
    )
  )
)

if "!DB_STARTED!"=="0" (
  echo        WARNING: Could not start MariaDB/MySQL Windows service.
  echo        Start it manually in HeidiSQL or Windows Services, then retry.
)
echo.

REM --------------------------------------------------------------------------
REM 2b) Ensure database schema (drop + install only when a table is missing)
REM --------------------------------------------------------------------------
echo [3/4] Checking database schema...

where npm >nul 2>&1
if errorlevel 1 (
  echo        WARNING: npm not found — skipping database check.
  goto :SkipDbEnsure
)

if not exist "node_modules\" (
  echo        Installing dependencies for database check...
  call npm install >nul 2>&1
)

call npm run db:ensure
if errorlevel 1 (
  echo        WARNING: Database setup failed. Check .env and MariaDB credentials.
  echo        You can retry with:  npm run db:seed
) else (
  echo        Database check complete.
)
:SkipDbEnsure
echo.

REM --------------------------------------------------------------------------
REM 3) Start frontend + API server
REM    TanStack Start runs UI + /api routes in one process (npm run dev)
REM --------------------------------------------------------------------------
echo [4/4] Starting frontend + API server...
echo.
echo   App URL:    http://localhost:5174
echo   DB health:  http://localhost:5174/api/health/db
echo   Press Ctrl+C to stop.
echo.
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

call npm run dev

echo.
echo Dev server stopped.
pause
exit /b 0

REM --------------------------------------------------------------------------
REM Kill any process listening on a TCP port (never kills MariaDB 3306)
REM --------------------------------------------------------------------------
:KillPort
set "PORT=%~1"
if "%PORT%"=="" goto :eof
if "%PORT%"=="3306" goto :eof

for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":%PORT% " ^| findstr "LISTENING"') do (
  if not "%%a"=="0" (
    echo        Port %PORT% - terminating PID %%a
    taskkill /F /PID %%a >nul 2>&1
  )
)
goto :eof
