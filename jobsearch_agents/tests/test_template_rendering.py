"""
Test suite for template rendering and document formatting
Consolidates: test_template_rendering.py, test_template_rendering_simulation.py, 
test_template_context_validation.py, test_template_data.py, test_categorized_skills.py
"""
import pytest
import sys
import os
import json
import tempfile
from typing import Dict, Any, List
from dataclasses import dataclass

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.conftest import (
    sample_resume_text,
    sample_parsed_resume, 
    temp_directory,
    assert_resume_structure
)

# Mock classes for testing when actual modules aren't available
@dataclass
class MockEducationEntry:
    degree: str
    school: str
    start_date: str = None
    end_date: str = None
    details: List[str] = None

@dataclass 
class MockExperienceEntry:
    company: str
    position: str
    start_date: str
    end_date: str = None
    bullet_points: List[str] = None

@dataclass
class MockSkillSet:
    technical: List[str]
    soft_skills: List[str]


class TestTemplateDataStructure:
    """Test template data structure and validation"""

    def test_education_entry_structure(self):
        """Test education entry data structure"""
        edu = MockEducationEntry(
            degree="Bachelor of Science in Computer Science",
            school="University of Technology",
            start_date="2014",
            end_date="2018"
        )
        
        assert edu.degree
        assert edu.school
        assert edu.start_date
        assert edu.end_date

    def test_experience_entry_structure(self):
        """Test experience entry data structure"""
        exp = MockExperienceEntry(
            company="Tech Corp",
            position="Senior Software Developer", 
            start_date="2020-01",
            end_date="Present",
            bullet_points=[
                "Developed web applications using React",
                "Led team of 3 developers"
            ]
        )
        
        assert exp.company
        assert exp.position
        assert exp.start_date
        assert len(exp.bullet_points) > 0

    def test_skill_set_categorization(self):
        """Test skill categorization structure"""
        skills = MockSkillSet(
            technical=["JavaScript", "Python", "React", "Node.js"],
            soft_skills=["Leadership", "Communication", "Problem-solving"]
        )
        
        assert len(skills.technical) > 0
        assert len(skills.soft_skills) > 0
        
        # Technical skills should be programming/tech related
        tech_keywords = ["javascript", "python", "react", "node", "java", "sql"]
        technical_skills_lower = [skill.lower() for skill in skills.technical]
        assert any(keyword in " ".join(technical_skills_lower) for keyword in tech_keywords)

    def test_complete_resume_structure(self, sample_parsed_resume):
        """Test complete resume data structure for template rendering"""
        resume = sample_parsed_resume
        
        # Required fields for template rendering
        required_fields = [
            'name', 'email', 'professional_summary', 
            'technical_skills', 'experience', 'education'
        ]
        
        for field in required_fields:
            assert field in resume, f"Missing required field: {field}"
            
        # Validate field types
        assert isinstance(resume['technical_skills'], list)
        assert isinstance(resume['experience'], list)
        assert isinstance(resume['education'], list)


class TestTemplateRendering:
    """Test template rendering functionality"""

    def test_jinja2_template_basic_rendering(self, temp_directory):
        """Test basic Jinja2 template rendering"""
        try:
            from jinja2 import Template
        except ImportError:
            pytest.skip("Jinja2 not available")
            
        # Create a simple template
        template_content = """
Name: {{ candidate.name }}
Email: {{ candidate.email }}

{% if candidate.professional_summary %}
PROFESSIONAL SUMMARY
{{ candidate.professional_summary }}
{% endif %}

{% if candidate.technical_skills %}
TECHNICAL SKILLS
{% for skill in candidate.technical_skills %}
• {{ skill }}
{% endfor %}
{% endif %}
"""
        
        template = Template(template_content)
        
        # Test data
        candidate_data = {
            'name': 'John Doe',
            'email': 'john@example.com',
            'professional_summary': 'Experienced developer',
            'technical_skills': ['JavaScript', 'Python', 'React']
        }
        
        rendered = template.render(candidate=candidate_data)
        
        assert 'John Doe' in rendered
        assert 'john@example.com' in rendered
        assert 'JavaScript' in rendered
        assert 'Python' in rendered

    def test_template_with_missing_fields(self):
        """Test template rendering with missing optional fields"""
        try:
            from jinja2 import Template
        except ImportError:
            pytest.skip("Jinja2 not available")
            
        template_content = """
Name: {{ candidate.name }}
{% if candidate.phone %}Phone: {{ candidate.phone }}{% endif %}
{% if candidate.website %}Website: {{ candidate.website }}{% endif %}
"""
        
        template = Template(template_content)
        
        # Data with missing optional fields
        candidate_data = {'name': 'Jane Smith'}
        
        rendered = template.render(candidate=candidate_data)
        
        assert 'Jane Smith' in rendered
        assert 'Phone:' not in rendered  # Should be skipped
        assert 'Website:' not in rendered  # Should be skipped

    def test_template_with_complex_loops(self):
        """Test template rendering with complex nested loops"""
        try:
            from jinja2 import Template
        except ImportError:
            pytest.skip("Jinja2 not available")
            
        template_content = """
PROFESSIONAL EXPERIENCE
{% for exp in candidate.experience %}
{{ exp.title }} — {{ exp.company }}{% if exp.dates %} ({{ exp.dates }}){% endif %}
{% for responsibility in exp.responsibilities %}
• {{ responsibility }}
{% endfor %}

{% endfor %}
"""
        
        template = Template(template_content)
        
        candidate_data = {
            'experience': [
                {
                    'title': 'Senior Developer',
                    'company': 'TechCorp',
                    'dates': '2020-Present',
                    'responsibilities': [
                        'Led development team',
                        'Architected scalable solutions'
                    ]
                },
                {
                    'title': 'Developer',
                    'company': 'StartupXYZ', 
                    'dates': '2018-2020',
                    'responsibilities': [
                        'Built web applications',
                        'Collaborated with designers'
                    ]
                }
            ]
        }
        
        rendered = template.render(candidate=candidate_data)
        
        assert 'Senior Developer' in rendered
        assert 'TechCorp' in rendered
        assert 'Led development team' in rendered
        assert 'StartupXYZ' in rendered

    def test_template_variable_formatting(self):
        """Test different template variable formats"""
        try:
            from jinja2 import Template
        except ImportError:
            pytest.skip("Jinja2 not available")
            
        # Test multiple variable formats
        templates = [
            "{{ candidate.name }}",  # Standard format
            "{{ name }}",           # Direct variable
            "{{candidate.name}}",   # No spaces
            "{{ candidate['name'] }}"  # Dictionary access
        ]
        
        for template_str in templates:
            template = Template(template_str)
            
            # Test with both formats
            try:
                result1 = template.render(candidate={'name': 'John Doe'})
                if 'John Doe' in result1:
                    continue
            except:
                pass
                
            try:
                result2 = template.render(name='John Doe')
                if 'John Doe' in result2:
                    continue
            except:
                pass
                
            # At least one format should work
            assert False, f"Template format {template_str} failed"


