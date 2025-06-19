# Testing Guide for jobsearch_agents

This document describes the consolidated test structure for the jobsearch_agents module.

## 📁 Test Structure

```
jobsearch_agents/
├── tests/
│   ├── __init__.py                    # Test package marker
│   ├── conftest.py                    # Shared fixtures and utilities
│   ├── test_resume_parsing.py         # Resume parsing & document generation
│   ├── test_template_rendering.py     # Template rendering & formatting
│   ├── test_integration.py            # Integration & workflow tests
│   └── test_agents.py                 # Agent functionality & guardrails
├── pytest.ini                        # Pytest configuration
├── run-tests.sh                      # Test runner script
├── consolidate-tests.sh               # Consolidation script (one-time use)
└── requirements.txt                   # Updated with testing dependencies
```

## 🧪 Test Categories

### 1. Resume Parsing Tests (`test_resume_parsing.py`)
**Consolidates:** `test_resume_parsing.py`, `test_parser_direct.py`, `test_parsing_direct.py`, `test_truncated_parsing.py`, `test_exact_input.py`, `test_actual_input_structure.py`

**Coverage:**
- Basic resume parsing functionality
- Skills extraction and categorization
- Experience and education parsing
- Edge cases and error handling
- Document generation
- Integration with template system

**Test Classes:**
- `TestResumeParsingBasic` - Core parsing functionality
- `TestResumeParsingEdgeCases` - Error handling and edge cases
- `TestResumeDocumentGeneration` - Document creation
- `TestResumeParsingIntegration` - End-to-end parsing workflow

### 2. Template Rendering Tests (`test_template_rendering.py`)
**Consolidates:** `test_template_rendering.py`, `test_template_rendering_simulation.py`, `test_template_context_validation.py`, `test_template_data.py`, `test_categorized_skills.py`

**Coverage:**
- Template data structure validation
- Jinja2 template rendering
- Variable formatting and substitution
- Skills categorization logic
- Template error handling
- Context validation

**Test Classes:**
- `TestTemplateDataStructure` - Data structure validation
- `TestTemplateRendering` - Template rendering functionality
- `TestTemplateContextValidation` - Context and error handling
- `TestSkillsCategorization` - Skills processing logic

### 3. Integration Tests (`test_integration.py`)
**Consolidates:** `test_integration.py`, `test_complete_workflow.py`, `test_pipeline_fix.py`

**Coverage:**
- Complete end-to-end workflows
- Job matching algorithms
- User preferences integration
- Error handling in complex scenarios
- Performance testing
- API response validation

**Test Classes:**
- `TestCompleteWorkflow` - End-to-end functionality
- `TestIntegrationErrorHandling` - Error scenarios
- `TestPerformanceIntegration` - Performance testing

### 4. Agent Tests (`test_agents.py`)
**Consolidates:** `test_guardrails.py`, `test_guardrails_simple.py`, `test_formatter_only.py`

**Coverage:**
- Agent guardrails and safety measures
- Input validation and sanitization
- Rate limiting and security
- Response formatting
- Error handling and recovery
- Content filtering

**Test Classes:**
- `TestAgentGuardrails` - Safety and security measures
- `TestAgentResponseFormatting` - Response structure validation
- `TestAgentErrorHandling` - Error recovery

## 🛠️ Running Tests

### Quick Start
```bash
# Install dependencies
cd jobsearch_agents
pip install -r requirements.txt

# Run all tests
pytest

# Run with verbose output
pytest -v
```

### Using the Test Runner Script
```bash
# Make executable (first time only)
chmod +x run-tests.sh

# Show available commands
./run-tests.sh help

# Quick tests (unit tests only)
./run-tests.sh quick

# Full test suite
./run-tests.sh full

# Tests with coverage report
./run-tests.sh coverage

# Run specific test category
./run-tests.sh resume      # Resume parsing tests
./run-tests.sh templates   # Template rendering tests
./run-tests.sh integration # Integration tests
./run-tests.sh agents      # Agent functionality tests

# Parallel execution
./run-tests.sh parallel

# Install dependencies
./run-tests.sh install

# Clean test artifacts
./run-tests.sh clean
```

