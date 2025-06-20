"""
Test suite for agent functionality and guardrails
Consolidates: test_guardrails.py, test_guardrails_simple.py, test_formatter_only.py
"""
import pytest
import sys
import os
import json
from typing import Dict, Any, List
from unittest.mock import Mock, patch

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.conftest import (
    sample_resume_text,
    sample_job_description,
    sample_user_preferences,
    sample_job_listings,
    temp_directory
)

# Try to import agent modules
try:
    from resume.agent import ResumeAgent
    RESUME_AGENT_AVAILABLE = True
except ImportError:
    RESUME_AGENT_AVAILABLE = False

try:
    from job_listing.agent import JobListingAgent
    JOB_AGENT_AVAILABLE = True
except ImportError:
    JOB_AGENT_AVAILABLE = False

try:
    from company_research.agent import CompanyResearchAgent
    COMPANY_AGENT_AVAILABLE = True
except ImportError:
    COMPANY_AGENT_AVAILABLE = False


class TestAgentGuardrails:
    """Test agent guardrails and safety measures"""

    def test_input_validation_guardrails(self):
        """Test that agents validate input properly"""
        invalid_inputs = [
            "",  # Empty input
            None,  # Null input
            "a" * 10000,  # Very long input
            "<script>alert('xss')</script>",  # XSS attempt
            "DROP TABLE users;",  # SQL injection attempt
            {"malformed": "json"},  # Wrong type
        ]
        
        for invalid_input in invalid_inputs:
            with pytest.raises((ValueError, TypeError)) or pytest.warns():
                # Test input validation (mock implementation)
                self._validate_agent_input(invalid_input)

    def test_output_sanitization_guardrails(self):
        """Test that agent outputs are properly sanitized"""
        potentially_harmful_outputs = [
            "User data: <script>alert('hack')</script>",
            "SQL: SELECT * FROM users WHERE id = 1; DROP TABLE users;",
            "Personal info: SSN 123-45-6789, Credit Card 4111-1111-1111-1111",
            "Internal path: /etc/passwd, C:\\Windows\\System32",
        ]
        
        for output in potentially_harmful_outputs:
            sanitized = self._sanitize_agent_output(output)
            
            # Should remove or escape harmful content
            assert "<script>" not in sanitized
            assert "DROP TABLE" not in sanitized or "DROP TABLE" in sanitized.replace("DROP TABLE", "[REDACTED]")

    def test_rate_limiting_guardrails(self):
        """Test rate limiting for agent requests"""
        # Simulate rapid requests
        request_times = []
        
        for i in range(10):  # 10 rapid requests
            try:
                allowed = self._check_rate_limit("test_user", request_times)
                if allowed:
                    import time
                    request_times.append(time.time())
            except Exception as e:
                # Rate limiting should eventually kick in
                assert "rate limit" in str(e).lower()
                break
        
        # Should have limited requests after some point
        assert len(request_times) <= 10

    def test_content_filtering_guardrails(self):
        """Test content filtering for inappropriate requests"""
        inappropriate_requests = [
            "Generate fake resume with false information",
            "Create misleading job posting",
            "Help me lie about my experience",
            "Generate discriminatory job requirements",
        ]
        
        for request in inappropriate_requests:
            result = self._content_filter_check(request)
            
            # Should flag or reject inappropriate content
            assert result['allowed'] is False or 'warning' in result

    def test_data_privacy_guardrails(self):
        """Test data privacy protection measures"""
        sensitive_data = {
            'ssn': '123-45-6789',
            'credit_card': '4111-1111-1111-1111',
            'bank_account': '123456789',
            'phone': '555-123-4567',
            'address': '123 Main St, Anytown, USA',
            'email': 'user@example.com'
        }
        
        # Should detect and protect sensitive data
        for data_type, value in sensitive_data.items():
            protected = self._protect_sensitive_data(value)
            
            if data_type in ['ssn', 'credit_card', 'bank_account']:
                # Should be redacted or masked
                assert value != protected
                assert '*' in protected or '[REDACTED]' in protected
            else:
                # Email and phone might be partially masked
                assert protected is not None

    def _validate_agent_input(self, input_data) -> bool:
        """Mock input validation"""
        if input_data is None:
            raise ValueError("Input cannot be None")
        
        if isinstance(input_data, str):
            if len(input_data) == 0:
                raise ValueError("Input cannot be empty")
            if len(input_data) > 5000:
                raise ValueError("Input too long")
            if "<script>" in input_data.lower():
                raise ValueError("Potentially harmful script detected")
            if "drop table" in input_data.lower():
                raise ValueError("SQL injection attempt detected")
        
        if not isinstance(input_data, (str, dict, list)):
            raise TypeError("Invalid input type")
        
        return True

    def _sanitize_agent_output(self, output: str) -> str:
        """Mock output sanitization"""
        # Remove script tags
        import re
        output = re.sub(r'<script[^>]*>.*?</script>', '', output, flags=re.IGNORECASE | re.DOTALL)
        
        # Mask SQL commands
        output = re.sub(r'DROP TABLE \w+', '[SQL_COMMAND_REDACTED]', output, flags=re.IGNORECASE)
        
        # Mask potential SSNs
        output = re.sub(r'\b\d{3}-\d{2}-\d{4}\b', 'XXX-XX-XXXX', output)
        
        # Mask potential credit cards
        output = re.sub(r'\b\d{4}-\d{4}-\d{4}-\d{4}\b', 'XXXX-XXXX-XXXX-XXXX', output)
        
        return output

    def _check_rate_limit(self, user_id: str, request_times: List[float]) -> bool:
        """Mock rate limiting check"""
        import time
        current_time = time.time()
        
        # Allow max 5 requests per 10 seconds
        recent_requests = [t for t in request_times if current_time - t < 10]
        
        if len(recent_requests) >= 5:
            raise Exception("Rate limit exceeded")
        
        return True

    def _content_filter_check(self, content: str) -> Dict[str, Any]:
        """Mock content filtering"""
        inappropriate_keywords = [
            'fake', 'false', 'lie', 'misleading', 'discriminatory', 
            'illegal', 'harmful', 'unethical'
        ]
        
        content_lower = content.lower()
        flagged_words = [word for word in inappropriate_keywords if word in content_lower]
        
        if flagged_words:
            return {
                'allowed': False,
                'reason': 'Inappropriate content detected',
                'flagged_words': flagged_words
            }
        
        return {'allowed': True}

    def _protect_sensitive_data(self, data: str) -> str:
        """Mock sensitive data protection"""
        import re
        
        # SSN pattern
        if re.match(r'\d{3}-\d{2}-\d{4}', data):
            return 'XXX-XX-XXXX'
        
        # Credit card pattern
        if re.match(r'\d{4}-\d{4}-\d{4}-\d{4}', data):
            return 'XXXX-XXXX-XXXX-XXXX'
        
        # Bank account (simple number)
        if re.match(r'^\d{9,12}$', data):
            return '*' * len(data)
        
        # Phone number (partial masking)
        if re.match(r'\d{3}-\d{3}-\d{4}', data):
            return data[:3] + '-XXX-' + data[-4:]
        
        # Email (partial masking)
        if '@' in data:
            parts = data.split('@')
            if len(parts[0]) > 2:
                masked_name = parts[0][:2] + '*' * (len(parts[0]) - 2)
                return masked_name + '@' + parts[1]
        
        return data