class TestTemplateContextValidation:
    """Test template context validation and error handling"""

    def test_validate_required_template_variables(self, sample_parsed_resume):
        """Test validation of required template variables"""
        resume = sample_parsed_resume
        
        # Define required variables for different template types
        required_vars = {
            'basic': ['name', 'email'],
            'professional': ['name', 'email', 'professional_summary', 'experience'],
            'detailed': ['name', 'email', 'professional_summary', 'experience', 'education', 'technical_skills']
        }
        
        for template_type, required in required_vars.items():
            missing = [var for var in required if var not in resume or not resume[var]]
            assert len(missing) == 0, f"Missing required variables for {template_type}: {missing}"

    def test_handle_empty_collections(self):
        """Test handling of empty collections in templates"""
        try:
            from jinja2 import Template
        except ImportError:
            pytest.skip("Jinja2 not available")
            
        template_content = """
{% if candidate.technical_skills %}
TECHNICAL SKILLS
{% for skill in candidate.technical_skills %}
• {{ skill }}
{% endfor %}
{% else %}
No technical skills listed.
{% endif %}
"""
        
        template = Template(template_content)
        
        # Test with empty skills
        candidate_data = {'technical_skills': []}
        rendered = template.render(candidate=candidate_data)
        
        assert 'No technical skills listed' in rendered
        assert 'TECHNICAL SKILLS' not in rendered

    def test_template_error_handling(self):
        """Test template error handling for invalid data"""
        try:
            from jinja2 import Template, UndefinedError
        except ImportError:
            pytest.skip("Jinja2 not available")
            
        template_content = "{{ candidate.nonexistent_field }}"
        template = Template(template_content)
        
        # Should handle undefined variables gracefully
        rendered = template.render(candidate={})
        # Jinja2 renders undefined variables as empty string by default
        assert rendered == ""


class TestSkillsCategorization:
    """Test skills categorization and processing"""

    def test_categorize_technical_skills(self):
        """Test categorization of technical skills"""
        all_skills = [
            "JavaScript", "Leadership", "Python", "Communication",
            "React", "Problem-solving", "SQL", "Team collaboration",
            "Docker", "Time management", "AWS", "Critical thinking"
        ]
        
        # Expected categorization
        expected_technical = ["JavaScript", "Python", "React", "SQL", "Docker", "AWS"]
        expected_soft = ["Leadership", "Communication", "Problem-solving", "Team collaboration", "Time management", "Critical thinking"]
        
        # Simple categorization logic (would be more sophisticated in real implementation)
        technical_keywords = [
            "javascript", "python", "java", "react", "angular", "vue", "node",
            "sql", "mongodb", "docker", "kubernetes", "aws", "azure", "gcp",
            "html", "css", "typescript", "c++", "c#", "ruby", "php", "go"
        ]
        
        categorized_technical = []
        categorized_soft = []
        
        for skill in all_skills:
            if any(keyword in skill.lower() for keyword in technical_keywords):
                categorized_technical.append(skill)
            else:
                categorized_soft.append(skill)
        
        # Validate categorization
        assert len(categorized_technical) > 0
        assert len(categorized_soft) > 0
        
        # Most technical skills should be categorized correctly
        correctly_categorized = sum(1 for skill in expected_technical if skill in categorized_technical)
        assert correctly_categorized >= len(expected_technical) * 0.8  # 80% accuracy

    def test_skills_deduplication(self):
        """Test deduplication of skills"""
        skills_with_duplicates = [
            "JavaScript", "javascript", "JS", "Python", "python",
            "React", "ReactJS", "React.js", "SQL", "sql"
        ]
        
        # Simple deduplication (normalize case)
        deduplicated = list(set(skill.lower() for skill in skills_with_duplicates))
        
        assert len(deduplicated) < len(skills_with_duplicates)
        assert "javascript" in deduplicated
        assert "python" in deduplicated

    def test_skills_formatting_for_template(self):
        """Test formatting skills for template rendering"""
        raw_skills = ["javascript", "PYTHON", "React.js", "node.js", "SQL"]
        
        # Format for display (title case, clean names)
        formatted_skills = []
        for skill in raw_skills:
            # Simple formatting logic
            formatted = skill.replace(".js", "").title()
            if formatted not in formatted_skills:
                formatted_skills.append(formatted)
        
        assert "Javascript" in formatted_skills
        assert "Python" in formatted_skills
        assert "React" in formatted_skills
        assert "Node" in formatted_skills


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
