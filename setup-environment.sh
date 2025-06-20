#!/bin/bash

# Environment Setup Script for GetHired
# This script helps configure environment variables for different environments

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

echo "🚀 GetHired Environment Setup"
echo "================================"

# Function to create environment file
create_env_file() {
    local env_type="$1"
    local target_file="$2"
    
    echo "📝 Creating $target_file..."
    
    case "$env_type" in
        "development")
            cp "$PROJECT_ROOT/.env.development" "$target_file"
            ;;
        "production")
            cp "$PROJECT_ROOT/.env.production" "$target_file"
            ;;
        "local")
            # Create a local override file
            cat > "$target_file" << 'EOF'
# Local Development Environment Variables
# Override these for your local development setup

# API URLs - adjust for your local services
VITE_GETHIRED_AGENTS_API_URL=http://localhost:8080
VITE_GETHIRED_AGENTS_STAGING_API_URL=https://gethired-agents-staging-104139545590.us-central1.run.app
VITE_CLOUD_TASK_API_URL=http://localhost:8000
VITE_MCP_SERVER_URL=http://localhost:3000/jobsearch-mcp/
EOF
            ;;
        *)
            echo "❌ Unknown environment type: $env_type"
            exit 1
            ;;
    esac
}

# Function to setup backend environment
setup_backend_env() {
    echo "🔧 Setting up backend environment..."
    
    if [ ! -f "$PROJECT_ROOT/jobsearch_agents/.env" ]; then
        echo "📁 Creating jobsearch_agents/.env..."
        cat > "$PROJECT_ROOT/jobsearch_agents/.env" << 'EOF'
# JobSearch Agents Environment Variables
MCP_SERVER_URL=https://gethired-mcp.onrender.com/jobsearch-mcp/
MCP_CLIENT_TIMEOUT=60.0

# For local development, uncomment and adjust:
# MCP_SERVER_URL=http://localhost:3000/jobsearch-mcp/
EOF
    else
        echo "✅ jobsearch_agents/.env already exists"
    fi
}

# Function to check if environment variables are loaded
check_env_vars() {
    echo "🔍 Checking environment configuration..."
    
    # Check if .env.local exists
    if [ -f "$PROJECT_ROOT/.env.local" ]; then
        echo "✅ .env.local exists"
        
        # Check required variables
        required_vars=("VITE_GETHIRED_AGENTS_API_URL" "VITE_CLOUD_TASK_API_URL" "VITE_MCP_SERVER_URL")
        
        for var in "${required_vars[@]}"; do
            if grep -q "^$var=" "$PROJECT_ROOT/.env.local"; then
                echo "✅ $var is configured"
            else
                echo "⚠️  $var is missing"
            fi
        done
    else
        echo "⚠️  .env.local does not exist"
    fi
}

# Main menu
show_menu() {
    echo ""
    echo "Choose an environment setup:"
    echo "1) Development (staging APIs)"
    echo "2) Production (production APIs)"
    echo "3) Local (localhost APIs for development)"
    echo "4) Check current configuration"
    echo "5) Setup backend environment"
    echo "6) Exit"
    echo ""
    read -p "Enter your choice (1-6): " choice
    
    case $choice in
        1)
            create_env_file "development" "$PROJECT_ROOT/.env.local"
            echo "✅ Development environment configured!"
            echo "🚀 Run 'npm run dev' to start development server"
            ;;
        2)
            create_env_file "production" "$PROJECT_ROOT/.env.local"
            echo "✅ Production environment configured!"
            echo "🚀 Run 'npm run build' to build for production"
            ;;
        3)
            create_env_file "local" "$PROJECT_ROOT/.env.local"
            echo "✅ Local development environment configured!"
            echo "⚠️  Make sure your local services are running:"
            echo "   - GetHired Agents API on port 8080"
            echo "   - Cloud Tasks API on port 8000"
            echo "   - MCP Server on port 3000"
            ;;
        4)
            check_env_vars
            ;;
        5)
            setup_backend_env
            echo "✅ Backend environment configured!"
            ;;
        6)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo "❌ Invalid choice. Please try again."
            show_menu
            ;;
    esac
}

# Check if we're in the right directory
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    echo "❌ Error: This script must be run from the GetHired project root directory"
    echo "Current directory: $PROJECT_ROOT"
    exit 1
fi

# Setup backend environment by default
setup_backend_env

# Show the menu
show_menu

echo ""
echo "📚 For more information, see:"
echo "   - .env.example (example configuration)"
echo "   - ENVIRONMENT_MIGRATION.md (detailed documentation)"
echo "   - https://vitejs.dev/guide/env-and-mode.html (Vite environment variables)"
