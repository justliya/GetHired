#!/usr/bin/env python3
"""
Complete test script for the job scheduler system
Tests cron parsing, Cloud Tasks creation, agent integration, and email sending
"""

import asyncio
import os
import sys
import json
from datetime import datetime, timedelta
from pathlib import Path

# Add the current directory to the path
sys.path.insert(0, str(Path(__file__).parent))

from scheduler import CloudTaskScheduler, CronParser
from mailchimp_service import MailChimpService


async def test_cron_parser():
    """Test the CRON parser functionality"""
    print("🧪 Testing CRON Parser...")
    
    parser = CronParser()
    
    test_cases = [
        # (schedule_config, expected_cron)
        ({"frequency": "Daily", "customSchedule": "09:00"}, "0 9 * * *"),
        ({"frequency": "Weekly", "customSchedule": "1,10:30"}, "30 10 * * 1"),
        ({"frequency": "Monthly", "customSchedule": "15,14:00"}, "0 14 15 * *"),
        ({"frequency": "Custom", "customSchedule": "0 */2 * * *"}, "0 */2 * * *"),
    ]
    
    for schedule_config, expected in test_cases:
        try:
            result = parser.schedule_to_cron(schedule_config)
            status = "✅" if result == expected else "❌"
            print(f"  {status} {schedule_config['frequency']}: {result} (expected: {expected})")
        except Exception as e:
            print(f"  ❌ {schedule_config['frequency']}: Error - {e}")
    
    # Test next run time calculation
    print("\n  Testing next run time calculation...")
    test_cron = "0 9 * * *"  # Daily at 9 AM
    try:
        next_run = parser.get_next_run_time(test_cron, timezone_str='America/New_York')
        print(f"  ✅ Next run for '{test_cron}': {next_run}")
    except Exception as e:
        print(f"  ❌ Next run calculation failed: {e}")


async def test_cloud_task_scheduler():
    """Test Cloud Task scheduler functionality"""
    print("\n🧪 Testing Cloud Task Scheduler...")
    
    scheduler = CloudTaskScheduler()
    
    # Test schedule configuration
    test_schedule = {
        "enabled": True,
        "frequency": "Daily",
        "customSchedule": "09:00",
        "notificationType": "Email",
        "quietHours": {
            "start": "22:00",
            "end": "08:00"
        },
        "timezone": "America/New_York",
        "preferences": {
            "titles": ["Software Engineer", "Python Developer"],
            "locations": ["San Francisco", "Remote"],
            "skills": ["Python", "FastAPI", "Docker"],
            "jobType": "Full-time",
            "seniority": "Mid",
            "salaryRange": {"min": 100000, "max": 150000}
        }
    }
    
    try:
        # Test next run time calculation
        next_run = scheduler._calculate_next_run_time(test_schedule)
        if next_run:
            print(f"  ✅ Next run time calculated: {next_run}")
        else:
            print("  ❌ Failed to calculate next run time")
        
        # Test agent prompt creation
        prompt = scheduler._create_agent_prompt(test_schedule)
        print(f"  ✅ Agent prompt created: {len(prompt)} characters")
        print(f"     Preview: {prompt[:100]}...")
        
        # Test task creation (dry run - don't actually create)
        if os.getenv('TEST_CLOUD_TASKS', 'false').lower() == 'true':
            result = scheduler.create_scheduled_task(
                schedule_id="test-schedule-123",
                schedule_config=test_schedule,
                target_url="https://example.com/api/v1/scheduled-search/execute"
            )
            
            if result.get("success"):
                print(f"  ✅ Cloud Task created: {result.get('task_id')}")
                print(f"     Next run: {result.get('next_run_at')}")
                print(f"     CRON: {result.get('cron_expression')}")
            else:
                print(f"  ❌ Cloud Task creation failed: {result.get('error')}")
        else:
            print("  ℹ️  Set TEST_CLOUD_TASKS=true to test actual Cloud Task creation")
            
    except Exception as e:
        print(f"  ❌ Scheduler test failed: {e}")


