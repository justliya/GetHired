"""
Standardized Agent to Agent (A2A) server implementation for Job Search AI Assistant.
This module provides a FastAPI server implementation following Google ADK standards.
"""

import os
import json
import inspect
import re
import uuid
from typing import Dict, Any, Callable, Optional
from fastapi import FastAPI, Body
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google.genai import types


# Job Search specific models
class JobSearchRequest(BaseModel):
    """Request model for job search - only requires user_id."""
    user_id: str = Field(
        ..., description="Firebase user ID for personalized job search"
    )


class ResumeTailorRequest(BaseModel):
    """Request model for resume tailoring."""
    message: str = Field(
        ..., description="Message containing resume URL/text and job description"
    )
    context: Dict[str, Any] = Field(
        default_factory=dict, description="Additional context including user_id"
    )
    session_id: Optional[str] = Field(
        None, description="Session ID for the resume tailoring request"
    )


def create_agent_server(
    name: str,
    description: str,
    task_manager: Any,
    endpoints: Optional[Dict[str, Callable]] = None,
    well_known_path: Optional[str] = None,
) -> FastAPI:
    """
    Create a FastAPI server for the job search agent following A2A protocol.

    Args:
        name: The name of the agent
        description: A description of the agent's functionality
        task_manager: The TaskManager instance for handling tasks
        endpoints: Optional dictionary of additional endpoints to register
        well_known_path: Optional path to the .well-known directory

    Returns:
        A configured FastAPI application
    """
    app = FastAPI(title=f"{name} - Job Search AI Assistant", description=description)

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "https://get-hired-one.vercel.app",
            "http://0.0.0.0",
            "https://firebasestorage.googleapis.com",
            "https://gethired-6c623.firebaseapp.com"
        ],
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Create .well-known directory if it doesn't exist
    if well_known_path is None:
        module_path = inspect.getmodule(inspect.stack()[1][0]).__file__
        well_known_path = os.path.join(os.path.dirname(module_path), ".well-known")

    os.makedirs(well_known_path, exist_ok=True)

    # Generate agent.json if it doesn't exist
    agent_json_path = os.path.join(well_known_path, "agent.json")
    if not os.path.exists(agent_json_path):
        endpoint_names = ["run-job-search", "tailor-resume"]
        if endpoints:
            endpoint_names.extend(endpoints.keys())

        agent_metadata = {
            "name": name,
            "description": description,
            "endpoints": endpoint_names,
            "version": "1.0.0",
            "capabilities": ["job_search", "profile_analysis", "company_research", "resume_tailoring"],
            "sub_agents": [
                "profile_agent",
                "listing_search_agent",
                "company_research_agent",
                "resume_agent",
            ],
        }

        with open(agent_json_path, "w") as f:
            json.dump(agent_metadata, f, indent=2)

    # Utility functions
    def unwrap_json_string(json_block: Optional[str]) -> Any:
        """Extract and parse JSON from agent output strings."""
        if not json_block:
            return None
        try:
            # Remove markdown code blocks if present
            clean_json = re.sub(r"^```(?:json)?\n|```$", "", json_block.strip())
            return json.loads(clean_json)
        except json.JSONDecodeError as e:
            print(f"JSON parsing failed: {e}")
            print(f"Raw content: {json_block}")
            return None

    # Main job search endpoint
    @app.post("/run-job-search")
    async def run_job_search(request: JobSearchRequest = Body(...)):
        """
        Single endpoint that runs the complete job search workflow:
        1. Fetches user preferences from Firebase
        2. Searches for matching jobs
        3. Performs company research on found jobs
        """

        print(f"\n>>> Running Job Search for User: {request.user_id}")
        session_id = f"{request.user_id}_job_search_{uuid.uuid4().hex[:8]}"
        agent_instance = task_manager.agent
        runner = task_manager.runner

        # Create session first
        try:
            session = await task_manager.session_service.get_session(
                app_name=runner.app_name, user_id=request.user_id, session_id=session_id
            )

            if not session:
                session = await task_manager.session_service.create_session(
                    app_name=runner.app_name,
                    user_id=request.user_id,
                    session_id=session_id,
                    state={},
                )
                print(f"Created new session: {session_id}")
            else:
                print(f"Using existing session: {session_id}")
        except Exception as inner_e:
            print(f"Session error: {inner_e}. Creating new session.")
            session = await task_manager.session_service.create_session(
                app_name=runner.app_name,
                user_id=request.user_id,
                session_id=session_id,
                state={},
            )

        # Create proper Content object
        user_content = types.Content(
            role="user",
            parts=[
                types.Part(
                    text=f"Run a complete job search for user ID: {request.user_id}"
                )
            ],
        )

        # Run the agent
        async for event in runner.run_async(
            user_id=request.user_id, session_id=session_id, new_message=user_content
        ):
            pass

        # Get session state after completion
        current_session = await task_manager.session_service.get_session(
            app_name=runner.app_name, user_id=request.user_id, session_id=session_id
        )

        # Extract outputs from session state
        job_listings_output = current_session.state.get("job_listings")
        company_research_output = current_session.state.get("company_research_report")

        # Parse the outputs
        job_listings_parsed = unwrap_json_string(job_listings_output)
        company_research_parsed = unwrap_json_string(company_research_output)

        print(
            json.dumps(
                {
                    "job_listings": job_listings_parsed,
                    "company_research": company_research_parsed,
                },
                indent=2,
            )
        )

        # Return the parsed results directly
        return JSONResponse(
            content={
                "job_listings": job_listings_parsed,
                "company_research": company_research_parsed,
            },
            headers={
                "Access-Control-Allow-Origin": "http://localhost:5173", "https://get-hired-one.vercel.app"
                "Access-Control-Allow-Methods": "POST, PUT, OPTIONS, GET",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Credentials": "true",
            }
        )

    # Resume tailoring endpoint
    @app.post("/tailor-resume")
    async def tailor_resume(request: ResumeTailorRequest = Body(...)):
        """
        Endpoint to tailor a resume for a specific job description.
        Accepts either a resume URL or text content along with a job description.
        """
        print(f"\n>>> Tailoring Resume - Session: {request.session_id}")
        
        # Extract user_id from context
        user_id = request.context.get("user_id", "anonymous")
        session_id = request.session_id or f"{user_id}_resume_{uuid.uuid4().hex[:8]}"
        
        # Create proper Content object with the message
        user_content = types.Content(
            role="user",
            parts=[types.Part(text=request.message)]
        )
        
        try:
            # Process the resume tailoring request
            response = await task_manager.process_task(
                message=request.message,
                context=request.context,
                session_id=session_id
            )
            
            # Extract the tailored resume from response
            if response.get("status") == "success":
                data = response.get("data", {})
                
                # Check for formatted_resume or final_resume in the data
                formatted_resume = None
                document_url = None
                
                # Look for the resume in various possible locations in the response
                if "formatted_resume" in data:
                    formatted_resume = data["formatted_resume"]
                elif "final_resume" in data:
                    formatted_resume = data["final_resume"]
                elif "resume_text" in data:
                    formatted_resume = data["resume_text"]
                
                if "document_url" in data:
                    document_url = data["document_url"]
                elif "download_url" in data:
                    document_url = data["download_url"]
                
                return JSONResponse(
                    content={
                        "status": "success",
                        "message": "Resume tailored successfully",
                        "tailored_resume": formatted_resume,
                        "document_url": document_url,
                        "session_id": session_id
                    },
                    headers={
                        "Access-Control-Allow-Origin": "http://localhost:5173",
                        "Access-Control-Allow-Methods": "POST, PUT, OPTIONS, GET",
                        "Access-Control-Allow-Headers": "*",
                        "Access-Control-Allow-Credentials": "true",
                    }
                )
            else:
                return JSONResponse(
                    content={
                        "status": "error",
                        "message": response.get("message", "Failed to tailor resume"),
                        "error": response.get("data", {}).get("error_type", "Unknown error"),
                        "session_id": session_id
                    },
                    status_code=500,
                    headers={
                        "Access-Control-Allow-Origin": "http://localhost:5173",
                        "Access-Control-Allow-Methods": "POST, PUT, OPTIONS, GET",
                        "Access-Control-Allow-Headers": "*",
                        "Access-Control-Allow-Credentials": "true",
                    }
                )
                
        except Exception as e:
            print(f"Error in resume tailoring: {e}")
            return JSONResponse(
                content={
                    "status": "error",
                    "message": f"Failed to tailor resume: {str(e)}",
                    "session_id": session_id
                },
                status_code=500,
                headers={
                    "Access-Control-Allow-Origin": "http://localhost:5173",
                    "Access-Control-Allow-Methods": "POST, PUT, OPTIONS, GET",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Credentials": "true",
                }
            )

    # Metadata endpoint
    @app.get("/.well-known/agent.json")
    async def get_metadata():
        """Retrieve the agent metadata."""
        with open(agent_json_path, "r") as f:
            return JSONResponse(content=json.load(f))

    # Health check endpoint
    @app.get("/health")
    async def health_check():
        """Health check endpoint."""
        return {"status": "healthy", "service": name}

    # Explicit OPTIONS handler for preflight requests
    @app.options("/run-job-search")
    async def options_run():
        """Handle preflight OPTIONS requests for /run endpoint."""
        return JSONResponse(
            content={},
            headers={
                "Access-Control-Allow-Origin": "http://localhost:5173","https://get-hired-one.vercel.app"
                "Access-Control-Allow-Methods": "POST, PUT, OPTIONS, GET",
                "Access-Control-Allow-Headers": "*",
            },
        )
    
    @app.options("/tailor-resume")
    async def options_tailor():
        """Handle preflight OPTIONS requests for /tailor-resume endpoint."""
        return JSONResponse(
            content={},
            headers={
                "Access-Control-Allow-Origin": "http://localhost:5173","https://get-hired-one.vercel.app"
                "Access-Control-Allow-Methods": "POST, PUT, OPTIONS, GET",
                "Access-Control-Allow-Headers": "*",
            },
        )

    # Root endpoint
    @app.get("/")
    async def root():
        """Welcome endpoint."""
        return {
            "message": f"Welcome to {name} - Job Search AI Assistant",
            "version": "1.0.0",
            "endpoints": [
                "/run-job-search",
                "/tailor-resume",
                "/health",
                "/.well-known/agent.json",
                "/docs",
            ],
        }

    # Register additional endpoints if provided
    if endpoints:
        for path, handler in endpoints.items():
            app.add_api_route(f"/{path}", handler, methods=["POST"])

    return app


