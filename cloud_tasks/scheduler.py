import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
import os
import time
from google.cloud import tasks_v2
from google.protobuf import timestamp_pb2
from google.api_core import exceptions
import pytz

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CronParser:
    """Enhanced CRON parser for Cloud Tasks scheduling"""
    
    def __init__(self):
        self.month_names = {
            'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
            'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
        }
        self.weekday_names = {
            'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6
        }

    def schedule_to_cron(self, schedule_config: Dict[str, Any]) -> str:
        """Convert SearchSchedule to CRON expression"""
        frequency = schedule_config.get('frequency', 'Daily')
        custom_schedule = schedule_config.get('customSchedule', '09:00')
        
        if frequency == 'Custom':
            return custom_schedule
        elif frequency == 'Daily':
            hour, minute = custom_schedule.split(':')
            return f"{int(minute)} {int(hour)} * * *"
        elif frequency == 'Weekly':
            day, time = custom_schedule.split(',')
            hour, minute = time.split(':')
            return f"{int(minute)} {int(hour)} * * {day}"
        elif frequency == 'Monthly':
            day, time = custom_schedule.split(',')
            hour, minute = time.split(':')
            return f"{int(minute)} {int(hour)} {day} * *"
        else:
            raise ValueError(f"Unsupported frequency: {frequency}")

    def parse_cron_expression(self, cron_expr: str) -> Dict[str, Any]:
        """Parse a cron expression into components"""
        try:
            fields = cron_expr.strip().split()
            
            if len(fields) != 5:
                raise ValueError(f"Cron expression must have 5 fields, got {len(fields)}")
            
            minute, hour, day, month, weekday = fields
            
            return {
                'minute': self._parse_field(minute, 0, 59),
                'hour': self._parse_field(hour, 0, 23),
                'day': self._parse_field(day, 1, 31),
                'month': self._parse_field(month, 1, 12, self.month_names),
                'weekday': self._parse_field(weekday, 0, 6, self.weekday_names),
                'original': cron_expr
            }
        except ValueError as e:
            logger.error("Error parsing cron expression '%s': %s", cron_expr, str(e))
            raise ValueError(f"Invalid cron expression: {e}") from e

    def _parse_field(self, field: str, min_val: int, max_val: int, name_map: Optional[Dict[str, int]] = None) -> List[int]:
        """Parse a single cron field"""
        if field == '*':
            return list(range(min_val, max_val + 1))
        
        values = []
        for part in field.split(','):
            if '/' in part:
                range_part, step_str = part.split('/')
                step = int(step_str)
                if range_part == '*':
                    start, end = min_val, max_val
                elif '-' in range_part:
                    start_str, end_str = range_part.split('-')
                    start = int(start_str)
                    end = int(end_str)
                else:
                    start = end = int(range_part)
                values.extend(range(start, end + 1, step))
            elif '-' in part:
                start_str, end_str = part.split('-')
                start = self._convert_name_to_number(start_str, name_map) if name_map else int(start_str)
                end = self._convert_name_to_number(end_str, name_map) if name_map else int(end_str)
                values.extend(range(start, end + 1))
            else:
                value = self._convert_name_to_number(part, name_map) if name_map else int(part)
                values.append(value)
        
        values = list(set([v for v in values if min_val <= v <= max_val]))
        return sorted(values)
    
    def _convert_name_to_number(self, name: str, name_map: Optional[Dict[str, int]]) -> int:
        """Convert named values (like 'mon', 'jan') to numbers"""
        if name_map and name.lower() in name_map:
            return name_map[name.lower()]
        return int(name)
    
    def get_next_run_time(self, cron_expr: str, from_time: Optional[datetime] = None, timezone_str: str = 'UTC') -> datetime:
        """Calculate the next run time for a cron expression"""
        try:
            tz = pytz.timezone(timezone_str)
            if from_time is None:
                from_time = datetime.now(tz)
            elif from_time.tzinfo is None:
                from_time = tz.localize(from_time)
            else:
                from_time = from_time.astimezone(tz)
            
            cron_parts = self.parse_cron_expression(cron_expr)
            next_time = from_time.replace(second=0, microsecond=0) + timedelta(minutes=1)
            
            max_iterations = 366 * 24 * 60
            iterations = 0
            
            while iterations < max_iterations:
                if self._matches_cron(next_time, cron_parts):
                    return next_time
                
                next_time += timedelta(minutes=1)
                iterations += 1
            
            raise ValueError(f"Could not find next run time for cron expression: {cron_expr}")
            
        except (ValueError, pytz.exceptions.UnknownTimeZoneError) as e:
            logger.error("Error calculating next run time for cron '%s': %s", cron_expr, str(e))
            raise
    
    def _matches_cron(self, dt: datetime, cron_parts: Dict[str, List[int]]) -> bool:
        """Check if datetime matches cron expression"""
        return (
            dt.minute in cron_parts['minute'] and
            dt.hour in cron_parts['hour'] and
            dt.day in cron_parts['day'] and
            dt.month in cron_parts['month'] and
            dt.weekday() in [(d + 1) % 7 for d in cron_parts['weekday']]
        )