async def test_mailchimp_service():
    """Test MailChimp service functionality"""
    print("\n🧪 Testing MailChimp Service...")
    
    service = MailChimpService()
    
    if not service.client:
        print("  ⚠️  MailChimp not configured, skipping tests")
        return
    
    try:
        # Test connection
        connection_result = await service.test_connection()
        if connection_result.get('success'):
            print("  ✅ MailChimp connection successful")
        else:
            print(f"  ❌ MailChimp connection failed: {connection_result.get('error')}")
            return
        
        # Test template loading
        templates = service.templates
        print(f"  ✅ Loaded {len(templates)} email templates:")
        for template_name in templates.keys():
            print(f"     - {template_name}")
        
        # Test template selection
        test_cases = [
            (0, "No jobs"),
            (1, "Single job"),
            (3, "Few jobs"),
            (8, "Many jobs"),
            (15, "Lots of jobs")
        ]
        
        print("  🎯 Testing template selection:")
        for job_count, description in test_cases:
            try:
                selected = service._select_template(job_count, {})
                print(f"     {job_count} jobs ({description}): {selected}")
            except Exception as e:
                print(f"     ❌ Error selecting template for {job_count} jobs: {e}")
        
        # Test email sending (if email provided)
        test_email = os.getenv('TEST_EMAIL')
        if test_email:
            print(f"\n  📧 Testing email sending to {test_email}...")
            
            sample_jobs = [
                {
                    "title": "Senior Python Developer",
                    "company": "TechCorp",
                    "location": "San Francisco, CA",
                    "salary": "$130k - $170k",
                    "description": "Join our team building scalable web applications with Python, FastAPI, and React. We're looking for an experienced developer...",
                    "url": "https://example.com/job1",
                    "match_score": 95
                },
                {
                    "title": "Full Stack Engineer",
                    "company": "StartupXYZ",
                    "location": "Remote",
                    "salary": "$120k - $160k",
                    "description": "Remote-first company seeking a full stack engineer to work on our cutting-edge SaaS platform...",
                    "url": "https://example.com/job2",
                    "match_score": 88
                }
            ]
            
            sample_preferences = {
                "titles": ["Python Developer", "Full Stack Engineer"],
                "locations": ["San Francisco", "Remote"],
                "skills": ["Python", "FastAPI", "React"],
                "jobType": "Full-time"
            }
            
            email_result = await service.send_job_notification_email(
                user_email=test_email,
                user_name="Test User",
                jobs=sample_jobs,
                search_preferences=sample_preferences
            )
            
            if email_result.get('success'):
                print(f"  ✅ Test email sent successfully")
                if 'campaign_id' in email_result:
                    print(f"     Campaign ID: {email_result['campaign_id']}")
            else:
                print(f"  ❌ Email sending failed: {email_result.get('error')}")
        else:
            print("  ℹ️  Set TEST_EMAIL=your@email.com to test email sending")
            
    except Exception as e:
        print(f"  ❌ MailChimp test failed: {e}")


async def test_api_endpoints():
    """Test API endpoints"""
    print("\n🧪 Testing API Endpoints...")
    
    api_url = os.getenv('API_URL', 'http://localhost:8000')
    
    try:
        import requests
        
        # Test health endpoint
        response = requests.get(f"{api_url}/api/v1/health", timeout=5)
        if response.status_code == 200:
            print("  ✅ Health check endpoint working")
        else:
            print(f"  ❌ Health check failed: {response.status_code}")
        
        # Test MailChimp test endpoint
        response = requests.get(f"{api_url}/api/v1/mailchimp/test", timeout=10)
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("  ✅ MailChimp test endpoint working")
            else:
                print(f"  ❌ MailChimp test failed: {result.get('error')}")
        else:
            print(f"  ❌ MailChimp test endpoint failed: {response.status_code}")
        
        # Test task creation endpoint
        test_request = {
            "scheduleId": "test-api-schedule",
            "schedule": {
                "enabled": True,
                "frequency": "Daily",
                "customSchedule": "10:00",
                "timezone": "UTC"
            },
            "targetUrl": f"{api_url}/api/v1/scheduled-search/execute"
        }
        
        if os.getenv('TEST_TASK_CREATION', 'false').lower() == 'true':
            response = requests.post(
                f"{api_url}/api/v1/tasks/schedule",
                json=test_request,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"  ✅ Task creation endpoint working")
                print(f"     Task ID: {result.get('taskId')}")
                print(f"     Next run: {result.get('nextRunAt')}")
            else:
                print(f"  ❌ Task creation failed: {response.status_code} - {response.text}")
        else:
            print("  ℹ️  Set TEST_TASK_CREATION=true to test task creation")
            
    except requests.exceptions.ConnectionError:
        print(f"  ⚠️  API server not running at {api_url}")
    except Exception as e:
        print(f"  ❌ API test failed: {e}")


