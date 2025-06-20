"""
Test suite for resume parsing and document generation functionality
Consolidates: test_resume_parsing.py, test_parser_direct.py, test_parsing_direct.py, 
test_truncated_parsing.py, test_exact_input.py, test_actual_input_structure.py
"""
import pytest
import sys
import os
import json
import tempfile
from typing import Dict, Any, List

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.conftest import (
    sample_resume_text, 
    sample_parsed_resume, 
    temp_directory,
    assert_resume_structure,
    create_test_docx_file
)

try:
    from resume.parse import ParsedResume
    from resume.resume_doc import create_formatted_resume
except ImportError as e:
    pytest.skip(f"Resume modules not available: {e}", allow_module_level=True)


class TestResumeParsingBasic:
    """Test basic resume parsing functionality"""

    def test_parse_simple_resume(self, sample_resume_text):
        """Test parsing a simple resume text"""
        parsed = ParsedResume(sample_resume_text)
        
        # Basic structure validation
        assert hasattr(parsed, 'name')
        assert hasattr(parsed, 'email')
        assert hasattr(parsed, 'technical_skills')
        
        # Content validation
        assert parsed.name
        assert '@' in parsed.email
        assert len(parsed.technical_skills) > 0

    def test_parse_resume_with_missing_sections(self):
        """Test parsing resume with missing optional sections"""
        minimal_resume = """John Smith
john@example.com
Software Developer with 3 years experience.
"""
        parsed = ParsedResume(minimal_resume)
        
        assert parsed.name == "John Smith"
        assert parsed.email == "john@example.com"
        # Should handle missing sections gracefully

    def test_parse_resume_skills_extraction(self, sample_resume_text):
        """Test that skills are properly extracted and categorized"""
        parsed = ParsedResume(sample_resume_text)
        
        # Technical skills should be extracted
        technical_skills = getattr(parsed, 'technical_skills', [])
        assert isinstance(technical_skills, list)
        assert len(technical_skills) > 0
        
        # Should contain expected skills from sample
        expected_skills = ['JavaScript', 'Python', 'React']
        for skill in expected_skills:
            # Skills might be in different cases or formats
            found = any(skill.lower() in str(ts).lower() for ts in technical_skills)
            assert found, f"Expected skill '{skill}' not found in {technical_skills}"

    def test_parse_resume_experience_extraction(self, sample_resume_text):
        """Test that work experience is properly extracted"""
        parsed = ParsedResume(sample_resume_text)
        
        # Experience should be extracted
        experience = getattr(parsed, 'experience', [])
        assert isinstance(experience, list)
        
        if experience:  # If experience parsing is implemented
            for exp in experience:
                assert hasattr(exp, 'company') or 'company' in exp
                assert hasattr(exp, 'title') or 'title' in exp


class TestResumeParsingEdgeCases:
    """Test edge cases and error handling in resume parsing"""

    def test_parse_empty_resume(self):
        """Test handling of empty resume"""
        with pytest.raises((ValueError, AttributeError)) or pytest.warns():
            ParsedResume("")

    def test_parse_malformed_resume(self):
        """Test handling of malformed resume data"""
        malformed = "This is not a resume at all! Just random text without structure."
        parsed = ParsedResume(malformed)
        
        # Should not crash, but may have empty or default values
        assert hasattr(parsed, 'name')

    def test_parse_resume_with_special_characters(self):
        """Test resume parsing with special characters and encoding"""
        special_resume = """José García-López
josé.garcía@example.com | +1 (555) 123-4567
Software Engineer with expertise in C++, C#, and .NET development
"""
        parsed = ParsedResume(special_resume)
        
        assert "José" in parsed.name or "Jose" in parsed.name
        assert "@" in parsed.email

    def test_parse_very_long_resume(self):
        """Test parsing of very long resume"""
        long_resume = """John Doe
john@example.com
""" + "Very long experience description. " * 1000
        
        parsed = ParsedResume(long_resume)
        assert parsed.name == "John Doe"
        # Should handle long content without crashing

    def test_parse_resume_multiple_formats(self):
        """Test parsing resumes in different formats"""
        formats = [
            # Format 1: Traditional
            """John Smith
Email: john@example.com
Phone: 555-123-4567
Experience: 5 years in software development""",
            
            # Format 2: Modern
            """JOHN SMITH | Software Developer
📧 john@example.com | 📞 555-123-4567
🔧 Skills: Python, JavaScript, React""",
            
            # Format 3: Minimalist
            """John Smith
john@example.com
Python developer""",
        ]
        
        for i, resume_format in enumerate(formats):
            parsed = ParsedResume(resume_format)
            assert parsed.name, f"Failed to parse name in format {i+1}"
            assert parsed.email, f"Failed to parse email in format {i+1}"


