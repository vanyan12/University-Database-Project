@echo off
setlocal

REM ==========================================
REM Start front-end and API in separate windows
REM ==========================================

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"
set "API_DIR=%ROOT_DIR%\api"
set "VENV_PYTHON=%API_DIR%\.venv\Scripts\python.exe"
set "REQUIREMENTS_FILE=%API_DIR%\requirements.txt"

if not exist "%FRONTEND_DIR%" (
	echo Frontend directory not found: %FRONTEND_DIR%
	pause
	exit /b 1
)

if not exist "%API_DIR%" (
	echo API directory not found: %API_DIR%
	pause
	exit /b 1
)

echo Installing frontend dependencies...
call npm --prefix "%FRONTEND_DIR%" install
if errorlevel 1 (
	echo Failed to install frontend dependencies.
	pause
	exit /b 1
)

echo Installing backend dependencies...
if exist "%VENV_PYTHON%" (
	"%VENV_PYTHON%" -m pip install -r "%REQUIREMENTS_FILE%"
) else (
	py -3 -m pip install -r "%REQUIREMENTS_FILE%"
)

if errorlevel 1 (
	echo Failed to install backend dependencies.
	pause
	exit /b 1
)

REM --- Frontend: npm run dev ---
start "Front-end" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm run dev"

REM --- API: uvicorn (prefer local virtual environment python) ---
if exist "%VENV_PYTHON%" (
	start "API Server" cmd /k "cd /d ""%API_DIR%"" && ""%VENV_PYTHON%"" -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
) else (
	start "API Server" cmd /k "cd /d ""%API_DIR%"" && py -3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
)

echo All servers started.
pause