def check_environment():
    """Check environment configuration"""
    print("🔧 Checking Environment Configuration...")
    
    required_vars = {
        'GOOGLE_CLOUD_PROJECT': 'Google Cloud Project ID',
        'CLOUD_TASKS_LOCATION': 'Cloud Tasks Location',
        'CLOUD_TASKS_QUEUE': 'Cloud Tasks Queue Name'
    }
    
    mailchimp_vars = {
        'MAILCHIMP_API_KEY': 'MailChimp API Key',
        'MAILCHIMP_SERVER_PREFIX': 'MailChimp Server Prefix',
        'MAILCHIMP_LIST_ID': 'MailChimp List ID'
    }
    
    optional_vars = {
        'TEST_EMAIL': 'Test email address',
        'TEST_CLOUD_TASKS': 'Enable Cloud Tasks testing',
        'TEST_TASK_CREATION': 'Enable task creation testing',
        'API_URL': 'API server URL',
        'JOBSEARCH_AGENT_URL': 'Job search agent URL'
    }
    
    print("\n  📋 Required Environment Variables:")
    all_required_present = True
    for var, desc in required_vars.items():
        value = os.getenv(var)
        if value:
            print(f"    ✅ {var}: {value}")
        else:
            print(f"    ❌ {var}: Not set ({desc})")
            all_required_present = False
    
    print("\n  📧 MailChimp Configuration:")
    mailchimp_configured = True
    for var, desc in mailchimp_vars.items():
        value = os.getenv(var)
        if value:
            masked_value = f"{'*' * max(len(value) - 4, 0)}{value[-4:]}" if len(value) > 4 else "****"
            print(f"    ✅ {var}: {masked_value}")
        else:
            print(f"    ❌ {var}: Not set ({desc})")
            mailchimp_configured = False
    
    print("\n  ⚙️  Optional Configuration:")
    for var, desc in optional_vars.items():
        value = os.getenv(var)
        if value:
            print(f"    ✅ {var}: {value}")
        else:
            print(f"    ➖ {var}: Not set ({desc})")
    
    return all_required_present, mailchimp_configured


async def main():
    """Run all tests"""
    print("🚀 GetHired Job Scheduler Test Suite")
    print("=" * 50)
    
    # Check environment
    env_ok, mailchimp_ok = check_environment()
    print()
    
    if not env_ok:
        print("⚠️  Some required environment variables are missing.")
        print("   Tests may not work correctly without proper configuration.")
        print()
    
    # Run tests
    await test_cron_parser()
    await test_cloud_task_scheduler()
    
    if mailchimp_ok:
        await test_mailchimp_service()
    else:
        print("\n⚠️  MailChimp not configured, skipping email tests")
    
    await test_api_endpoints()
    
    # Summary
    print("\n" + "=" * 50)
    print("🏁 Test Summary")
    print(f"Environment: {'✅' if env_ok else '❌'}")
    print(f"MailChimp: {'✅' if mailchimp_ok else '❌'}")
    print("\nTo run additional tests:")
    print("  export TEST_EMAIL=your@email.com")
    print("  export TEST_CLOUD_TASKS=true")
    print("  export TEST_TASK_CREATION=true")


if __name__ == "__main__":
    # Load environment variables from .env.local if it exists
    env_file = Path(__file__).parent.parent / '.env.local'
    if env_file.exists():
        print(f"📁 Loading environment from {env_file}")
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    if not os.getenv(key):  # Don't override existing env vars
                        os.environ[key] = value
        print()
    
    asyncio.run(main())
