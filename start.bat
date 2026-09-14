@echo off
TITLE VETO-DualKernel Launcher
echo ============================================================
echo   VETO-DualKernel: Zero-Trust Execution for Agentic Finance
echo ============================================================
echo.

cd /d D:\Veto

echo [1/3] Starting Unified Backend & Web Application on http://localhost:8000...
start "VETO-Backend" cmd /k "set PYTHONPATH=D:\Veto && python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000"

echo [2/3] Starting Vite Dev Server on http://localhost:5173...
start "VETO-Frontend" cmd /k "npm run dev"

echo [3/3] Opening browser...
timeout /t 3 >nul
start http://localhost:8000

echo.
echo ============================================================
echo VETO-DualKernel system is now running!
echo Unified Web Console: http://localhost:8000
echo Vite Dev Server:    http://localhost:5173
echo ============================================================
pause
