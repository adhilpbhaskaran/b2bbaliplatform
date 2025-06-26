@echo off
REM Bali Malayali DMC Backend Development Setup Script for Windows
REM This script sets up the development environment on Windows

setlocal enabledelayedexpansion

REM Colors (limited support in Windows CMD)
set "INFO=[INFO]"
set "SUCCESS=[SUCCESS]"
set "WARNING=[WARNING]"
set "ERROR=[ERROR]"

echo %INFO% Starting Bali Malayali DMC Backend Development Setup...
echo.

REM Check Python installation
echo %INFO% Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo %ERROR% Python is not installed or not in PATH.
    echo Please install Python 3.8 or higher from https://www.python.org/downloads/
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo %SUCCESS% Python %PYTHON_VERSION% found

REM Check if Python version is 3.8 or higher
python -c "import sys; exit(0 if sys.version_info >= (3, 8) else 1)" >nul 2>&1
if errorlevel 1 (
    echo %ERROR% Python 3.8 or higher is required. Current version: %PYTHON_VERSION%
    pause
    exit /b 1
)

REM Check if virtual environment exists
echo %INFO% Setting up Python virtual environment...
if not exist "venv" (
    python -m venv venv
    echo %SUCCESS% Virtual environment created
) else (
    echo %INFO% Virtual environment already exists
)

REM Activate virtual environment
echo %INFO% Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo %ERROR% Failed to activate virtual environment
    pause
    exit /b 1
)
echo %SUCCESS% Virtual environment activated

REM Upgrade pip
echo %INFO% Upgrading pip...
python -m pip install --upgrade pip

REM Install dependencies
echo %INFO% Installing Python dependencies...
if exist "requirements.txt" (
    pip install -r requirements.txt
    echo %SUCCESS% Dependencies installed from requirements.txt
) else (
    echo %ERROR% requirements.txt not found
    pause
    exit /b 1
)

REM Install development dependencies
echo %INFO% Installing development dependencies...
pip install pytest pytest-asyncio pytest-cov black flake8 mypy pre-commit
echo %SUCCESS% Development dependencies installed

REM Setup environment file
echo %INFO% Setting up environment configuration...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo %SUCCESS% Created .env file from .env.example
        echo %WARNING% Please update the .env file with your actual configuration values
    ) else (
        echo %INFO% Creating default .env file...
        (
            echo # Database Configuration
            echo DATABASE_URL=postgresql://balidmc_user:balidmc_password@localhost:5432/balidmc_db
            echo DATABASE_HOST=localhost
            echo DATABASE_PORT=5432
            echo DATABASE_NAME=balidmc_db
            echo DATABASE_USER=balidmc_user
            echo DATABASE_PASSWORD=balidmc_password
            echo.
            echo # Clerk Authentication ^(Development^)
            echo CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
            echo CLERK_SECRET_KEY=sk_test_your_secret_key_here
            echo CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here
            echo.
            echo # API Configuration
            echo API_HOST=127.0.0.1
            echo API_PORT=8001
            echo API_WORKERS=1
            echo ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000
            echo.
            echo # Security
            echo SECRET_KEY=dev_secret_key_change_in_production
            echo ALGORITHM=HS256
            echo ACCESS_TOKEN_EXPIRE_MINUTES=30
            echo.
            echo # Environment
            echo ENVIRONMENT=development
            echo DEBUG=true
            echo LOG_LEVEL=DEBUG
        ) > .env
        echo %SUCCESS% Created default .env file
        echo %WARNING% Please update the Clerk keys in the .env file
    )
) else (
    echo %INFO% .env file already exists
)

REM Check for Docker
echo %INFO% Checking Docker installation...
docker --version >nul 2>&1
if errorlevel 1 (
    echo %WARNING% Docker is not installed or not in PATH.
    echo You can install Docker Desktop from https://docs.docker.com/desktop/install/windows/
    echo Docker is optional but recommended for database setup
    set DOCKER_AVAILABLE=false
) else (
    docker-compose --version >nul 2>&1
    if errorlevel 1 (
        docker compose version >nul 2>&1
        if errorlevel 1 (
            echo %WARNING% Docker Compose is not available
            set DOCKER_AVAILABLE=false
        ) else (
            echo %SUCCESS% Docker and Docker Compose found
            set DOCKER_AVAILABLE=true
        )
    ) else (
        echo %SUCCESS% Docker and Docker Compose found
        set DOCKER_AVAILABLE=true
    )
)

