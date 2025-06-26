#!/usr/bin/env python3
"""
Bali Malayali DMC Backend Startup Script

This script helps start the FastAPI backend server with proper configuration.
"""

import os
import sys
import subprocess
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Error: Python 3.8 or higher is required")
        print(f"Current version: {sys.version}")
        sys.exit(1)
    print(f"✅ Python version: {sys.version.split()[0]}")

def check_virtual_environment():
    """Check if running in virtual environment"""
    if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("✅ Running in virtual environment")
        return True
    else:
        print("⚠️  Warning: Not running in virtual environment")
        print("   It's recommended to use a virtual environment")
        return False

def check_dependencies():
    """Check if required dependencies are installed"""
    required_packages = [
        'fastapi',
        'uvicorn',
        'sqlalchemy',
        'psycopg2',
        'pydantic',
        'python-dotenv'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"❌ Missing dependencies: {', '.join(missing_packages)}")
        print("Run: pip install -r requirements.txt")
        return False
    
    print("✅ All dependencies installed")
    return True

def check_environment_file():
    """Check if .env file exists"""
    env_file = Path('.env')
    env_example = Path('.env.example')
    
    if not env_file.exists():
        if env_example.exists():
            print("❌ .env file not found")
            print("📝 Copy .env.example to .env and configure your settings:")
            print("   cp .env.example .env")
        else:
            print("❌ Neither .env nor .env.example found")
        return False
    
    print("✅ Environment file found")
    return True

def check_database_connection():
    """Check database connection"""
    try:
        from database import engine
        from sqlalchemy import text
        
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        
        print("✅ Database connection successful")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("💡 Make sure PostgreSQL is running and credentials are correct")
        return False

def run_migrations():
    """Run database migrations"""
    try:
        print("🔄 Running database migrations...")
        result = subprocess.run(['alembic', 'upgrade', 'head'], 
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Database migrations completed")
            return True
        else:
            print(f"❌ Migration failed: {result.stderr}")
            return False
    except FileNotFoundError:
        print("❌ Alembic not found. Install with: pip install alembic")
        return False
    except Exception as e:
        print(f"❌ Migration error: {e}")
        return False

def start_server(host="0.0.0.0", port=8001, reload=True):
    """Start the FastAPI server"""
    try:
        print(f"🚀 Starting server at http://{host}:{port}")
        print("📚 API Documentation: http://localhost:8001/docs")
        print("🔄 Auto-reload enabled" if reload else "🔄 Auto-reload disabled")
        print("\n" + "="*50)
        print("Press Ctrl+C to stop the server")
        print("="*50 + "\n")
        
        cmd = [
            'uvicorn', 
            'main:app',
            '--host', host,
            '--port', str(port)
        ]
        
        if reload:
            cmd.append('--reload')
        
        subprocess.run(cmd)
        
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
    except FileNotFoundError:
        print("❌ Uvicorn not found. Install with: pip install uvicorn")
    except Exception as e:
        print(f"❌ Server error: {e}")

def main():
    """Main startup function"""
    print("🌴 Bali Malayali DMC Backend Startup")
    print("="*40)
    
    # Pre-flight checks
    checks = [
        check_python_version,
        check_virtual_environment,
        check_dependencies,
        check_environment_file,
    ]
    
    for check in checks:
        if not check():
            if check == check_virtual_environment:
                # Virtual env is optional, continue
                continue
            print("\n❌ Startup failed. Please fix the issues above.")
            sys.exit(1)
    
    # Database checks (optional)
    print("\n🔍 Checking database...")
    if check_database_connection():
        run_migrations()
    else:
        print("⚠️  Database not available. Server will start but may not work properly.")
        response = input("Continue anyway? (y/N): ")
        if response.lower() != 'y':
            sys.exit(1)
    
    # Parse command line arguments
    import argparse
    parser = argparse.ArgumentParser(description='Start Bali Malayali DMC Backend')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=8001, help='Port to bind to')
    parser.add_argument('--no-reload', action='store_true', help='Disable auto-reload')
    parser.add_argument('--production', action='store_true', help='Run in production mode')
    
    args = parser.parse_args()
    
    # Production mode settings
    if args.production:
        reload = False
        print("🏭 Production mode enabled")
    else:
        reload = not args.no_reload
        print("🛠️  Development mode enabled")
    
    print("\n✅ All checks passed!")
    print("🚀 Starting server...\n")
    
    # Start the server
    start_server(host=args.host, port=args.port, reload=reload)

if __name__ == '__main__':
    main()