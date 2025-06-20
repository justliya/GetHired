"""
Shared test fixtures and utilities for jobsearch_agents tests
"""
import pytest
import json
import tempfile
import os
from typing import Dict, Any, List

# Sample data used across multiple tests
SAMPLE_RESUME_TEXT = """John Doe
Software Developer
john.doe@email.com | (555) 123-4567 | LinkedIn: linkedin.com/in/johndoe

PROFESSIONAL SUMMARY
Experienced software developer with 5+ years of experience in web development. 
Proficient in JavaScript, HTML, CSS, and various frameworks. Strong problem-solving 
skills and ability to work in team environments.

TECHNICAL SKILLS
• Programming Languages: JavaScript, Python, Java
• Frameworks: React, Angular, Node.js
• Databases: MySQL, MongoDB, PostgreSQL
• Tools: Git, Docker, AWS

PROFESSIONAL EXPERIENCE
Senior Software Developer — Tech Corp (2020-Present)
• Developed and maintained web applications using React and Node.js
• Collaborated with cross-functional teams to deliver high-quality software
• Implemented automated testing and CI/CD pipelines
• Led code reviews and mentored junior developers

Software Developer — StartupXYZ (2018-2020)
• Built responsive web applications using JavaScript and CSS
• Worked closely with designers to implement user-friendly interfaces
• Optimized application performance and improved loading times
• Participated in agile development processes

EDUCATION
Bachelor of Science in Computer Science — University of Technology (2018)

PROJECTS
Personal Portfolio Website (2021)
• Developed using React and deployed on AWS
• Implemented responsive design and modern UI/UX principles

E-commerce Platform (2020)
• Built full-stack application with React frontend and Node.js backend
• Integrated payment processing and user authentication
"""

SAMPLE_JOB_DESCRIPTION = """Senior Frontend Developer

We are seeking a talented Senior Frontend Developer to join our growing team. 
The ideal candidate will have strong experience with React, JavaScript, and modern 
web development practices.

Requirements:
- 5+ years of experience in frontend development
- Expert knowledge of React, JavaScript, HTML, CSS
- Experience with Node.js and backend integration
- Familiarity with AWS and cloud deployment
- Strong problem-solving and communication skills

Responsibilities:
- Develop and maintain user-facing web applications
- Collaborate with design and backend teams
- Implement responsive and accessible UI components
- Optimize application performance
- Participate in code reviews and team discussions
"""

SAMPLE_USER_PREFERENCES = {
    "job_titles": ["Software Developer", "Frontend Developer", "Full Stack Developer"],
    "locations": ["Remote", "San Francisco", "New York"],
    "salary_range": {"min": 80000, "max": 150000},
    "experience_level": "Senior",
    "company_size": ["Startup", "Mid-size"],
    "benefits": ["Health Insurance", "Remote Work", "401k"],
    "technologies": ["React", "JavaScript", "Node.js", "Python"]
}

@pytest.fixture
def sample_resume_text():
    """Fixture providing sample resume text"""
    return SAMPLE_RESUME_TEXT

@pytest.fixture
def sample_job_description():
    """Fixture providing sample job description"""
    return SAMPLE_JOB_DESCRIPTION

@pytest.fixture
def sample_user_preferences():
    """Fixture providing sample user preferences"""
    return SAMPLE_USER_PREFERENCES.copy()

@pytest.fixture
def temp_directory():
    """Fixture providing a temporary directory for test files"""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir

@pytest.fixture
def sample_job_listings():
    """Fixture providing sample job listings"""
    return [
        {
            "id": "job-1",
            "title": "Senior Frontend Developer",
            "company": "TechCorp",
            "location": "San Francisco, CA",
            "salary": "$120k - $140k",
            "description": SAMPLE_JOB_DESCRIPTION,
            "requirements": ["React", "JavaScript", "5+ years experience"],
            "posted_date": "2024-01-15",
            "url": "https://example.com/job-1"
        },
        {
            "id": "job-2", 
            "title": "Full Stack Developer",
            "company": "StartupXYZ",
            "location": "Remote",
            "salary": "$100k - $130k",
            "description": "Looking for a full stack developer with React and Node.js experience",
            "requirements": ["React", "Node.js", "MongoDB", "3+ years experience"],
            "posted_date": "2024-01-10",
            "url": "https://example.com/job-2"
        }
    ]

@pytest.fixture
def sample_parsed_resume():
    """Fixture providing a sample parsed resume structure"""
    return {
        "name": "John Doe",
        "email": "john.doe@email.com",
        "phone": "(555) 123-4567",
        "professional_summary": "Experienced software developer with 5+ years of experience...",
        "technical_skills": ["JavaScript", "Python", "Java", "React", "Angular", "Node.js"],
        "soft_skills": ["Problem-solving", "Team collaboration", "Communication"],
        "experience": [
            {
                "title": "Senior Software Developer",
                "company": "Tech Corp",
                "dates": "2020-Present",
                "responsibilities": [
                    "Developed and maintained web applications using React and Node.js",
                    "Collaborated with cross-functional teams to deliver high-quality software"
                ]
            }
        ],
        "education": [
            {
                "degree": "Bachelor of Science in Computer Science",
                "school": "University of Technology",
                "year": "2018"
            }
        ],
        "projects": [
            {
                "name": "Personal Portfolio Website",
                "year": "2021",
                "description": "Developed using React and deployed on AWS"
            }
        ]
    }

def create_test_docx_file(content: str, filepath: str):
    """Helper function to create a test DOCX file"""
    try:
        from docx import Document
        doc = Document()
        doc.add_paragraph(content)
        doc.save(filepath)
        return True
    except ImportError:
        # If python-docx is not available, create a text file instead
        with open(filepath.replace('.docx', '.txt'), 'w') as f:
            f.write(content)
        return False

def assert_resume_structure(parsed_resume: Dict[str, Any]):
    """Helper function to assert basic resume structure"""
    required_fields = ['name', 'email', 'professional_summary']
    for field in required_fields:
        assert field in parsed_resume, f"Missing required field: {field}"
        assert parsed_resume[field], f"Empty required field: {field}"

def assert_job_match_quality(match_score: float):
    """Helper function to assert job match quality"""
    assert 0.0 <= match_score <= 1.0, f"Match score {match_score} should be between 0.0 and 1.0"