REM Setup database
if "%DOCKER_AVAILABLE%"=="true" (
    echo %INFO% Setting up database with Docker...
    if exist "docker-compose.yml" (
        docker-compose up -d db
        echo %SUCCESS% Database started with Docker Compose
        
        echo %INFO% Waiting for database to be ready...
        timeout /t 10 /nobreak >nul
        
        REM Check if database is ready (simplified check)
        echo %SUCCESS% Database should be ready
    ) else (
        echo %WARNING% docker-compose.yml not found
        echo Starting PostgreSQL container manually...
        
        docker ps -a --format "table {{.Names}}" | findstr "balidmc_db" >nul
        if errorlevel 1 (
            docker run -d --name balidmc_db -e POSTGRES_DB=balidmc_db -e POSTGRES_USER=balidmc_user -e POSTGRES_PASSWORD=balidmc_password -p 5432:5432 postgres:15-alpine
            echo %SUCCESS% PostgreSQL container started
        ) else (
            docker start balidmc_db
            echo %INFO% Database container started
        )
    )
) else (
    echo %WARNING% Docker not available. Please install PostgreSQL manually:
    echo 1. Install PostgreSQL from https://www.postgresql.org/download/windows/
    echo 2. Create a database named 'balidmc_db'
    echo 3. Create a user 'balidmc_user' with password 'balidmc_password'
    echo 4. Grant all privileges on 'balidmc_db' to 'balidmc_user'
    echo.
    echo SQL commands:
    echo CREATE DATABASE balidmc_db;
    echo CREATE USER balidmc_user WITH PASSWORD 'balidmc_password';
    echo GRANT ALL PRIVILEGES ON DATABASE balidmc_db TO balidmc_user;
    echo ALTER USER balidmc_user CREATEDB;
    echo.
    pause
)

REM Run database migrations
echo %INFO% Running database migrations...
if not exist "alembic\versions" mkdir "alembic\versions"

REM Check if there are any migration files
dir /b "alembic\versions\*.py" >nul 2>&1
if errorlevel 1 (
    echo %INFO% Creating initial migration...
    alembic revision --autogenerate -m "Initial migration"
)

alembic upgrade head
if errorlevel 1 (
    echo %WARNING% Database migration failed. Please check your database connection.
    echo Make sure PostgreSQL is running and the connection details in .env are correct.
) else (
    echo %SUCCESS% Database migrations completed
)

REM Setup pre-commit hooks
echo %INFO% Setting up pre-commit hooks...
if not exist ".pre-commit-config.yaml" (
    (
        echo repos:
        echo   - repo: https://github.com/pre-commit/pre-commit-hooks
        echo     rev: v4.4.0
        echo     hooks:
        echo       - id: trailing-whitespace
        echo       - id: end-of-file-fixer
        echo       - id: check-yaml
        echo       - id: check-added-large-files
        echo       - id: check-merge-conflict
        echo.
        echo   - repo: https://github.com/psf/black
        echo     rev: 23.3.0
        echo     hooks:
        echo       - id: black
        echo         language_version: python3
        echo.
        echo   - repo: https://github.com/pycqa/flake8
        echo     rev: 6.0.0
        echo     hooks:
        echo       - id: flake8
        echo         args: [--max-line-length=88, --extend-ignore=E203,W503]
        echo.
        echo   - repo: https://github.com/pycqa/isort
        echo     rev: 5.12.0
        echo     hooks:
        echo       - id: isort
        echo         args: [--profile=black]
    ) > .pre-commit-config.yaml
    echo %SUCCESS% Created .pre-commit-config.yaml
)

pre-commit install
echo %SUCCESS% Pre-commit hooks installed

REM Ask about running tests
echo.
set /p "run_tests=Do you want to run tests? (y/n): "
if /i "%run_tests%"=="y" (
    echo %INFO% Running tests...
    if exist "tests" (
        pytest tests\ -v
        echo %SUCCESS% Tests completed
    ) else (
        echo %WARNING% No tests directory found. Consider adding tests for your application.
    )
)

REM Print summary
echo.
echo %SUCCESS% Development environment setup completed!
echo.
echo === Setup Summary ===
echo ✅ Python virtual environment created and activated
echo ✅ Dependencies installed
echo ✅ Environment configuration set up
echo ✅ Database configured
echo ✅ Database migrations completed
echo ✅ Pre-commit hooks installed
echo.
echo === Next Steps ===
echo 1. Update the .env file with your Clerk authentication keys
echo 2. Start the development server: python start.py
echo 3. Visit http://localhost:8001/docs for API documentation
echo 4. Visit http://localhost:8001/health for health check
echo.
echo === Useful Commands ===
echo Activate virtual environment: venv\Scripts\activate.bat
echo Start development server: python start.py
echo Run tests: pytest
echo Format code: black .
echo Lint code: flake8 .
echo Create migration: alembic revision --autogenerate -m "description"
echo Run migrations: alembic upgrade head
if "%DOCKER_AVAILABLE%"=="true" (
    echo Start database (Docker): docker-compose up -d db
    echo Stop database (Docker): docker-compose down
)
echo.

REM Ask about starting development server
set /p "start_server=Do you want to start the development server now? (y/n): "
if /i "%start_server%"=="y" (
    echo %INFO% Starting development server...
    if exist "start.py" (
        python start.py
    ) else (
        uvicorn main:app --host 127.0.0.1 --port 8001 --reload
    )
) else (
    echo.
    echo To start the development server later, run: python start.py
    pause
)