### Advanced Usage
```bash
# Run specific test file
pytest tests/test_resume_parsing.py

# Run specific test class
pytest tests/test_resume_parsing.py::TestResumeParsingBasic

# Run specific test method
pytest tests/test_resume_parsing.py::TestResumeParsingBasic::test_parse_simple_resume

# Run tests with markers
pytest -m unit           # Unit tests only
pytest -m integration    # Integration tests only
pytest -m "not slow"     # Exclude slow tests

# Run tests with coverage
pytest --cov=resume --cov=job_listing --cov-report=html

# Run tests in parallel
pytest -n auto

# Run tests with timeout
pytest --timeout=300
```

## 📊 Test Markers

Tests are marked with the following markers for easy filtering:

- `@pytest.mark.unit` - Unit tests (fast, isolated)
- `@pytest.mark.integration` - Integration tests (slower, multiple components)
- `@pytest.mark.slow` - Slow tests (can be skipped for quick runs)
- `@pytest.mark.agents` - Agent-specific tests
- `@pytest.mark.resume` - Resume processing tests
- `@pytest.mark.templates` - Template rendering tests

## 🔧 Configuration

### pytest.ini
The `pytest.ini` file contains test configuration including:
- Test discovery patterns
- Default options and markers
- Warning filters
- Timeout settings

### conftest.py
Contains shared fixtures and utilities:
- Sample data for testing
- Helper functions for assertions
- Mock objects and test doubles
- Common setup and teardown logic

## 📈 Coverage Reports

When running tests with coverage, reports are generated in multiple formats:

- **Terminal:** Immediate feedback during test run
- **HTML:** Detailed coverage report in `htmlcov/` directory
- **XML:** Machine-readable format for CI/CD integration

```bash
# Generate coverage report
./run-tests.sh coverage

# View HTML report
open htmlcov/index.html
```

## 🚀 Continuous Integration

For CI/CD pipelines, use:

```bash
# Install dependencies
pip install -r requirements.txt

# Run tests with coverage and XML output
pytest tests/ \
    --cov=resume \
    --cov=job_listing \
    --cov=company_research \
    --cov-report=xml \
    --cov-report=term \
    --junitxml=test-results.xml \
    -v
```

## 🔄 Migration from Old Structure

The consolidation script has already:
- ✅ Removed 17 scattered test files (3,842 lines total)
- ✅ Created 4 organized test suites + shared fixtures
- ✅ Achieved ~76% reduction in test files
- ✅ Improved test organization and maintainability

### Benefits of New Structure:
1. **Better Organization:** Logical grouping by functionality
2. **Reduced Duplication:** Shared fixtures and utilities
3. **Easier Maintenance:** Centralized test configuration
4. **Improved Coverage:** Comprehensive test categories
5. **Better Performance:** Optimized test execution with markers
6. **Enhanced Developer Experience:** Clear test runner commands

## 🤝 Contributing

When adding new tests:
1. Place them in the appropriate test file based on functionality
2. Use shared fixtures from `conftest.py` when possible
3. Add appropriate markers for categorization
4. Follow existing naming conventions
5. Include docstrings explaining test purpose
6. Consider edge cases and error scenarios

## 📝 Best Practices

1. **Isolation:** Tests should be independent and not rely on each other
2. **Descriptive Names:** Test names should clearly describe what is being tested
3. **Fixtures:** Use fixtures for common setup and test data
4. **Markers:** Apply appropriate markers for test categorization
5. **Documentation:** Include docstrings and comments for complex tests
6. **Edge Cases:** Test both happy path and error scenarios
7. **Performance:** Mark slow tests appropriately to allow quick test runs
