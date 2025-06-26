@echo off
REM Bali Malayali DMC - Feature Deployment Script (Windows)
REM This script deploys the seasonal pricing and payment processing features

setlocal enabledelayedexpansion

REM Configuration
set APP_NAME=Bali Malayali DMC
set VERSION=1.0.0
set DATABASE_NAME=balidmc_db
set BACKUP_DIR=.\backups
set MIGRATION_DIR=.\migrations
set LOG_FILE=deploy-%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.log

REM Create log file
echo [%date% %time%] Starting deployment process... > "%LOG_FILE%"

echo ========================================
echo     %APP_NAME% - Feature Deployment
echo ========================================
echo.

REM Function to log messages
:log_info
echo [INFO] %~1
echo [%date% %time%] [INFO] %~1 >> "%LOG_FILE%"
goto :eof

:log_success
echo [SUCCESS] %~1
echo [%date% %time%] [SUCCESS] %~1 >> "%LOG_FILE%"
goto :eof

:log_warning
echo [WARNING] %~1
echo [%date% %time%] [WARNING] %~1 >> "%LOG_FILE%"
goto :eof

:log_error
echo [ERROR] %~1
echo [%date% %time%] [ERROR] %~1 >> "%LOG_FILE%"
goto :eof

REM Check prerequisites
call :log_info "Checking prerequisites..."

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    call :log_error "Python is not installed or not in PATH"
    pause
    exit /b 1
)

REM Check if pip is available
pip --version >nul 2>&1
if errorlevel 1 (
    call :log_error "pip is not installed or not in PATH"
    pause
    exit /b 1
)

REM Check if PostgreSQL client is available
psql --version >nul 2>&1
if errorlevel 1 (
    call :log_warning "PostgreSQL client (psql) not found. Database operations may fail."
)

REM Check if .env file exists
if not exist ".env" (
    call :log_warning ".env file not found."
    if exist ".env.example" (
        call :log_info "Copying .env.example to .env"
        copy ".env.example" ".env" >nul
        call :log_warning "Please update .env with your actual configuration values"
    ) else (
        call :log_error ".env.example file not found"
        pause
        exit /b 1
    )
)

call :log_success "Prerequisites check completed"

REM Create backup directory
call :log_info "Creating backup directory..."
if not exist "%BACKUP_DIR%" (
    mkdir "%BACKUP_DIR%"
)

REM Install dependencies
call :log_info "Installing Python dependencies..."
pip install --upgrade pip
if errorlevel 1 (
    call :log_error "Failed to upgrade pip"
    pause
    exit /b 1
)

pip install -r requirements.txt
if errorlevel 1 (
    call :log_error "Failed to install dependencies"
    pause
    exit /b 1
)

call :log_success "Dependencies installed successfully"

REM Test database connection
call :log_info "Testing database connection..."
python test_connection.py
if errorlevel 1 (
    call :log_error "Database connection test failed"
    pause
    exit /b 1
)

call :log_success "Database connection test passed"

REM Run database migration
call :log_info "Running database migration..."
set MIGRATION_FILE=%MIGRATION_DIR%\001_add_seasonal_pricing_and_payments.sql

if not exist "%MIGRATION_FILE%" (
    call :log_error "Migration file not found: %MIGRATION_FILE%"
    pause
    exit /b 1
)

REM Check if psql is available for migration
psql --version >nul 2>&1
if errorlevel 1 (
    call :log_warning "PostgreSQL client not available. Please run migration manually:"
    call :log_warning "psql -d %DATABASE_NAME% -f %MIGRATION_FILE%"
    echo.
    set /p "continue=Continue without running migration? (y/N): "
    if /i not "!continue!"=="y" (
        call :log_info "Deployment cancelled by user"
        pause
        exit /b 1
    )
) else (
    psql -d "%DATABASE_NAME%" -f "%MIGRATION_FILE%"
    if errorlevel 1 (
        call :log_error "Database migration failed"
        call :log_error "Please check the migration file and database connection"
        pause
        exit /b 1
    )
    call :log_success "Database migration completed successfully"
)

REM Run tests
call :log_info "Running tests..."
pip install pytest pytest-asyncio httpx >nul 2>&1
python -m pytest tests/ -v
if errorlevel 1 (
    call :log_warning "Some tests failed. Please review the test results."
    set /p "continue=Do you want to continue with deployment? (y/N): "
    if /i not "!continue!"=="y" (
        call :log_info "Deployment cancelled by user"
        pause
        exit /b 1
    )
) else (
    call :log_success "All tests passed"
)

REM Kill any existing processes
call :log_info "Stopping any existing application processes..."
taskkill /f /im python.exe /fi "WINDOWTITLE eq uvicorn*" >nul 2>&1
taskkill /f /im uvicorn.exe >nul 2>&1

REM Start the application
call :log_info "Starting application..."

REM Check environment
if "%ENVIRONMENT%"=="production" (
    REM Production mode
    start /b uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4 > app.log 2>&1
) else (
    REM Development mode
    start /b uvicorn main:app --host 0.0.0.0 --port 8000 --reload > app.log 2>&1
)

REM Wait for application to start
call :log_info "Waiting for application to start..."
timeout /t 10 /nobreak >nul

REM Test if the application is running
curl -f http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    call :log_warning "Application health check failed. Please check app.log for details."
) else (
    call :log_success "Application started successfully"
)

REM Run health checks
call :log_info "Running additional health checks..."

REM Test API endpoints
curl -f http://localhost:8000/api/v1/packages >nul 2>&1
if errorlevel 1 (
    call :log_warning "Packages endpoint health check failed"
) else (
    call :log_success "Packages endpoint health check passed"
)

REM Cleanup
call :log_info "Cleaning up temporary files..."
del /q *.tmp >nul 2>&1
for /d /r . %%d in (__pycache__) do @if exist "%%d" rd /s /q "%%d" >nul 2>&1
del /s /q *.pyc >nul 2>&1

call :log_success "Cleanup completed"

REM Print summary
echo.
echo ========================================
echo          DEPLOYMENT SUMMARY
echo ========================================
echo Application: %APP_NAME%
echo Version: %VERSION%
echo Environment: %ENVIRONMENT%
echo Database: %DATABASE_NAME%
echo Log file: %LOG_FILE%
echo Application URL: http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo ========================================
echo.
echo New Features Deployed:
echo ✅ Seasonal Pricing System
echo ✅ Payment Processing (Stripe Integration)
echo ✅ Enhanced Database Schema
echo ✅ Comprehensive API Endpoints
echo.
echo Next Steps:
echo 1. Configure Stripe webhook endpoints
echo 2. Test payment flows in your environment
echo 3. Set up monitoring and alerts
echo 4. Review and update documentation
echo.

call :log_success "Deployment completed successfully!"

echo Press any key to exit...
pause >nul
exit /b 0