#!/usr/bin/env python3
"""
Setup script for GetHired Scheduled Search System
Installs dependencies and sets up Cloud Task services
"""

import os
import subprocess
import sys
import json
from pathlib import Path

def run_command(cmd, cwd=None, check=True):
    """Run a shell command and return the result"""
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if check and result.returncode != 0:
        print(f"Error running command: {cmd}")
        print(f"stdout: {result.stdout}")
        print(f"stderr: {result.stderr}")
        sys.exit(1)
    return result

def setup_cloud_tasks():
    """Set up Cloud Tasks Python service"""
    print("\n=== Setting up Cloud Tasks Service ===")
    
    cloud_tasks_dir = Path(__file__).parent / "cloud_tasks"
    
    # Create virtual environment
    print("Creating Python virtual environment...")
    run_command("python3 -m venv venv", cwd=cloud_tasks_dir)
    
    # Install dependencies
    print("Installing Python dependencies...")
    pip_cmd = "./venv/bin/pip" if os.name != 'nt' else ".\\venv\\Scripts\\pip"
    run_command(f"{pip_cmd} install -r requirements.txt", cwd=cloud_tasks_dir)
    
    # Create environment file
    env_file = cloud_tasks_dir / ".env"
    if not env_file.exists():
        print("Creating .env file...")
        with open(env_file, 'w') as f:
            f.write("""# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=your-project-id
CLOUD_TASKS_LOCATION=us-central1
CLOUD_TASKS_QUEUE=scheduled-searches

# GetHired API Configuration
GETHIRED_API_URL=http://localhost:8080
FIREBASE_FUNCTIONS_URL=http://localhost:5001

# Server Configuration
PORT=8000
""")
        print("Created .env file. Please update with your actual values.")

def setup_firebase_functions():
    """Set up Firebase Functions"""
    print("\n=== Setting up Firebase Functions ===")
    
    functions_dir = Path(__file__).parent / "functions"
    
    # Install Node.js dependencies
    print("Installing Node.js dependencies...")
    run_command("npm install", cwd=functions_dir)
    
    # Set up Firebase config
    print("Setting up Firebase configuration...")
    firebase_json = Path(__file__).parent / "firebase.json"
    if not firebase_json.exists():
        firebase_config = {
            "functions": {
                "source": "functions",
                "runtime": "nodejs18"
            },
            "emulators": {
                "functions": {
                    "port": 5001
                },
                "ui": {
                    "enabled": True,
                    "port": 4000
                }
            }
        }
        with open(firebase_json, 'w') as f:
            json.dump(firebase_config, f, indent=2)
        print("Created firebase.json configuration.")

def setup_frontend():
    """Set up frontend dependencies"""
    print("\n=== Setting up Frontend Dependencies ===")
    
    # Install npm dependencies
    print("Installing frontend dependencies...")
    run_command("npm install")
    
    # Create environment file
    env_file = Path(__file__).parent / ".env.local"
    if not env_file.exists():
        print("Creating .env.local file...")
        with open(env_file, 'w') as f:
            f.write("""# Cloud Tasks API Configuration
VITE_CLOUD_TASK_API_URL=http://localhost:8000/api/v1

# Firebase Configuration
VITE_FIREBASE_FUNCTIONS_URL=http://localhost:5001
""")
        print("Created .env.local file. Please update with your actual values.")

def create_startup_scripts():
    """Create startup scripts for development"""
    print("\n=== Creating Startup Scripts ===")
    
    # Create startup script for Cloud Tasks
    cloud_tasks_start = Path(__file__).parent / "start-cloud-tasks.sh"
    with open(cloud_tasks_start, 'w') as f:
        f.write("""#!/bin/bash
cd cloud_tasks
source venv/bin/activate
python api.py
""")
    os.chmod(cloud_tasks_start, 0o755)
    
    # Create startup script for Firebase Functions
    functions_start = Path(__file__).parent / "start-firebase-functions.sh"
    with open(functions_start, 'w') as f:
        f.write("""#!/bin/bash
cd functions
npm run serve
""")
    os.chmod(functions_start, 0o755)
    
    # Create combined startup script
    start_all = Path(__file__).parent / "start-scheduled-search.sh"
    with open(start_all, 'w') as f:
        f.write("""#!/bin/bash
echo "Starting GetHired Scheduled Search Services..."

# Start Cloud Tasks API in background
echo "Starting Cloud Tasks API..."
./start-cloud-tasks.sh &
CLOUD_TASKS_PID=$!

# Start Firebase Functions in background
echo "Starting Firebase Functions..."
./start-firebase-functions.sh &
FUNCTIONS_PID=$!

echo "Services started!"
echo "Cloud Tasks API: http://localhost:8000"
echo "Firebase Functions: http://localhost:5001"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "echo 'Stopping services...'; kill $CLOUD_TASKS_PID $FUNCTIONS_PID; exit" INT
wait
""")
    os.chmod(start_all, 0o755)
    
    print("Created startup scripts:")
    print("  - start-cloud-tasks.sh")
    print("  - start-firebase-functions.sh") 
    print("  - start-scheduled-search.sh (starts all services)")

def check_dependencies():
    """Check if required dependencies are installed"""
    print("=== Checking Dependencies ===")
    
    # Check Python
    try:
        result = run_command("python3 --version", check=False)
        if result.returncode == 0:
            print(f"✓ Python: {result.stdout.strip()}")
        else:
            print("✗ Python 3 is required but not found")
            return False
    except:
        print("✗ Python 3 is required but not found")
        return False
    
    # Check Node.js
    try:
        result = run_command("node --version", check=False)
        if result.returncode == 0:
            print(f"✓ Node.js: {result.stdout.strip()}")
        else:
            print("✗ Node.js is required but not found")
            return False
    except:
        print("✗ Node.js is required but not found")
        return False
    
    # Check npm
    try:
        result = run_command("npm --version", check=False)
        if result.returncode == 0:
            print(f"✓ npm: {result.stdout.strip()}")
        else:
            print("✗ npm is required but not found")
            return False
    except:
        print("✗ npm is required but not found")
        return False
    
    return True

def main():
    """Main setup function"""
    print("GetHired Scheduled Search Setup")
    print("=" * 40)
    
    # Check dependencies
    if not check_dependencies():
        print("\nPlease install the required dependencies and try again.")
        sys.exit(1)
    
    try:
        # Set up services
        setup_cloud_tasks()
        setup_firebase_functions()
        setup_frontend()
        create_startup_scripts()
        
        print("\n" + "=" * 40)
        print("✓ Setup completed successfully!")
        print("\nNext steps:")
        print("1. Update the .env files with your actual configuration values")
        print("2. Deploy to Google Cloud:")
        print("   ./setup-scheduled-search.sh --project-id YOUR_PROJECT_ID")
        print("3. Deploy Firebase Functions:")
        print("   cd functions && firebase deploy --only functions")
        print("4. Update frontend .env.local with deployed service URLs")
        print("\nFor local development:")
        print("- Run './start-scheduled-search.sh' to start all services")
        print("- Cloud Tasks API: http://localhost:8000")
        print("- Firebase Functions: http://localhost:5001")
        print("- Frontend dev server: npm run dev")
        print("\nSee SCHEDULED_SEARCH_README.md for detailed deployment instructions")
        
    except Exception as e:
        print(f"\n✗ Setup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