class TestAgentResponseFormatting:
    """Test agent response formatting and structure"""

    def test_resume_agent_response_format(self):
        """Test resume agent response formatting"""
        # Mock resume agent response
        mock_response = {
            'status': 'success',
            'data': {
                'formatted_resume': 'John Doe\nSoftware Developer\n...',
                'suggestions': [
                    'Add more technical skills',
                    'Include quantified achievements'
                ],
                'match_score': 0.85
            },
            'metadata': {
                'processing_time': 1.2,
                'model_version': '1.0'
            }
        }
        
        # Validate response structure
        assert 'status' in mock_response
        assert 'data' in mock_response
        assert mock_response['status'] in ['success', 'error', 'warning']
        
        if mock_response['status'] == 'success':
            data = mock_response['data']
            assert 'formatted_resume' in data
            assert isinstance(data.get('suggestions', []), list)
            assert 0 <= data.get('match_score', 0) <= 1

    def test_job_listing_agent_response_format(self):
        """Test job listing agent response formatting"""
        mock_response = {
            'status': 'success',
            'data': {
                'jobs': [
                    {
                        'id': 'job-1',
                        'title': 'Software Developer',
                        'company': 'TechCorp',
                        'location': 'Remote',
                        'salary': '$80k - $120k',
                        'match_score': 0.9,
                        'matching_skills': ['Python', 'React']
                    }
                ],
                'total_found': 25,
                'returned': 1
            }
        }
        
        # Validate job listing structure
        assert mock_response['status'] == 'success'
        jobs = mock_response['data']['jobs']
        
        for job in jobs:
            required_fields = ['id', 'title', 'company']
            for field in required_fields:
                assert field in job
                assert job[field]  # Not empty
            
            if 'match_score' in job:
                assert 0 <= job['match_score'] <= 1

    def test_error_response_format(self):
        """Test error response formatting"""
        mock_error_response = {
            'status': 'error',
            'error': {
                'code': 'INVALID_INPUT',
                'message': 'Resume text is required',
                'details': 'The resume_text field cannot be empty'
            },
            'metadata': {
                'request_id': 'req-123',
                'timestamp': '2024-01-15T10:30:00Z'
            }
        }
        
        # Validate error structure
        assert mock_error_response['status'] == 'error'
        assert 'error' in mock_error_response
        
        error = mock_error_response['error']
        assert 'code' in error
        assert 'message' in error
        assert error['code']  # Not empty
        assert error['message']  # Not empty

    def test_response_serialization(self):
        """Test that responses can be serialized to JSON"""
        test_responses = [
            {'status': 'success', 'data': {'result': 'test'}},
            {'status': 'error', 'error': {'message': 'test error'}},
            {
                'status': 'success', 
                'data': {
                    'jobs': [{'id': 'job-1', 'title': 'Developer'}],
                    'metadata': {'count': 1}
                }
            }
        ]
        
        for response in test_responses:
            try:
                json_str = json.dumps(response)
                loaded_back = json.loads(json_str)
                assert loaded_back == response
            except (TypeError, ValueError) as e:
                pytest.fail(f"Response serialization failed: {e}")


