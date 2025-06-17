#!/usr/bin/env python3
"""
Comprehensive test script for MailChimp integration
Tests both direct API and Firebase extension methods
"""

import asyncio
import os
import sys
import json
from typing import Dict, Any, List

# Add the current directory to the path so we can import our modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mailchimp_service import MailChimpService
from firebase_mailchimp_service import FirebaseMailChimpService

# Sample test data
SAMPLE_JOBS = [
    {
        "title": "Senior Software Engineer",
        "company": "Tech Corp",
        "location": "San Francisco, CA",
        "url": "https://example.com/job1",
        "description": "Join our team as a Senior Software Engineer working on cutting-edge projects with React, TypeScript, and Node.js. We offer competitive compensation and excellent benefits.",
        "salary": "$120k - $180k",
        "match_score": 95
    },
    {
        "title": "Frontend Developer",
        "company": "StartupXYZ",
        "location": "Remote",
        "url": "https://example.com/job2",
        "description": "We're looking for a talented Frontend Developer to help build the next generation of web applications. Experience with React and modern JavaScript required.",
        "salary": "$90k - $130k",
        "match_score": 88
    },
    {
        "title": "Full Stack Engineer",
        "company": "Innovation Labs",
        "location": "New York, NY",
        "url": "https://example.com/job3",
        "description": "Full Stack Engineer position working with React, Node.js, and cloud technologies. Great opportunity for growth in a fast-paced environment.",
        "salary": "$100k - $150k",
        "match_score": 92
    }
]

SAMPLE_PREFERENCES = {
    "titles": ["Software Engineer", "Frontend Developer", "Full Stack Engineer"],
    "locations": ["San Francisco", "Remote", "New York"],
    "skills": ["React", "TypeScript", "Node.js", "JavaScript"],
    "jobType": "Full-time"
}

async def test_direct_mailchimp():
    """Test direct MailChimp API service"""
    print("🧪 Testing Direct MailChimp API Service...")
    
    try:
        service = MailChimpService()
        
        # Test connection
        print("  📡 Testing connection...")
        connection_result = await service.test_connection()
        print(f"  Connection result: {json.dumps(connection_result, indent=2)}")
        
        if not connection_result.get('success'):
            print("  ❌ Connection test failed")
            return False
        
        # Test email sending (if you want to actually send)
        test_email = os.getenv('TEST_EMAIL')
        if test_email:
            print(f"  📧 Testing email sending to {test_email}...")
            email_result = await service.send_job_notification_email(
                user_email=test_email,
                user_name="Test User",
                jobs=SAMPLE_JOBS,
                search_preferences=SAMPLE_PREFERENCES
            )
            print(f"  Email result: {json.dumps(email_result, indent=2)}")
            
            if email_result.get('success'):
                print("  ✅ Direct MailChimp API test passed")
                return True
            else:
                print("  ❌ Email sending failed")
                return False
        else:
            print("  ℹ️  Set TEST_EMAIL environment variable to test email sending")
            print("  ✅ Direct MailChimp API connection test passed")
            return True
            
    except Exception as e:
        print(f"  ❌ Direct MailChimp API test failed: {e}")
        return False

async def test_firebase_mailchimp():
    """Test Firebase MailChimp extension service"""
    print("🧪 Testing Firebase MailChimp Extension Service...")
    
    try:
        service = FirebaseMailChimpService()
        
        # Test connection
        print("  📡 Testing connection...")
        connection_result = await service.test_connection()
        print(f"  Connection result: {json.dumps(connection_result, indent=2)}")
        
        if not connection_result.get('success'):
            print("  ❌ Connection test failed")
            return False
        
        # Test email queuing (if you want to actually queue)
        test_email = os.getenv('TEST_EMAIL')
        if test_email:
            print(f"  📧 Testing email queuing for {test_email}...")
            email_result = await service.send_job_notification_email(
                user_email=test_email,
                user_name="Test User",
                jobs=SAMPLE_JOBS,
                search_preferences=SAMPLE_PREFERENCES
            )
            print(f"  Email result: {json.dumps(email_result, indent=2)}")
            
            if email_result.get('success'):
                print("  ✅ Firebase MailChimp extension test passed")
                
                # Check document status
                doc_id = email_result.get('document_id')
                if doc_id:
                    print(f"  📄 Checking document status for {doc_id}...")
                    status_result = service.get_email_status(doc_id)
                    print(f"  Status result: {json.dumps(status_result, indent=2)}")
                
                return True
            else:
                print("  ❌ Email queuing failed")
                return False
        else:
            print("  ℹ️  Set TEST_EMAIL environment variable to test email queuing")
            print("  ✅ Firebase MailChimp extension connection test passed")
            return True
            
    except Exception as e:
        print(f"  ❌ Firebase MailChimp extension test failed: {e}")
        return False

