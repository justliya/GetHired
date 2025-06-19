"""
Test suite for integration workflows and end-to-end functionality
Consolidates: test_integration.py, test_complete_workflow.py, test_pipeline_fix.py
"""
import pytest
import sys
import os
import json
from typing import Dict, Any, List

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.conftest import (
    sample_resume_text,
    sample_job_description,
    sample_user_preferences,
    sample_job_listings,
    sample_parsed_resume,
    assert_resume_structure,
    assert_job_match_quality
)

# Try to import actual modules, fall back to mocks if not available
try:
    from resume.parse import ParsedResume
    from resume.resume_doc import create_formatted_resume
    RESUME_MODULES_AVAILABLE = True
except ImportError:
    RESUME_MODULES_AVAILABLE = False

try:
    from job_listing.agent import JobListingAgent
    JOB_MODULES_AVAILABLE = True
except ImportError:
    JOB_MODULES_AVAILABLE = False


class TestCompleteWorkflow:
    """Test complete end-to-end workflow"""

    @pytest.mark.skipif(not RESUME_MODULES_AVAILABLE, reason="Resume modules not available")
    def test_full_resume_processing_workflow(self, sample_resume_text):
        """Test the complete resume processing workflow"""
        # Step 1: Parse resume
        parsed_resume = ParsedResume(sample_resume_text)
        
        # Step 2: Validate basic structure
        assert hasattr(parsed_resume, 'name')
        assert hasattr(parsed_resume, 'email')
        assert parsed_resume.name
        assert '@' in parsed_resume.email
        
        # Step 3: Extract skills
        technical_skills = getattr(parsed_resume, 'technical_skills', [])
        soft_skills = getattr(parsed_resume, 'soft_skills', [])
        
        assert isinstance(technical_skills, list)
        assert isinstance(soft_skills, list)
        
        # Step 4: Validate data for job matching
        resume_dict = {
            'name': parsed_resume.name,
            'email': parsed_resume.email,
            'technical_skills': technical_skills,
            'soft_skills': soft_skills,
            'professional_summary': getattr(parsed_resume, 'professional_summary', ''),
            'experience': getattr(parsed_resume, 'experience', []),
            'education': getattr(parsed_resume, 'education', [])
        }
        
        assert_resume_structure(resume_dict)
        
        # Step 5: Ensure serializable for API
        json_str = json.dumps(resume_dict, default=str)
        loaded_back = json.loads(json_str)
        assert loaded_back['name'] == resume_dict['name']

    def test_job_matching_workflow(self, sample_parsed_resume, sample_job_listings):
        """Test job matching workflow"""
        resume = sample_parsed_resume
        jobs = sample_job_listings
        
        # Simple job matching logic (would be more sophisticated in real implementation)
        matches = []
        
        for job in jobs:
            match_score = self._calculate_simple_match_score(resume, job)
            matches.append({
                'job': job,
                'score': match_score,
                'matching_skills': self._find_matching_skills(resume, job)
            })
        
        # Validate match results
        assert len(matches) == len(jobs)
        
        for match in matches:
            assert_job_match_quality(match['score'])
            assert isinstance(match['matching_skills'], list)
            assert 'job' in match
            assert match['job']['id']

    def test_user_preferences_integration(self, sample_user_preferences, sample_job_listings):
        """Test integration with user preferences"""
        preferences = sample_user_preferences
        jobs = sample_job_listings
        
        # Filter jobs based on preferences
        filtered_jobs = []
        
        for job in jobs:
            # Check location preference
            if preferences['locations']:
                location_match = any(
                    loc.lower() in job['location'].lower() 
                    for loc in preferences['locations']
                )
                if not location_match:
                    continue
            
            # Check title preference
            if preferences['job_titles']:
                title_match = any(
                    title.lower() in job['title'].lower() 
                    for title in preferences['job_titles']
                )
                if not title_match:
                    continue
            
            # Check technology preferences
            if preferences['technologies']:
                tech_match = any(
                    tech.lower() in job['description'].lower() 
                    for tech in preferences['technologies']
                )
                if tech_match:
                    filtered_jobs.append(job)
        
        # Should have some filtered results based on preferences
        assert len(filtered_jobs) > 0
        
        # Validate that filtered jobs match preferences
        for job in filtered_jobs:
            assert any(tech.lower() in job['description'].lower() for tech in preferences['technologies'])

    def test_complete_pipeline_with_error_handling(self, sample_resume_text):
        """Test complete pipeline with error handling"""
        try:
            # Step 1: Try to parse resume
            if RESUME_MODULES_AVAILABLE:
                parsed_resume = ParsedResume(sample_resume_text)
                assert parsed_resume is not None
            else:
                # Mock parsing result
                parsed_resume = {
                    'name': 'Test User',
                    'email': 'test@example.com',
                    'technical_skills': ['Python', 'JavaScript']
                }
            
            # Step 2: Validate and clean data
            cleaned_data = self._clean_resume_data(parsed_resume)
            assert cleaned_data is not None
            
            # Step 3: Prepare for job matching
            matching_profile = self._create_matching_profile(cleaned_data)
            assert 'skills' in matching_profile
            assert 'experience_level' in matching_profile
            
        except Exception as e:
            pytest.fail(f"Pipeline failed with error: {e}")

    def _calculate_simple_match_score(self, resume: Dict[str, Any], job: Dict[str, Any]) -> float:
        """Simple job matching algorithm for testing"""
        score = 0.0
        max_score = 0.0
        
        # Match technical skills
        resume_skills = set(skill.lower() for skill in resume.get('technical_skills', []))
        job_requirements = set(req.lower() for req in job.get('requirements', []))
        
        max_score += len(job_requirements) if job_requirements else 1
        matching_skills = resume_skills.intersection(job_requirements)
        score += len(matching_skills)
        
        # Match experience level (simplified)
        experience = resume.get('experience', [])
        if len(experience) >= 2:  # Senior level
            if 'senior' in job['title'].lower():
                score += 1
        max_score += 1
        
        # Normalize score
        return min(score / max_score if max_score > 0 else 0, 1.0)

    def _find_matching_skills(self, resume: Dict[str, Any], job: Dict[str, Any]) -> List[str]:
        """Find matching skills between resume and job"""
        resume_skills = set(skill.lower() for skill in resume.get('technical_skills', []))
        job_requirements = set(req.lower() for req in job.get('requirements', []))
        
        return list(resume_skills.intersection(job_requirements))

    def _clean_resume_data(self, parsed_resume) -> Dict[str, Any]:
        """Clean and validate resume data"""
        if hasattr(parsed_resume, '__dict__'):
            # Object with attributes
            data = {
                'name': getattr(parsed_resume, 'name', ''),
                'email': getattr(parsed_resume, 'email', ''),
                'technical_skills': getattr(parsed_resume, 'technical_skills', []),
                'soft_skills': getattr(parsed_resume, 'soft_skills', []),
                'experience': getattr(parsed_resume, 'experience', []),
                'education': getattr(parsed_resume, 'education', [])
            }
        else:
            # Dictionary
            data = parsed_resume.copy()
        
        # Clean and validate
        data['name'] = data.get('name', '').strip()
        data['email'] = data.get('email', '').strip()
        data['technical_skills'] = list(filter(None, data.get('technical_skills', [])))
        data['soft_skills'] = list(filter(None, data.get('soft_skills', [])))
        
        return data

    def _create_matching_profile(self, resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a profile for job matching"""
        experience_count = len(resume_data.get('experience', []))
        
        # Determine experience level
        if experience_count >= 3:
            experience_level = 'Senior'
        elif experience_count >= 1:
            experience_level = 'Mid-level'
        else:
            experience_level = 'Entry-level'
        
        return {
            'skills': resume_data.get('technical_skills', []) + resume_data.get('soft_skills', []),
            'experience_level': experience_level,
            'education': resume_data.get('education', []),
            'name': resume_data.get('name', ''),
            'email': resume_data.get('email', '')
        }


class TestIntegrationErrorHandling:
    """Test error handling in integration scenarios"""

    def test_handle_malformed_job_data(self):
        """Test handling of malformed job data"""
        malformed_jobs = [
            {},  # Empty job
            {'title': 'Developer'},  # Missing fields
            {'id': 'job-1', 'title': None, 'company': 'TechCorp'},  # Null values
            {'id': 'job-2', 'title': 'Developer', 'requirements': 'Not a list'}  # Wrong type
        ]
        
        # Should handle malformed data gracefully
        valid_jobs = []
        for job in malformed_jobs:
            try:
                # Basic validation
                if (job.get('id') and job.get('title') and 
                    isinstance(job.get('title'), str) and job['title'].strip()):
                    valid_jobs.append(job)
            except Exception:
                continue  # Skip malformed jobs
        
        # Should have filtered out invalid jobs
        assert len(valid_jobs) < len(malformed_jobs)

    def test_handle_missing_resume_sections(self):
        """Test handling of resumes with missing sections"""
        incomplete_resumes = [
            {'name': 'John Doe'},  # Only name
            {'name': 'Jane Smith', 'email': 'jane@example.com'},  # No skills
            {'name': 'Bob Wilson', 'technical_skills': ['Python']},  # No email
        ]
        
        for resume in incomplete_resumes:
            try:
                cleaned = self._clean_resume_data(resume)
                
                # Should have default values for missing fields
                assert 'name' in cleaned
                assert 'email' in cleaned
                assert 'technical_skills' in cleaned
                assert isinstance(cleaned['technical_skills'], list)
                
            except Exception as e:
                pytest.fail(f"Failed to handle incomplete resume {resume}: {e}")

    def test_api_response_validation(self):
        """Test validation of API responses"""
        sample_responses = [
            {'jobs': []},  # Empty results
            {'jobs': [{'id': 'job-1', 'title': 'Developer'}]},  # Valid
            {'error': 'API Error'},  # Error response
            {},  # Empty response
            None  # Null response
        ]
        
        for response in sample_responses:
            validated = self._validate_api_response(response)
            
            # Should always return a valid structure
            assert isinstance(validated, dict)
            assert 'jobs' in validated
            assert isinstance(validated['jobs'], list)

    def _validate_api_response(self, response) -> Dict[str, Any]:
        """Validate and normalize API response"""
        if not response or not isinstance(response, dict):
            return {'jobs': [], 'error': 'Invalid response'}
        
        if 'error' in response:
            return {'jobs': [], 'error': response['error']}
        
        jobs = response.get('jobs', [])
        if not isinstance(jobs, list):
            return {'jobs': [], 'error': 'Invalid jobs format'}
        
        return {'jobs': jobs}

    def _clean_resume_data(self, resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """Clean resume data (duplicate helper method for this test class)"""
        return {
            'name': resume_data.get('name', ''),
            'email': resume_data.get('email', ''),
            'technical_skills': resume_data.get('technical_skills', []),
            'soft_skills': resume_data.get('soft_skills', []),
            'experience': resume_data.get('experience', []),
            'education': resume_data.get('education', [])
        }


class TestPerformanceIntegration:
    """Test performance aspects of integration workflows"""

    def test_large_resume_processing(self):
        """Test processing of large resumes"""
        # Create a large resume with lots of data
        large_resume_data = {
            'name': 'John Doe',
            'email': 'john@example.com',
            'technical_skills': [f'Skill_{i}' for i in range(100)],  # 100 skills
            'soft_skills': [f'Soft_Skill_{i}' for i in range(50)],   # 50 soft skills
            'experience': [
                {
                    'title': f'Position_{i}',
                    'company': f'Company_{i}',
                    'responsibilities': [f'Task_{j}' for j in range(10)]  # 10 tasks each
                } for i in range(20)  # 20 positions
            ],
            'education': [{'degree': f'Degree_{i}', 'school': f'School_{i}'} for i in range(5)]
        }
        
        # Should handle large data efficiently
        try:
            cleaned = self._clean_resume_data(large_resume_data)
            assert len(cleaned['technical_skills']) <= 100
            assert len(cleaned['experience']) <= 20
            
            # Performance check: should complete quickly
            import time
            start_time = time.time()
            
            # Simulate some processing
            profile = self._create_matching_profile(cleaned)
            
            end_time = time.time()
            processing_time = end_time - start_time
            
            # Should complete within reasonable time (adjust threshold as needed)
            assert processing_time < 1.0, f"Processing took too long: {processing_time}s"
            
        except Exception as e:
            pytest.fail(f"Failed to process large resume: {e}")

    def test_multiple_job_matching(self, sample_parsed_resume):
        """Test matching against multiple jobs"""
        resume = sample_parsed_resume
        
        # Create multiple test jobs
        test_jobs = []
        for i in range(50):  # 50 jobs
            test_jobs.append({
                'id': f'job-{i}',
                'title': f'Developer {i}',
                'company': f'Company {i}',
                'location': 'Remote',
                'requirements': ['Python', 'JavaScript', 'React'][i % 3:i % 3 + 2]
            })
        
        # Should handle multiple matches efficiently
        try:
            matches = []
            
            import time
            start_time = time.time()
            
            for job in test_jobs:
                score = self._calculate_simple_match_score(resume, job)
                matches.append({'job': job, 'score': score})
            
            end_time = time.time()
            processing_time = end_time - start_time
            
            assert len(matches) == 50
            assert processing_time < 2.0, f"Matching took too long: {processing_time}s"
            
        except Exception as e:
            pytest.fail(f"Failed to match multiple jobs: {e}")

    def _clean_resume_data(self, resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """Clean resume data helper"""
        return {
            'name': resume_data.get('name', ''),
            'email': resume_data.get('email', ''),
            'technical_skills': resume_data.get('technical_skills', []),
            'soft_skills': resume_data.get('soft_skills', []),
            'experience': resume_data.get('experience', []),
            'education': resume_data.get('education', [])
        }

    def _create_matching_profile(self, resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create matching profile helper"""
        return {
            'skills': resume_data.get('technical_skills', []) + resume_data.get('soft_skills', []),
            'experience_level': 'Mid-level',
            'name': resume_data.get('name', ''),
            'email': resume_data.get('email', '')
        }

    def _calculate_simple_match_score(self, resume: Dict[str, Any], job: Dict[str, Any]) -> float:
        """Simple match score calculation helper"""
        resume_skills = set(skill.lower() for skill in resume.get('technical_skills', []))
        job_requirements = set(req.lower() for req in job.get('requirements', []))
        
        if not job_requirements:
            return 0.5  # Neutral score for jobs without requirements
        
        matching_skills = resume_skills.intersection(job_requirements)
        return len(matching_skills) / len(job_requirements)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
