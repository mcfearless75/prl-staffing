@echo off
:: ─────────────────────────────────────────────────────────────────────────────
:: sync-audit-policies.bat
:: Runs the PRISM audit policy sync via Railway (pulls live env vars).
::
:: Setup in Windows Task Scheduler:
::   1. Open Task Scheduler → Create Basic Task
::   2. Trigger: Daily (or "On a schedule") — e.g. every 4 hours
::   3. Action: Start a program
::      Program: C:\Users\LAPTOP80\OneDrive - prlsitesolutions.co.uk\Desktop\prl_req\scripts\sync-audit-policies.bat
::   4. Tick "Run whether user is logged on or not"
::   5. Tick "Run with highest privileges"
::
:: Logs are written to scripts\sync-audit-policies.log
:: ─────────────────────────────────────────────────────────────────────────────

set SCRIPT_DIR=%~dp0
set LOG=%SCRIPT_DIR%sync-audit-policies.log
set PROJECT_DIR=%SCRIPT_DIR%..

echo [%DATE% %TIME%] Starting sync >> "%LOG%"

cd /d "%PROJECT_DIR%"
railway run node scripts/sync-audit-policies.mjs >> "%LOG%" 2>&1

if %ERRORLEVEL% EQU 0 (
    echo [%DATE% %TIME%] Sync completed OK >> "%LOG%"
) else (
    echo [%DATE% %TIME%] Sync FAILED with code %ERRORLEVEL% >> "%LOG%"
)
