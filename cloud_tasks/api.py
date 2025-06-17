import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from google.cloud import firestore

from scheduler import CloudTaskScheduler

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

# Pydantic models
class ScheduleRequest(BaseModel):
    scheduleId: str
    schedule: Dict[str, Any]
    targetUrl: str

class TaskDeleteRequest(BaseModel):
    taskId: str

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
            target_url=request.targetUrl
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
        logger.error(f"Error creating scheduled task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/v1/tasks/{task_id}")
async def delete_task(task_id: str):
    """Delete a Cloud Task"""
    try:
        result = scheduler.delete_task(task_id)
        
        if result.get("success"):
            return {"message": "Task deleted successfully"}
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to delete task"))
            
    except Exception as e:
        logger.error(f"Error deleting task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
        logger.error(f"Error updating task: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/scheduled-search/execute")
async def execute_scheduled_search(
    execution: ScheduledSearchExecution,
    background_tasks: BackgroundTasks
):
    """
    Execute a scheduled job search
    This endpoint is called by Cloud Tasks
    """
    try:
        logger.info(f"Executing scheduled search for schedule {execution.schedule_id}")
        
        # Add to background tasks to avoid timeout
        background_tasks.add_task(
            process_scheduled_search,
            execution.schedule_id,
            execution.schedule_config
        )
        
        return {"message": "Scheduled search queued for execution"}
        
    except Exception as e:
        logger.error(f"Error executing scheduled search: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_scheduled_search(schedule_id: str, schedule_config: Dict[str, Any]):
    """
    Process the scheduled job search in the background
    """
    try:
        # Get the scheduled search from Firestore
        doc_ref = db.collection('scheduledSearches').document(schedule_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            logger.error(f"Scheduled search {schedule_id} not found")
            return
        
        search_data = doc.to_dict()
        user_id = search_data.get('userId')
        preferences = search_data.get('preferences')
        
        if not user_id or not preferences:
            logger.error(f"Invalid scheduled search data for {schedule_id}")
            return
        
        # Execute job search via GetHired API
        job_results = await execute_job_search(user_id, preferences)
        
        if job_results.get('success') and job_results.get('jobs'):
            # Send email notification
            await send_job_notification_email(
                user_id=user_id,
                jobs=job_results['jobs'],
                search_preferences=preferences
            )
            
            # Update last run time
            doc_ref.update({
                'lastRunAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
            
            logger.info(f"Scheduled search {schedule_id} completed successfully")
        else:
            logger.warning(f"No jobs found for scheduled search {schedule_id}")
            
    except Exception as e:
        logger.error(f"Error processing scheduled search {schedule_id}: {e}")

async def execute_job_search(user_id: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute job search using the existing GetHired API
    """
    try:
        # This would call your existing job search API
        # For now, we'll simulate the call to the jobsearch_agents
        
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
            timeout=300  # 5 minute timeout
        )
        
        if response.status_code == 200:
            result = response.json()
            return {
                "success": True,
                "jobs": result.get('jobs', []),
                "total_count": result.get('total_count', 0)
            }
        else:
            logger.error(f"Job search API error: {response.status_code} - {response.text}")
            return {"success": False, "error": "Job search API failed"}
            
    except Exception as e:
        logger.error(f"Error executing job search for user {user_id}: {e}")
        return {"success": False, "error": str(e)}

async def send_job_notification_email(
    user_id: str, 
    jobs: List[Dict[str, Any]], 
    search_preferences: Dict[str, Any]
):
    """
    Send email notification with job search results
    """
    try:
        # Get user email from Firestore
        user_doc = db.collection('users').document(user_id).get()
        if not user_doc.exists:
            logger.error(f"User {user_id} not found")
            return
        
        user_data = user_doc.to_dict()
        email = user_data.get('email')
        name = user_data.get('profile', {}).get('name', 'Job Seeker')
        
        if not email:
            logger.error(f"No email found for user {user_id}")
            return
        
        # Call Firebase Function to send email
        functions_url = os.getenv('FIREBASE_FUNCTIONS_URL', 'http://localhost:5001')
        
        email_payload = {
            "to": email,
            "user_name": name,
            "jobs": jobs[:10],  # Limit to 10 jobs in email
            "total_jobs": len(jobs),
            "search_preferences": search_preferences,
            "email_type": "scheduled_search_results"
        }
        
        response = requests.post(
            f"{functions_url}/sendJobNotificationEmail",
            json=email_payload,
            timeout=30
        )
        
        if response.status_code == 200:
            logger.info(f"Email notification sent to {email}")
        else:
            logger.error(f"Failed to send email: {response.status_code} - {response.text}")
            
    except Exception as e:
        logger.error(f"Error sending email notification: {e}")

@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "scheduled-search-api"
    }

@app.get("/api/v1/tasks/status/{task_id}")
async def get_task_status(task_id: str):
    """Get status of a Cloud Task (if possible)"""
    # Note: Cloud Tasks doesn't provide easy status checking
    # This would require additional implementation
    return {"message": "Task status checking not implemented"}

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