def test_template_loading():
    """Test email template loading"""
    print("🧪 Testing Email Template Loading...")
    
    try:
        service = FirebaseMailChimpService()  # Both services use same template loading
        templates = service.templates
        
        print(f"  📄 Loaded {len(templates)} templates:")
        for template_name in templates.keys():
            print(f"    - {template_name}")
        
        # Test template selection logic
        test_cases = [
            (0, "No jobs"),
            (1, "Single job"),
            (3, "Few jobs"),
            (5, "Moderate jobs"),
            (10, "Many jobs")
        ]
        
        print("  🎯 Testing template selection:")
        for job_count, description in test_cases:
            selected = service._select_template(job_count, SAMPLE_PREFERENCES)
            print(f"    {job_count} jobs ({description}): {selected}")
        
        print("  ✅ Template loading test passed")
        return True
        
    except Exception as e:
        print(f"  ❌ Template loading test failed: {e}")
        return False

def check_environment():
    """Check environment configuration"""
    print("🧪 Checking Environment Configuration...")
    
    required_vars = {
        'MAILCHIMP_API_KEY': 'MailChimp API Key',
        'MAILCHIMP_SERVER_PREFIX': 'MailChimp Server Prefix',
        'MAILCHIMP_LIST_ID': 'MailChimp List ID'
    }
    
    optional_vars = {
        'MAILCHIMP_FROM_EMAIL': 'MailChimp From Email',
        'MAILCHIMP_FROM_NAME': 'MailChimp From Name',
        'USE_MAILCHIMP_FIREBASE_EXTENSION': 'Use Firebase Extension',
        'MAILCHIMP_EXTENSION_COLLECTION': 'Firebase Extension Collection',
        'TEST_EMAIL': 'Test Email Address'
    }
    
    print("  📋 Required Environment Variables:")
    all_required_present = True
    for var, desc in required_vars.items():
        value = os.getenv(var)
        if value:
            print(f"    ✅ {var} ({desc}): {'*' * len(value)}")
        else:
            print(f"    ❌ {var} ({desc}): Not set")
            all_required_present = False
    
    print("  📋 Optional Environment Variables:")
    for var, desc in optional_vars.items():
        value = os.getenv(var)
        if value:
            if var == 'MAILCHIMP_API_KEY':
                print(f"    ✅ {var} ({desc}): {'*' * len(value)}")
            else:
                print(f"    ✅ {var} ({desc}): {value}")
        else:
            print(f"    ➖ {var} ({desc}): Not set (optional)")
    
    # Check Firebase extension mode
    use_extension = os.getenv('USE_MAILCHIMP_FIREBASE_EXTENSION', 'false').lower() == 'true'
    print(f"  🔧 Configuration Mode: {'Firebase Extension' if use_extension else 'Direct API'}")
    
    return all_required_present

async def main():
    """Run all tests"""
    print("🚀 Starting MailChimp Integration Tests\n")
    
    # Check environment
    env_ok = check_environment()
    print()
    
    if not env_ok:
        print("❌ Environment configuration incomplete. Please set required variables.")
        print("   You can copy .env.local.example to .env.local and fill in your values.")
        return
    
    # Test template loading
    template_ok = test_template_loading()
    print()
    
    # Test services based on configuration
    use_extension = os.getenv('USE_MAILCHIMP_FIREBASE_EXTENSION', 'false').lower() == 'true'
    
    if use_extension:
        print("🔧 Firebase Extension mode enabled - testing Firebase service")
        firebase_ok = await test_firebase_mailchimp()
    else:
        print("🔧 Direct API mode enabled - testing direct service")
        direct_ok = await test_direct_mailchimp()
        print()
        
        # Also test Firebase extension for completeness
        print("🔧 Also testing Firebase extension service...")
        firebase_ok = await test_firebase_mailchimp()
    
    print("\n🏁 Test Results Summary:")
    print(f"  Environment: {'✅' if env_ok else '❌'}")
    print(f"  Templates: {'✅' if template_ok else '❌'}")
    
    if use_extension:
        print(f"  Firebase Extension: {'✅' if firebase_ok else '❌'}")
    else:
        print(f"  Direct API: {'✅' if direct_ok else '❌'}")
        print(f"  Firebase Extension: {'✅' if firebase_ok else '❌'}")

if __name__ == "__main__":
    # Load environment variables from .env.local if it exists
    env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env.local')
    if os.path.exists(env_file):
        print(f"📁 Loading environment from {env_file}")
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    if not os.getenv(key):  # Don't override existing env vars
                        os.environ[key] = value
    
    asyncio.run(main())