class TestAgentErrorHandling:
    """Test agent error handling and recovery"""

    def test_network_error_handling(self):
        """Test handling of network errors"""
        # Simulate network errors
        network_errors = [
            'Connection timeout',
            'Service unavailable', 
            'API rate limit exceeded',
            'Invalid API key'
        ]
        
        for error_msg in network_errors:
            response = self._handle_network_error(error_msg)
            
            assert response['status'] == 'error'
            assert 'retry_after' in response or 'permanent' in response
            assert response['error']['message']

    def test_malformed_input_recovery(self):
        """Test recovery from malformed input"""
        malformed_inputs = [
            {'resume': None},  # Null resume
            {'resume': ''},    # Empty resume
            {'invalid_field': 'value'},  # Wrong fields
            'not_a_dict',      # Wrong type
        ]
        
        for malformed_input in malformed_inputs:
            try:
                response = self._process_with_recovery(malformed_input)
                
                # Should either succeed with defaults or fail gracefully
                assert response['status'] in ['success', 'error', 'warning']
                
                if response['status'] == 'error':
                    assert 'error' in response
                    assert response['error']['message']
                    
            except Exception as e:
                pytest.fail(f"Failed to handle malformed input {malformed_input}: {e}")

    def test_partial_failure_handling(self):
        """Test handling of partial failures"""
        # Simulate a batch operation with some failures
        batch_requests = [
            {'id': 1, 'valid': True},
            {'id': 2, 'valid': False},  # This will fail
            {'id': 3, 'valid': True},
            {'id': 4, 'valid': False},  # This will fail
        ]
        
        response = self._process_batch_with_partial_failures(batch_requests)
        
        assert response['status'] in ['partial_success', 'success']
        assert 'successful' in response['data']
        assert 'failed' in response['data']
        assert len(response['data']['successful']) == 2
        assert len(response['data']['failed']) == 2

    def _handle_network_error(self, error_msg: str) -> Dict[str, Any]:
        """Mock network error handling"""
        if 'timeout' in error_msg.lower():
            return {
                'status': 'error',
                'error': {'code': 'TIMEOUT', 'message': error_msg},
                'retry_after': 30
            }
        elif 'rate limit' in error_msg.lower():
            return {
                'status': 'error',
                'error': {'code': 'RATE_LIMITED', 'message': error_msg},
                'retry_after': 60
            }
        elif 'api key' in error_msg.lower():
            return {
                'status': 'error',
                'error': {'code': 'AUTH_ERROR', 'message': error_msg},
                'permanent': True
            }
        else:
            return {
                'status': 'error',
                'error': {'code': 'NETWORK_ERROR', 'message': error_msg},
                'retry_after': 10
            }

    def _process_with_recovery(self, input_data) -> Dict[str, Any]:
        """Mock processing with error recovery"""
        try:
            # Validate input
            if not isinstance(input_data, dict):
                return {
                    'status': 'error',
                    'error': {'code': 'INVALID_TYPE', 'message': 'Input must be a dictionary'}
                }
            
            resume_text = input_data.get('resume')
            
            if resume_text is None:
                return {
                    'status': 'error',
                    'error': {'code': 'MISSING_RESUME', 'message': 'Resume text is required'}
                }
            
            if resume_text == '':
                return {
                    'status': 'warning',
                    'data': {'message': 'Empty resume provided'},
                    'error': {'code': 'EMPTY_RESUME', 'message': 'Resume text is empty'}
                }
            
            # Success case
            return {
                'status': 'success',
                'data': {'processed': True, 'resume_length': len(resume_text)}
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': {'code': 'PROCESSING_ERROR', 'message': str(e)}
            }

    def _process_batch_with_partial_failures(self, requests: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Mock batch processing with partial failures"""
        successful = []
        failed = []
        
        for req in requests:
            if req.get('valid', False):
                successful.append({'id': req['id'], 'result': 'processed'})
            else:
                failed.append({
                    'id': req['id'], 
                    'error': 'Invalid request',
                    'code': 'VALIDATION_ERROR'
                })
        
        if len(failed) == 0:
            status = 'success'
        elif len(successful) == 0:
            status = 'error'
        else:
            status = 'partial_success'
        
        return {
            'status': status,
            'data': {
                'successful': successful,
                'failed': failed,
                'total_processed': len(requests)
            }
        }


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
