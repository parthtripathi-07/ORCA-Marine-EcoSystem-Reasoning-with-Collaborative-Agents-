@echo off
title ORCA Marine Intelligence - Backend Server
echo ===================================================
echo   ORCA: Marine Intelligence Platform (ISRO SIH)
echo   Starting FastAPI Server on http://127.0.0.1:8000
echo ===================================================
cd /d "%~dp0backend"
if exist venv\Scripts\activate (
    call venv\Scripts\activate
)
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