class TestResumeDocumentGeneration:
    """Test resume document generation functionality"""

    def test_create_formatted_resume_basic(self, sample_parsed_resume, temp_directory):
        """Test basic formatted resume creation"""
        try:
            output_path = os.path.join(temp_directory, "test_resume.docx")
            result = create_formatted_resume(sample_parsed_resume, output_path)
            
            assert os.path.exists(output_path) or result is not None
        except ImportError:
            pytest.skip("Document generation dependencies not available")

    def test_create_formatted_resume_with_template(self, sample_parsed_resume, temp_directory):
        """Test formatted resume creation with custom template"""
        try:
            template_path = os.path.join(temp_directory, "template.docx")
            output_path = os.path.join(temp_directory, "output_resume.docx")
            
            # Create a basic template file
            create_test_docx_file("{{ candidate.name }}", template_path)
            
            if os.path.exists(template_path):
                result = create_formatted_resume(
                    sample_parsed_resume, 
                    output_path, 
                    template_path=template_path
                )
                assert result is not None
        except ImportError:
            pytest.skip("Document generation dependencies not available")


class TestResumeParsingIntegration:
    """Integration tests for resume parsing workflow"""

    def test_full_parsing_workflow(self, sample_resume_text):
        """Test the complete resume parsing workflow"""
        # Step 1: Parse the resume
        parsed = ParsedResume(sample_resume_text)
        
        # Step 2: Validate structure
        assert_resume_structure({
            'name': parsed.name,
            'email': parsed.email,
            'professional_summary': getattr(parsed, 'professional_summary', '')
        })
        
        # Step 3: Ensure skills are categorized
        technical_skills = getattr(parsed, 'technical_skills', [])
        soft_skills = getattr(parsed, 'soft_skills', [])
        
        assert isinstance(technical_skills, list)
        assert isinstance(soft_skills, list)

    def test_parsing_with_job_matching_data(self, sample_resume_text):
        """Test that parsed resume contains data useful for job matching"""
        parsed = ParsedResume(sample_resume_text)
        
        # Should have data useful for matching
        required_for_matching = [
            'technical_skills',
            'experience', 
            'education'
        ]
        
        for field in required_for_matching:
            data = getattr(parsed, field, None)
            # Field should exist and not be None/empty
            assert data is not None, f"Field {field} should exist for job matching"

    def test_resume_to_json_serialization(self, sample_resume_text):
        """Test that parsed resume can be serialized to JSON"""
        parsed = ParsedResume(sample_resume_text)
        
        try:
            # Try to convert to dict and then JSON
            if hasattr(parsed, 'to_dict'):
                resume_dict = parsed.to_dict()
            else:
                # Fallback: create dict from attributes
                resume_dict = {
                    'name': getattr(parsed, 'name', ''),
                    'email': getattr(parsed, 'email', ''),
                    'technical_skills': getattr(parsed, 'technical_skills', []),
                    'soft_skills': getattr(parsed, 'soft_skills', [])
                }
            
            json_str = json.dumps(resume_dict)
            assert json_str
            
            # Should be able to load back
            loaded = json.loads(json_str)
            assert loaded['name'] == resume_dict['name']
            
        except (TypeError, AttributeError) as e:
            pytest.fail(f"Resume serialization failed: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