class CloudTaskScheduler:
    def __init__(self):
        self.client = tasks_v2.CloudTasksClient()
        self.project = os.getenv('GOOGLE_CLOUD_PROJECT', 'gethired-project')
        self.location = os.getenv('CLOUD_TASKS_LOCATION', 'us-central1')
        self.queue = os.getenv('CLOUD_TASKS_QUEUE', 'scheduled-searches')
        self.parent = self.client.queue_path(self.project, self.location, self.queue)
        self.cron_parser = CronParser()
        self._queue_initialized = False
        
    def _ensure_queue_exists(self) -> bool:
        """Ensure the Cloud Tasks queue exists, create if necessary"""
        try:
            # Try to get the queue
            request = tasks_v2.GetQueueRequest(name=self.parent)
            self.client.get_queue(request=request)
            self._queue_initialized = True
            logger.info(f"Queue {self.queue} exists and is ready")
            return True
        except exceptions.NotFound:
            logger.info(f"Queue {self.queue} not found, attempting to create...")
            return self._create_queue()
        except Exception as e:
            logger.error(f"Error checking queue existence: {e}")
            return False
    
    def _create_queue(self) -> bool:
        """Create the Cloud Tasks queue"""
        try:
            location_path = self.client.location_path(self.project, self.location)
            
            queue_config = {
                "name": self.parent,
                "rate_limits": {
                    "max_dispatches_per_second": 1.0,
                    "max_burst_size": 10
                },
                "retry_config": {
                    "max_attempts": 3,
                    "max_retry_duration": {"seconds": 300}
                }
            }
            
            request = tasks_v2.CreateQueueRequest(
                parent=location_path,
                queue=queue_config
            )
            
            self.client.create_queue(request=request)
            self._queue_initialized = True
            logger.info(f"Created queue {self.queue} successfully")
            
            # Wait a moment for queue to be fully initialized
            time.sleep(2)
            return True
            
        except exceptions.AlreadyExists:
            logger.info(f"Queue {self.queue} already exists")
            self._queue_initialized = True
            return True
        except Exception as e:
            logger.error(f"Error creating queue: {e}")
            return False
    
    def _wait_for_queue_ready(self, max_wait_seconds: int = 90) -> bool:
        """Wait for queue to be ready for task creation"""
        start_time = time.time()
        
        while time.time() - start_time < max_wait_seconds:
            try:
                if self._ensure_queue_exists():
                    # Additional check - try to list tasks to ensure queue is operational
                    request = tasks_v2.ListTasksRequest(parent=self.parent, page_size=1)
                    self.client.list_tasks(request=request)
                    logger.info(f"Queue {self.queue} is operational")
                    return True
            except exceptions.FailedPrecondition as e:
                if "queue must have been deleted" in str(e).lower():
                    logger.warning("Queue initialization in progress, waiting...")
                    time.sleep(5)
                    continue
                else:
                    raise
            except Exception as e:
                logger.warning(f"Queue not ready yet: {e}, retrying in 5 seconds...")
                time.sleep(5)
        
        logger.error(f"Queue {self.queue} not ready after {max_wait_seconds} seconds")
        return False
        
    def create_scheduled_task(
        self, 
        schedule_id: str, 
        schedule_config: Dict[str, Any],
        target_url: str,
        agent_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a Cloud Task for scheduled job search with queue initialization handling"""
        try:
            # Ensure queue is ready with proper waiting
            if not self._wait_for_queue_ready():
                return {
                    "success": False,
                    "error": "Queue not ready after waiting. Please try again in a few minutes.",
                    "retry_after": 120  # Suggest retry after 2 minutes
                }
            
            next_run_time = self._calculate_next_run_time(schedule_config)
            
            if not next_run_time:
                raise ValueError("Could not calculate next run time")
            
            # Prepare task payload
            task_payload = {
                "schedule_id": schedule_id,
                "schedule_config": schedule_config,
                "agent_prompt": agent_prompt or self._create_agent_prompt(schedule_config)
            }
            
            task = {
                "http_request": {
                    "http_method": tasks_v2.HttpMethod.POST,
                    "url": target_url,
                    "headers": {
                        "Content-Type": "application/json"
                    },
                    "body": json.dumps(task_payload).encode()
                },
                "schedule_time": self._datetime_to_timestamp(next_run_time)
            }
            
            task_name = f"{self.parent}/tasks/{schedule_id}-{int(next_run_time.timestamp())}"
            request = tasks_v2.CreateTaskRequest(parent=self.parent, task=task)
            
            # Retry task creation with exponential backoff
            max_retries = 3
            base_delay = 2
            
            for attempt in range(max_retries):
                try:
                    response = self.client.create_task(request=request)
                    logger.info(f"Created task: {response.name}")
                    
                    return {
                        "success": True,
                        "task_id": response.name.split('/')[-1],
                        "task_name": response.name,
                        "next_run_at": next_run_time.isoformat(),
                        "cron_expression": self.cron_parser.schedule_to_cron(schedule_config)
                    }
                    
                except exceptions.FailedPrecondition as e:
                    if "queue must have been deleted" in str(e).lower() and attempt < max_retries - 1:
                        delay = base_delay * (2 ** attempt)
                        logger.warning(f"Queue initialization in progress, waiting {delay}s before retry {attempt + 1}")
                        time.sleep(delay)
                        continue
                    else:
                        raise
                except exceptions.NotFound as e:
                    if "queue" in str(e).lower() and attempt < max_retries - 1:
                        # Try to recreate queue
                        logger.warning("Queue not found, attempting to recreate...")
                        self._queue_initialized = False
                        if self._wait_for_queue_ready():
                            continue
                    raise
            
            # If we get here, all retries failed
            return {
                "success": False,
                "error": "Failed to create task after multiple retries. Queue may need time to initialize.",
                "retry_after": 180  # Suggest retry after 3 minutes
            }
            
        except Exception as e:
            error_msg = str(e)
            retry_after = 60  # Default retry time
            
            # Check for specific queue-related errors
            if any(keyword in error_msg.lower() for keyword in ["queue", "not found", "failed precondition"]):
                retry_after = 120  # Longer retry for queue issues
                error_msg = "Cloud Task queue is initializing. Please try again in a few minutes."
            
            logger.error(f"Error creating scheduled task: {e}")
            return {
                "success": False,
                "error": error_msg,
                "retry_after": retry_after
            }

    def _create_agent_prompt(self, schedule_config: Dict[str, Any]) -> str:
        """Create a prompt for the job search agent"""
        preferences = schedule_config.get('preferences', {})
        
        prompt_parts = [
            "Find job opportunities based on the following criteria:",
            f"- Job titles: {', '.join(preferences.get('titles', []))}",
            f"- Locations: {', '.join(preferences.get('locations', []))}",
            f"- Skills: {', '.join(preferences.get('skills', []))}",
            f"- Job type: {preferences.get('jobType', 'Any')}",
            f"- Seniority level: {preferences.get('seniority', 'Any')}",
        ]
        
        if preferences.get('salaryRange'):
            salary = preferences['salaryRange']
            prompt_parts.append(f"- Salary range: ${salary.get('min', 0):,} - ${salary.get('max', 0):,}")
        
        if preferences.get('includeKeywords'):
            prompt_parts.append(f"- Must include keywords: {', '.join(preferences['includeKeywords'])}")
        
        if preferences.get('excludeKeywords'):
            prompt_parts.append(f"- Exclude keywords: {', '.join(preferences['excludeKeywords'])}")
        
        prompt_parts.append("Return job listings with title, company, location, salary, and description.")
        
        return "\n".join(prompt_parts)
    
    def delete_task(self, task_name: str) -> Dict[str, Any]:
        """Delete a Cloud Task"""
        try:
            if not task_name.startswith('projects/'):
                task_name = f"{self.parent}/tasks/{task_name}"
            
            request = tasks_v2.DeleteTaskRequest(name=task_name)
            self.client.delete_task(request=request)
            
            logger.info(f"Deleted task: {task_name}")
            
            return {
                "success": True,
                "message": f"Task {task_name} deleted successfully"
            }
            
        except exceptions.NotFound:
            # Task doesn't exist - this is OK, consider it successful
            logger.info(f"Task {task_name} not found (already deleted or never existed)")
            return {
                "success": True,
                "message": f"Task {task_name} not found (already deleted)"
            }
        except Exception as e:
            logger.error(f"Error deleting task: {e}")
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
        """Update a scheduled task (delete old, create new)"""
        try:
            # If there's an existing task, try to delete it, but don't fail if it doesn't exist
            if current_task_name:
                delete_result = self.delete_task(current_task_name)
                if not delete_result["success"]:
                    logger.warning(f"Failed to delete existing task (may not exist): {delete_result.get('error')}")
                    # Continue anyway - this is expected for schedules that were never run
            
            # Always create a new task
            return self.create_scheduled_task(schedule_id, schedule_config, target_url)
            
        except Exception as e:
            logger.error(f"Error updating task: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _calculate_next_run_time(self, schedule_config: Dict[str, Any]) -> Optional[datetime]:
        """Calculate the next run time based on schedule configuration"""
        try:
            frequency = schedule_config.get('frequency', 'Daily')
            custom_schedule = schedule_config.get('customSchedule', '09:00')
            timezone_str = schedule_config.get('timezone', 'UTC')
            quiet_hours = schedule_config.get('quietHours', {})
            
            tz = pytz.timezone(timezone_str)
            now = datetime.now(tz)
            
            if frequency == 'Custom':
                cron_expr = custom_schedule
                next_run = self.cron_parser.get_next_run_time(cron_expr, now, timezone_str)
            else:
                cron_expr = self.cron_parser.schedule_to_cron(schedule_config)
                next_run = self.cron_parser.get_next_run_time(cron_expr, now, timezone_str)
            
            if quiet_hours:
                next_run = self._adjust_for_quiet_hours(next_run, quiet_hours, tz)
            
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
        """Adjust scheduled time if it falls within quiet hours"""
        try:
            start_time_str = quiet_hours.get('start', '22:00')
            end_time_str = quiet_hours.get('end', '08:00')
            
            start_parts = start_time_str.split(':')
            start_hour = int(start_parts[0])
            start_minute = int(start_parts[1]) if len(start_parts) > 1 else 0
            
            end_parts = end_time_str.split(':')
            end_hour = int(end_parts[0])
            end_minute = int(end_parts[1]) if len(end_parts) > 1 else 0
            
            start_quiet = scheduled_time.replace(hour=start_hour, minute=start_minute, second=0, microsecond=0)
            end_quiet = scheduled_time.replace(hour=end_hour, minute=end_minute, second=0, microsecond=0)
            
            if end_quiet <= start_quiet:
                end_quiet += timedelta(days=1)
            
            if start_quiet <= scheduled_time <= end_quiet:
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
