import os
import logging
from datetime import datetime
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from google.cloud import firestore

from scheduler import CloudTaskScheduler
from mailchimp_service import MailChimpService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="GetHired Scheduled Search API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
scheduler = CloudTaskScheduler()
db = firestore.Client()
mailchimp_service = MailChimpService()

# Pydantic models
class ScheduleRequest(BaseModel):
    scheduleId: str
    schedule: Dict[str, Any]
    targetUrl: str

class ScheduledSearchExecution(BaseModel):
    schedule_id: str
    schedule_config: Dict[str, Any]

# API Endpoints
@app.post("/api/v1/tasks/schedule")
async def create_scheduled_task(request: ScheduleRequest):
    """Create a new Cloud Task for scheduled job search"""
    try:
        result = scheduler.create_scheduled_task(
            schedule_id=request.scheduleId,
            schedule_config=request.schedule,
            target_url=request.targetUrl,
            agent_prompt=request.schedule.get('agent_prompt')
        )
        
        if result.get("success"):
            return {
                "taskId": result.get("task_id"),
                "nextRunAt": result.get("next_run_at"),
                "message": "Task created successfully"
            }
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to create task"))
    except Exception as e:
        logger.error("Error creating scheduled task: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e)) from e

@app.delete("/api/v1/tasks/{task_id}")
async def delete_task(task_id: str):
    """Delete a Cloud Task"""
    try:
        result = scheduler.delete_task(task_id)
        
        if result.get("success"):
            return {"message": result.get("message", "Task deleted successfully")}
        else:
            # For delete operations, we should be more lenient with errors
            # If task doesn't exist, that's actually what we want
            error_msg = result.get("error", "Failed to delete task")
            if "not found" in error_msg.lower() or "does not exist" in error_msg.lower():
                return {"message": "Task not found (already deleted)"}
            raise HTTPException(status_code=400, detail=error_msg)
    except Exception as e:
        logger.error("Error deleting task: %s", str(e))
        # For 404/not found errors, return success since the goal is achieved
        if "not found" in str(e).lower() or "does not exist" in str(e).lower():
            return {"message": "Task not found (already deleted)"}
        raise HTTPException(status_code=500, detail=str(e)) from e

@app.put("/api/v1/tasks/{task_id}")
async def update_task(task_id: str, request: ScheduleRequest):
    """Update a Cloud Task (delete old, create new)"""
    try:
        result = scheduler.update_task(
            current_task_name=task_id,
            schedule_id=request.scheduleId,
            schedule_config=request.schedule,
            target_url=request.targetUrl
        )
        
        if result.get("success"):
            return {
                "taskId": result.get("task_id"),
                "nextRunAt": result.get("next_run_at"),
                "message": "Task updated successfully"
            }
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to update task"))
    except Exception as e:
        logger.error("Error updating task: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e)) from e

@app.post("/api/v1/scheduled-search/execute")
async def execute_scheduled_search(
    execution: ScheduledSearchExecution,
    background_tasks: BackgroundTasks
):
    """Execute a scheduled job search - called by Cloud Tasks"""
    try:
        logger.info("Executing scheduled search for schedule %s", execution.schedule_id)
        
        background_tasks.add_task(
            process_scheduled_search,
            execution.schedule_id
        )
        
        return {"message": "Scheduled search queued for execution"}
    except Exception as e:
        logger.error("Error executing scheduled search: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e)) from e

async def process_scheduled_search(schedule_id: str):
    """Process the scheduled job search in the background"""
    try:
        # Get the scheduled search from Firestore
        doc_ref = db.collection('scheduledSearches').document(schedule_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            logger.error("Scheduled search %s not found", schedule_id)
            return
        
        search_data = doc.to_dict()
        user_id = search_data.get('userId')
        preferences = search_data.get('preferences')
        
        if not user_id or not preferences:
            logger.error("Invalid scheduled search data for %s", schedule_id)
            return
        
        # Execute job search via GetHired API
        job_results = await execute_job_search(user_id, preferences)
        
        if job_results.get('success'):
            # Send email notification using MailChimp
            await send_job_notification_email(
                user_id=user_id,
                jobs=job_results.get('jobs', []),
                search_preferences=preferences
            )
            
            # Update last run time
            doc_ref.update({
                'lastRunAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
            
            logger.info("Scheduled search %s completed successfully", schedule_id)
        else:
            logger.warning("No jobs found for scheduled search %s", schedule_id)
    except Exception as e:
        logger.error("Error processing scheduled search %s: %s", schedule_id, str(e))

async def execute_job_search(user_id: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
    """Execute job search using the existing GetHired API"""
    try:
        api_url = os.getenv('GETHIRED_API_URL', 'http://localhost:8080')
        
        search_payload = {
            "user_id": user_id,
            "firebase_uid": user_id,
            "task": "job_search",
            "preferences": preferences,
            "search_type": "scheduled"
        }
        
        response = requests.post(
            f"{api_url}/api/job-search",
            json=search_payload,
            timeout=300
        )
        
        if response.status_code == 200:
            result = response.json()
            return {
                "success": True,
                "jobs": result.get('jobs', []),
                "total_count": result.get('total_count', 0)
            }
        else:
            logger.error("Job search API error: %d - %s", response.status_code, response.text)
            return {"success": False, "error": "Job search API failed"}
    except Exception as e:
        logger.error("Error executing job search for user %s: %s", user_id, str(e))
        return {"success": False, "error": str(e)}

async def send_job_notification_email(
    user_id: str, 
    jobs: List[Dict[str, Any]], 
    search_preferences: Dict[str, Any]
):
    """Send email notification with job search results using MailChimp"""
    try:
        # Get user email from Firestore
        user_doc = db.collection('users').document(user_id).get()
        if not user_doc.exists:
            logger.error("User %s not found", user_id)
            return
        
        user_data = user_doc.to_dict()
        email = user_data.get('email')
        name = user_data.get('profile', {}).get('name', 'Job Seeker')
        
        if not email:
            logger.error("No email found for user %s", user_id)
            return
        
        # Send email using MailChimp
        result = await mailchimp_service.send_job_notification_email(
            user_email=email,
            user_name=name,
            jobs=jobs,
            search_preferences=search_preferences
        )
        
        if result.get('success'):
            logger.info("MailChimp email sent to %s: %d jobs", email, len(jobs))
        else:
            logger.error("Failed to send MailChimp email: %s", result.get('error'))
    except Exception as e:
        logger.error("Error in email notification: %s", str(e))

@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "scheduled-search-api"
    }

@app.get("/api/v1/mailchimp/test")
async def test_mailchimp_service():
    """Test MailChimp service"""
    try:
        result = await mailchimp_service.test_connection()
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/v1/mailchimp/test-email")
async def test_email_sending(request: dict):
    """Test email sending with sample data"""
    try:
        user_email = request.get('email', 'test@example.com')
        user_name = request.get('name', 'Test User')
        
        sample_jobs = [
            {
                "title": "Senior Software Engineer",
                "company": "Tech Corp",
                "location": "San Francisco, CA",
                "url": "https://example.com/job1",
                "description": "Join our team as a Senior Software Engineer...",
                "salary": "$120k - $180k",
                "match_score": 95
            }
        ]
        
        sample_preferences = {
            "titles": ["Software Engineer"],
            "locations": ["San Francisco"],
            "skills": ["React", "TypeScript"],
            "jobType": "Full-time"
        }
        
        result = await mailchimp_service.send_job_notification_email(
            user_email=user_email,
            user_name=user_name,
            jobs=sample_jobs,
            search_preferences=sample_preferences
        )
        
        return result
    except Exception as e:
        logger.error("Error testing email: %s", str(e))
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
