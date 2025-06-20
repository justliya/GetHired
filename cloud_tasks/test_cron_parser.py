#!/usr/bin/env python3
"""
Test script for CronParser functionality without requiring Google Cloud credentials
"""

import os
import sys
from datetime import datetime
import pytz

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

from scheduler import CronParser

def test_cron_parser():
    """Test the CronParser class functionality"""
    print("🧪 Testing CRON Parser...")
    
    parser = CronParser()
    
    # Test schedule conversion
    test_cases = [
        {
            'name': 'Daily',
            'config': {'frequency': 'Daily', 'customSchedule': '09:00'},
            'expected': '0 9 * * *'
        },
        {
            'name': 'Weekly',
            'config': {'frequency': 'Weekly', 'customSchedule': '1,10:30'},
            'expected': '30 10 * * 1'
        },
        {
            'name': 'Monthly',
            'config': {'frequency': 'Monthly', 'customSchedule': '15,14:00'},
            'expected': '0 14 15 * *'
        },
        {
            'name': 'Custom',
            'config': {'frequency': 'Custom', 'customSchedule': '0 */2 * * *'},
            'expected': '0 */2 * * *'
        }
    ]
    
    results = []
    for test in test_cases:
        try:
            result = parser.schedule_to_cron(test['config'])
            success = result == test['expected']
            status = "✅" if success else "❌"
            print(f"  {status} {test['name']}: {result} (expected: {test['expected']})")
            results.append(success)
        except Exception as e:
            print(f"  ❌ {test['name']}: Error - {e}")
            results.append(False)
    
    # Test next run time calculation
    print("\n  Testing next run time calculation...")
    try:
        next_run = parser.get_next_run_time('0 9 * * *')
        print(f"  ✅ Next run for '0 9 * * *': {next_run}")
        results.append(True)
    except Exception as e:
        print(f"  ❌ Next run time calculation failed: {e}")
        results.append(False)
    
    # Test cron expression parsing
    print("\n  Testing cron expression parsing...")
    try:
        parsed = parser.parse_cron_expression('30 14 * * 1-5')
        print(f"  ✅ Parsed '30 14 * * 1-5': minute={parsed['minute']}, hour={parsed['hour']}, weekday={parsed['weekday']}")
        results.append(True)
    except Exception as e:
        print(f"  ❌ Cron parsing failed: {e}")
        results.append(False)
    
    # Summary
    passed = sum(results)
    total = len(results)
    print(f"\n📊 Test Summary: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed!")
        return True
    else:
        print("⚠️  Some tests failed")
        return False

def test_mailchimp_basics():
    """Test MailChimp service basic functionality"""
    print("\n🧪 Testing MailChimp Service...")
    
    try:
        from mailchimp_service import MailChimpService
        
        # Check if we have the required environment variables
        api_key = os.getenv('MAILCHIMP_API_KEY')
        server_prefix = os.getenv('MAILCHIMP_SERVER_PREFIX')
        list_id = os.getenv('MAILCHIMP_LIST_ID')
        
        if not all([api_key, server_prefix, list_id]):
            print("  ⚠️  MailChimp environment variables not set - skipping MailChimp tests")
            return True
        
        # Initialize service
        service = MailChimpService()
        print("  ✅ MailChimp service initialized successfully")
        
        # Test job listing formatting
        mock_jobs = [
            {
                'title': 'Software Engineer',
                'company': 'Tech Corp',
                'location': 'San Francisco, CA',
                'url': 'https://example.com/job1',
                'description': 'Great opportunity for a software engineer...'
            },
            {
                'title': 'Data Scientist',
                'company': 'Data Inc',
                'location': 'New York, NY',
                'url': 'https://example.com/job2',
                'description': 'Looking for an experienced data scientist...'
            }
        ]
        
        # Test different formats
        cards_html = service._format_jobs_as_cards(mock_jobs)
        list_html = service._format_jobs_as_list(mock_jobs)
        table_html = service._format_jobs_as_table(mock_jobs)
        
        print(f"  ✅ Generated job cards HTML ({len(cards_html)} characters)")
        print(f"  ✅ Generated job list HTML ({len(list_html)} characters)")
        print(f"  ✅ Generated job table HTML ({len(table_html)} characters)")
        
        return True
        
    except ImportError:
        print("  ⚠️  MailChimp service not available - skipping tests")
        return True
    except Exception as e:
        print(f"  ❌ MailChimp service test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 GetHired Scheduler Component Tests")
    print("=" * 50)
    
    # Test CronParser
    cron_success = test_cron_parser()
    
    # Test MailChimp basics
    mailchimp_success = test_mailchimp_basics()
    
    # Overall result
    print("\n" + "=" * 50)
    if cron_success and mailchimp_success:
        print("🎉 All component tests passed!")
        sys.exit(0)
    else:
        print("❌ Some tests failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
