import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import os
from google.cloud import tasks_v2
from google.protobuf import timestamp_pb2
import pytz

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CloudTaskScheduler:
    def __init__(self):
        self.client = tasks_v2.CloudTasksClient()
        self.project = os.getenv('GOOGLE_CLOUD_PROJECT', 'gethired-project')
        self.location = os.getenv('CLOUD_TASKS_LOCATION', 'us-central1')
        self.queue = os.getenv('CLOUD_TASKS_QUEUE', 'scheduled-searches')
        self.parent = self.client.queue_path(self.project, self.location, self.queue)
        
    def create_scheduled_task(
        self, 
        schedule_id: str, 
        schedule_config: Dict[str, Any],
        target_url: str
    ) -> Dict[str, Any]:
        """
        Create a Cloud Task for scheduled job search
        
        Args:
            schedule_id: Unique identifier for the schedule
            schedule_config: Schedule configuration from SearchSchedule
            target_url: URL to call when task executes
            
        Returns:
            Dict with task_id and next_run_at
        """
        try:
            # Parse schedule configuration
            next_run_time = self._calculate_next_run_time(schedule_config)
            
            if not next_run_time:
                raise ValueError("Could not calculate next run time")
            
            # Create the task
            task = {
                "http_request": {
                    "http_method": tasks_v2.HttpMethod.POST,
                    "url": target_url,
                    "headers": {
                        "Content-Type": "application/json"
                    },
                    "body": json.dumps({
                        "schedule_id": schedule_id,
                        "schedule_config": schedule_config
                    }).encode()
                },
                "schedule_time": self._datetime_to_timestamp(next_run_time)
            }
            
            # Submit the task
            response = self.client.create_task(
                request={"parent": self.parent, "task": task}
            )
            
            # Extract task ID from the response name
            task_id = response.name.split('/')[-1]
            
            logger.info(f"Created scheduled task {task_id} for schedule {schedule_id}")
            
            return {
                "success": True,
                "task_id": task_id,
                "next_run_at": next_run_time.isoformat(),
                "task_name": response.name
            }
            
        except Exception as e:
            logger.error(f"Error creating scheduled task: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def delete_task(self, task_name: str) -> Dict[str, Any]:
        """
        Delete a Cloud Task
        
        Args:
            task_name: Full task name or just the task ID
            
        Returns:
            Dict with success status
        """
        try:
            # If only task ID provided, construct full name
            if '/' not in task_name:
                task_name = f"{self.parent}/tasks/{task_name}"
            
            self.client.delete_task(request={"name": task_name})
            
            logger.info(f"Deleted task {task_name}")
            
            return {"success": True}
            
        except Exception as e:
            logger.error(f"Error deleting task {task_name}: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def update_task(
        self, 
        current_task_name: str, 
        schedule_id: str, 
        schedule_config: Dict[str, Any],
        target_url: str
    ) -> Dict[str, Any]:
        """
        Update a scheduled task (delete old, create new)
        
        Args:
            current_task_name: Current task name to delete
            schedule_id: Schedule identifier
            schedule_config: Updated schedule configuration
            target_url: Target URL for the task
            
        Returns:
            Dict with new task information
        """
        try:
            # Delete existing task
            if current_task_name:
                delete_result = self.delete_task(current_task_name)
                if not delete_result["success"]:
                    logger.warning(f"Failed to delete existing task: {delete_result.get('error')}")
            
            # Create new task
            return self.create_scheduled_task(schedule_id, schedule_config, target_url)
            
        except Exception as e:
            logger.error(f"Error updating task: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _calculate_next_run_time(self, schedule_config: Dict[str, Any]) -> Optional[datetime]:
        """
        Calculate the next run time based on schedule configuration
        
        Args:
            schedule_config: SearchSchedule configuration
            
        Returns:
            Next run datetime in UTC
        """
        try:
            frequency = schedule_config.get('frequency', 'Daily')
            custom_schedule = schedule_config.get('customSchedule', '09:00')
            timezone_str = schedule_config.get('timezone', 'UTC')
            quiet_hours = schedule_config.get('quietHours', {})
            
            # Get timezone
            tz = pytz.timezone(timezone_str)
            now = datetime.now(tz)
            
            if frequency == 'Daily':
                # Parse time (format: "HH:MM")
                time_parts = custom_schedule.split(':')
                hour = int(time_parts[0])
                minute = int(time_parts[1]) if len(time_parts) > 1 else 0
                
                # Schedule for today or tomorrow
                next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
                if next_run <= now:
                    next_run += timedelta(days=1)
                    
            elif frequency == 'Weekly':
                # Parse day and time (format: "day,HH:MM")
                parts = custom_schedule.split(',')
                day_of_week = int(parts[0])  # 0=Monday, 6=Sunday
                time_str = parts[1] if len(parts) > 1 else '09:00'
                time_parts = time_str.split(':')
                hour = int(time_parts[0])
                minute = int(time_parts[1]) if len(time_parts) > 1 else 0
                
                # Calculate next occurrence of the specified day
                days_ahead = day_of_week - now.weekday()
                if days_ahead <= 0:  # Target day already happened this week
                    days_ahead += 7
                    
                next_run = now + timedelta(days=days_ahead)
                next_run = next_run.replace(hour=hour, minute=minute, second=0, microsecond=0)
                
            elif frequency == 'Monthly':
                # Parse day and time (format: "day,HH:MM")
                parts = custom_schedule.split(',')
                day_of_month = int(parts[0])
                time_str = parts[1] if len(parts) > 1 else '09:00'
                time_parts = time_str.split(':')
                hour = int(time_parts[0])
                minute = int(time_parts[1]) if len(time_parts) > 1 else 0
                
                # Calculate next occurrence of the specified day of month
                next_run = now.replace(day=day_of_month, hour=hour, minute=minute, second=0, microsecond=0)
                if next_run <= now:
                    # Move to next month
                    if now.month == 12:
                        next_run = next_run.replace(year=now.year + 1, month=1)
                    else:
                        next_run = next_run.replace(month=now.month + 1)
                        
            elif frequency == 'Custom':
                # For custom CRON expressions, calculate next run
                # This is a simplified implementation - for production, use a proper CRON parser
                logger.warning(f"Custom CRON schedules not fully implemented: {custom_schedule}")
                # Default to daily at 9 AM
                next_run = now.replace(hour=9, minute=0, second=0, microsecond=0)
                if next_run <= now:
                    next_run += timedelta(days=1)
            else:
                raise ValueError(f"Unsupported frequency: {frequency}")
            
            # Check quiet hours
            if quiet_hours:
                next_run = self._adjust_for_quiet_hours(next_run, quiet_hours, tz)
            
            # Convert to UTC
            return next_run.astimezone(pytz.UTC)
            
        except Exception as e:
            logger.error(f"Error calculating next run time: {e}")
            return None
    
    def _adjust_for_quiet_hours(
        self, 
        scheduled_time: datetime, 
        quiet_hours: Dict[str, str], 
        tz: pytz.timezone
    ) -> datetime:
        """
        Adjust scheduled time if it falls within quiet hours
        
        Args:
            scheduled_time: Initial scheduled time
            quiet_hours: Dict with 'start' and 'end' times
            tz: Timezone for the schedule
            
        Returns:
            Adjusted datetime
        """
        try:
            start_time_str = quiet_hours.get('start', '22:00')
            end_time_str = quiet_hours.get('end', '08:00')
            
            # Parse quiet hours
            start_parts = start_time_str.split(':')
            start_hour = int(start_parts[0])
            start_minute = int(start_parts[1]) if len(start_parts) > 1 else 0
            
            end_parts = end_time_str.split(':')
            end_hour = int(end_parts[0])
            end_minute = int(end_parts[1]) if len(end_parts) > 1 else 0
            
            # Create quiet hours range for the scheduled day
            start_quiet = scheduled_time.replace(hour=start_hour, minute=start_minute, second=0, microsecond=0)
            end_quiet = scheduled_time.replace(hour=end_hour, minute=end_minute, second=0, microsecond=0)
            
            # Handle overnight quiet hours (e.g., 22:00 to 08:00)
            if end_quiet <= start_quiet:
                end_quiet += timedelta(days=1)
            
            # Check if scheduled time is in quiet hours
            if start_quiet <= scheduled_time <= end_quiet:
                # Move to end of quiet hours
                scheduled_time = end_quiet
                
            return scheduled_time
            
        except Exception as e:
            logger.error(f"Error adjusting for quiet hours: {e}")
            return scheduled_time
    
    def _datetime_to_timestamp(self, dt: datetime) -> timestamp_pb2.Timestamp:
        """Convert datetime to protobuf timestamp"""
        timestamp = timestamp_pb2.Timestamp()
        timestamp.FromDatetime(dt)
        return timestamp


# Example usage and testing
if __name__ == "__main__":
    # Test the scheduler
    scheduler = CloudTaskScheduler()
    
    test_schedule = {
        "enabled": True,
        "frequency": "Daily",
        "customSchedule": "09:00",
        "notificationType": "Email",
        "quietHours": {
            "start": "22:00",
            "end": "08:00"
        },
        "timezone": "America/New_York"
    }
    
    result = scheduler.create_scheduled_task(
        schedule_id="test-schedule-1",
        schedule_config=test_schedule,
        target_url="https://example.com/api/scheduled-search"
    )
    
    print(f"Task creation result: {result}")
