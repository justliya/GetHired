#!/bin/bash

# Test runner script for jobsearch_agents
# Provides convenient commands for running different types of tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    printf "${1}${2}${NC}\n"
}

# Function to check if pytest is available
check_pytest() {
    if ! command -v pytest &> /dev/null; then
        print_color $RED "❌ pytest not found. Installing dependencies..."
        pip install -r requirements.txt
    fi
}

# Function to run tests with coverage
run_with_coverage() {
    print_color $BLUE "🧪 Running tests with coverage..."
    pytest tests/ \
        --cov=resume \
        --cov=job_listing \
        --cov=company_research \
        --cov=coordinator \
        --cov=common \
        --cov-report=html \
        --cov-report=term \
        --cov-report=xml \
        -v
}

# Function to run specific test categories
run_category_tests() {
    case $1 in
        "resume")
            print_color $BLUE "📄 Running resume parsing tests..."
            pytest tests/test_resume_parsing.py -v
            ;;
        "templates")
            print_color $BLUE "📝 Running template rendering tests..."
            pytest tests/test_template_rendering.py -v
            ;;
        "integration")
            print_color $BLUE "🔗 Running integration tests..."
            pytest tests/test_integration.py -v
            ;;
        "agents")
            print_color $BLUE "🤖 Running agent functionality tests..."
            pytest tests/test_agents.py -v
            ;;
        *)
            print_color $RED "❌ Unknown test category: $1"
            print_color $YELLOW "Available categories: resume, templates, integration, agents"
            exit 1
            ;;
    esac
}

# Function to run quick tests (fast, unit tests only)
run_quick_tests() {
    print_color $BLUE "⚡ Running quick tests (unit tests only)..."
    pytest tests/ -m "not slow and not integration" -v --tb=short
}

# Function to run full test suite
run_full_tests() {
    print_color $BLUE "🎯 Running full test suite..."
    pytest tests/ -v --tb=short
}

# Function to run tests in parallel
run_parallel_tests() {
    print_color $BLUE "⚙️ Running tests in parallel..."
    pytest tests/ -n auto -v
}

# Function to watch for changes and run tests
run_watch_tests() {
    print_color $BLUE "👀 Running tests in watch mode..."
    print_color $YELLOW "Note: This requires pytest-watch (pip install pytest-watch)"
    
    if command -v ptw &> /dev/null; then
        ptw tests/ --runner "pytest -v --tb=short"
    else
        print_color $RED "❌ pytest-watch not found. Install it with: pip install pytest-watch"
        exit 1
    fi
}

# Function to show help
show_help() {
    print_color $GREEN "🧪 Test Runner for jobsearch_agents"
    echo ""
    print_color $BLUE "Usage: $0 [COMMAND]"
    echo ""
    print_color $YELLOW "Available commands:"
    echo "  quick        Run quick tests (unit tests, no integration)"
    echo "  full         Run full test suite"
    echo "  coverage     Run tests with coverage report"
    echo "  parallel     Run tests in parallel"
    echo "  watch        Run tests in watch mode (requires pytest-watch)"
    echo ""
    echo "  resume       Run resume parsing tests only"
    echo "  templates    Run template rendering tests only"
    echo "  integration  Run integration tests only"
    echo "  agents       Run agent functionality tests only"
    echo ""
    echo "  install      Install test dependencies"
    echo "  clean        Clean test artifacts"
    echo "  help         Show this help message"
    echo ""
    print_color $GREEN "Examples:"
    echo "  $0 quick                    # Quick unit tests"
    echo "  $0 coverage                 # Tests with coverage"
    echo "  $0 resume                   # Only resume tests"
    echo "  $0 parallel                 # Parallel execution"
}

# Function to install dependencies
install_deps() {
    print_color $BLUE "📦 Installing test dependencies..."
    pip install -r requirements.txt
    print_color $GREEN "✅ Dependencies installed successfully!"
}

# Function to clean test artifacts
clean_artifacts() {
    print_color $BLUE "🧹 Cleaning test artifacts..."
    
    # Remove coverage files
    rm -rf htmlcov/
    rm -f .coverage
    rm -f coverage.xml
    
    # Remove pytest cache
    rm -rf .pytest_cache/
    rm -rf tests/__pycache__/
    
    # Remove other cache files
    find . -name "*.pyc" -delete
    find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
    
    print_color $GREEN "✅ Test artifacts cleaned!"
}

# Main execution
main() {
    cd "$(dirname "$0")"
    
    case ${1:-"help"} in
        "quick")
            check_pytest
            run_quick_tests
            ;;
        "full")
            check_pytest
            run_full_tests
            ;;
        "coverage")
            check_pytest
            run_with_coverage
            ;;
        "parallel")
            check_pytest
            run_parallel_tests
            ;;
        "watch")
            check_pytest
            run_watch_tests
            ;;
        "resume"|"templates"|"integration"|"agents")
            check_pytest
            run_category_tests $1
            ;;
        "install")
            install_deps
            ;;
        "clean")
            clean_artifacts
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_color $RED "❌ Unknown command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
