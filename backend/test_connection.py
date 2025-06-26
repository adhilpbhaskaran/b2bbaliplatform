#!/usr/bin/env python3
"""
Database Connection Test Script for Supabase
This script tests the connection to your Supabase PostgreSQL database.
"""

import psycopg2
from dotenv import load_dotenv
import os
import sys
from urllib.parse import urlparse

# Load environment variables from .env
load_dotenv()

def test_connection_from_url():
    """Test connection using DATABASE_URL"""
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        print("❌ DATABASE_URL not found in .env file")
        return False
    
    if "[YOUR-PASSWORD]" in database_url:
        print("❌ Please replace [YOUR-PASSWORD] with your actual Supabase password in .env file")
        return False
    
    try:
        # Parse the DATABASE_URL
        parsed = urlparse(database_url)
        
        print(f"🔗 Connecting to Supabase...")
        print(f"   Host: {parsed.hostname}")
        print(f"   Port: {parsed.port}")
        print(f"   Database: {parsed.path[1:]}")
        print(f"   User: {parsed.username}")
        
        connection = psycopg2.connect(database_url)
        print("✅ Connection successful!")
        
        # Create a cursor to execute SQL queries
        cursor = connection.cursor()
        
        # Test queries
        print("\n📊 Running test queries...")
        
        # Get current time
        cursor.execute("SELECT NOW();")
        result = cursor.fetchone()
        print(f"   Current Time: {result[0]}")
        
        # Get PostgreSQL version
        cursor.execute("SELECT version();")
        result = cursor.fetchone()
        print(f"   PostgreSQL Version: {result[0][:50]}...")
        
        # Check if we can create tables (test permissions)
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.schemata 
                WHERE schema_name = 'public'
            );
        """)
        result = cursor.fetchone()
        print(f"   Public schema exists: {result[0]}")
        
        # List existing tables
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        """)
        tables = cursor.fetchall()
        print(f"   Existing tables: {len(tables)} found")
        if tables:
            for table in tables[:5]:  # Show first 5 tables
                print(f"     - {table[0]}")
            if len(tables) > 5:
                print(f"     ... and {len(tables) - 5} more")
        
        # Close the cursor and connection
        cursor.close()
        connection.close()
        print("\n✅ Connection test completed successfully!")
        print("\n🚀 Your Supabase database is ready for the FastAPI backend!")
        return True
        
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        print("\n🔧 Troubleshooting tips:")
        print("   1. Check your DATABASE_URL in .env file")
        print("   2. Ensure your Supabase password is correct")
        print("   3. Verify your internet connection")
        print("   4. Check if your IP is allowed in Supabase settings")
        return False

def test_individual_params():
    """Test connection using individual parameters"""
    print("\n🔄 Testing with individual parameters...")
    
    # Fetch individual variables
    USER = os.getenv("DATABASE_USER")
    PASSWORD = os.getenv("DATABASE_PASSWORD")
    HOST = os.getenv("DATABASE_HOST")
    PORT = os.getenv("DATABASE_PORT")
    DBNAME = os.getenv("DATABASE_NAME")
    
    if not all([USER, PASSWORD, HOST, PORT, DBNAME]):
        print("❌ Some database parameters are missing in .env file")
        return False
    
    if "[YOUR-PASSWORD]" in PASSWORD:
        print("❌ Please replace [YOUR-PASSWORD] with your actual Supabase password")
        return False
    
    try:
        connection = psycopg2.connect(
            user=USER,
            password=PASSWORD,
            host=HOST,
            port=PORT,
            dbname=DBNAME
        )
        print("✅ Individual parameters connection successful!")
        connection.close()
        return True
        
    except Exception as e:
        print(f"❌ Individual parameters connection failed: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Supabase Database Connection Test")
    print("=" * 40)
    
    # Test connection using DATABASE_URL (recommended)
    success = test_connection_from_url()
    
    if not success:
        # Fallback to individual parameters
        test_individual_params()
    
    print("\n" + "=" * 40)
    if success:
        print("🎉 Ready to run your FastAPI backend with Supabase!")
        print("\nNext steps:")
        print("1. Install dependencies: pip install -r requirements.txt")
        print("2. Run migrations: alembic upgrade head")
        print("3. Start the API: python main.py")
    else:
        print("❌ Please fix the connection issues before proceeding.")
        sys.exit(1)