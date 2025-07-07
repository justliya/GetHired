"""
Task Manager for the Job Search AI Assistant.
"""
import logging
import uuid
import asyncio
from typing import Dict, Any, Optional
from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.artifacts.in_memory_artifact_service import InMemoryArtifactService
from google.genai import types as adk_types

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define app name for the runner
A2A_APP_NAME = "job_search_assistant"

# Default timeout in seconds
DEFAULT_TIMEOUT = 300.0

class TaskManager:
    """Task Manager for the Job Search Coordinator Agent in A2A mode."""
    
    def __init__(self, agent: Agent, timeout: float = DEFAULT_TIMEOUT):
        """Initialize with an Agent instance and set up ADK Runner."""
        logger.info(f"Initializing TaskManager for agent: {agent.name} with timeout: {timeout}s")
        self.agent = agent
        self.timeout = timeout
        
        # Initialize ADK services
        self.session_service = InMemorySessionService()
        self.artifact_service = InMemoryArtifactService()
        
        # Create the runner
        self.runner = Runner(
            agent=self.agent,
            app_name=A2A_APP_NAME,
            session_service=self.session_service,
            artifact_service=self.artifact_service
        )
        logger.info(f"ADK Runner initialized for app '{self.runner.app_name}'")

    async def process_task(self, message: str, context: Dict[str, Any], session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Process a job search or resume tailoring task request by running the agent.
        
        Args:
            message: The text message to process.
            context: Additional context data (must include user_id).
            session_id: Session identifier (generated if None).
            
        Returns:
            Response dict with message, status, and data.
        """
        # Get user_id from context (required for all operations)
        user_id = context.get("user_id", "anonymous")
        
        # Determine task type based on session_id or message content
        is_resume_task = session_id and session_id.startswith("resume-")
        if is_resume_task:
            logger.info(f"Processing resume tailoring task for user: {user_id}")
        else:
            logger.info(f"Processing job search task for user: {user_id}")
        
        # Generate session_id if not provided
        if not session_id:
            task_type = "resume" if "tailor" in message.lower() or "resume" in message.lower() else "job_search"
            session_id = f"{user_id}_{task_type}_{uuid.uuid4().hex[:8]}"
            logger.info(f"Generated new session_id: {session_id}")
        
        # Create or get session
        try:
            # Try to get existing session
            session = await self.session_service.get_session(
                app_name=A2A_APP_NAME, 
                user_id=user_id, 
                session_id=session_id
            )
            
            if not session:
                # Create new session if it doesn't exist
                session = await self.session_service.create_session(
                    app_name=A2A_APP_NAME, 
                    user_id=user_id, 
                    session_id=session_id, 
                    state={}
                )
                logger.info(f"Created new session: {session_id}")
            else:
                logger.info(f"Using existing session: {session_id}")
                
        except Exception as e:
            logger.warning(f"Session error: {e}. Creating new session.")
            # Create new session if there's any error
            session = await self.session_service.create_session(
                app_name=A2A_APP_NAME, 
                user_id=user_id, 
                session_id=session_id, 
                state={}
            )
        
        # Create user message
        request_content = adk_types.Content(
            role="user", 
            parts=[adk_types.Part(text=message)]
        )
        
        try:
            # Run the agent with timeout
            logger.info(f"Running agent for user: {user_id} with timeout: {self.timeout}s")
            
            # Initialize variables to store results
            job_listings = None
            company_research = None
            formatted_resume = None
            final_resume = None
            document_url = None
            final_message = "Processing request..."
            raw_events = []
            runner_generator = None
            
            try:
                # Create the async generator
                runner_generator = self.runner.run_async(
                    user_id=user_id, 
                    session_id=session_id, 
                    new_message=request_content
                )
                
                # Create a task to process events with timeout
                async def process_events_with_timeout():
                    nonlocal job_listings, company_research, final_message, raw_events
                    nonlocal formatted_resume, final_resume, document_url
                    
                    try:
                        async for event in runner_generator:
                            raw_events.append(event.model_dump(exclude_none=True))
                            
                            # Check for state updates
                            if hasattr(event, 'state_update') and event.state_update:
                                # Job search related outputs
                                if 'job_listings' in event.state_update:
                                    job_listings = event.state_update['job_listings']
                                    logger.info("Received job listings update")
                                
                                if 'company_research_report' in event.state_update:
                                    company_research = event.state_update['company_research_report']
                                    logger.info("Received company research update")
                                
                                # Resume tailoring related outputs
                                if 'formatted_resume' in event.state_update:
                                    formatted_resume = event.state_update['formatted_resume']
                                    logger.info("Received formatted resume update")
                                
                                if 'final_resume' in event.state_update:
                                    final_resume = event.state_update['final_resume']
                                    logger.info("Received final resume update")
                                
                                if 'document_url' in event.state_update:
                                    document_url = event.state_update['document_url']
                                    logger.info("Received document URL update")
                            
                            # Extract final message
                            if event.is_final_response() and event.content and event.content.role == "model":
                                if event.content.parts and event.content.parts[0].text:
                                    final_message = event.content.parts[0].text
                                    logger.info(f"Final response received")
                                    
                    except asyncio.CancelledError:
                        logger.info("Event processing was cancelled")
                        raise
                    except Exception as e:
                        logger.error(f"Error processing events: {e}")
                        raise
                
                # Apply timeout to the event processing
                await asyncio.wait_for(
                    process_events_with_timeout(),
                    timeout=self.timeout
                )
                
            except asyncio.TimeoutError:
                logger.error(f"Agent execution timed out after {self.timeout} seconds")
                if runner_generator is not None:
                    try:
                        await runner_generator.aclose()
                    except Exception as cleanup_error:
                        logger.warning(f"Error cleaning up generator: {cleanup_error}")
                
                return {
                    "message": f"Request timed out after {self.timeout} seconds. Please try again.",
                    "status": "error",
                    "data": {"error_type": "TimeoutError", "timeout": self.timeout}
                }
            
            finally:
                # Ensure generator is properly closed
                if runner_generator is not None:
                    try:
                        await runner_generator.aclose()
                    except Exception as cleanup_error:
                        logger.warning(f"Error in final cleanup: {cleanup_error}")
            
            # After processing, get the session state to retrieve all outputs
            try:
                final_session = await self.session_service.get_session(
                    app_name=A2A_APP_NAME,
                    user_id=user_id,
                    session_id=session_id
                )
                
                if final_session and final_session.state:
                    # Extract outputs from session state based on task type
                    if is_resume_task:
                        # Resume tailoring outputs
                        if not formatted_resume and 'formatted_resume' in final_session.state:
                            formatted_resume = final_session.state['formatted_resume']
                            logger.info("Retrieved formatted resume from session state")
                        
                        if not final_resume and 'final_resume' in final_session.state:
                            final_resume = final_session.state['final_resume']
                            logger.info("Retrieved final resume from session state")
                        
                        if not document_url and 'document_url' in final_session.state:
                            document_url = final_session.state['document_url']
                            logger.info("Retrieved document URL from session state")
                        
                        # Check in final message if it contains JSON with document info
                        if final_message and not document_url:
                            try:
                                import json
                                # Try to extract JSON from the message
                                json_match = re.search(r'\{[^}]+\}', final_message)
                                if json_match:
                                    result_data = json.loads(json_match.group())
                                    document_url = result_data.get('document_url') or result_data.get('download_url')
                            except:
                                pass
                    else:
                        # Job search outputs
                        if not job_listings and 'job_listings' in final_session.state:
                            job_listings = final_session.state['job_listings']
                            logger.info("Retrieved job listings from session state")
                        
                        if not company_research and 'company_research_report' in final_session.state:
                            company_research = final_session.state['company_research_report']
                            logger.info("Retrieved company research from session state")
                        
            except Exception as e:
                logger.warning(f"Error retrieving final session state: {e}")
            
            # Prepare the response data
            response_data = {
                "raw_events": raw_events[-3:] if raw_events else []
            }
            
            # Add appropriate outputs based on task type
            if is_resume_task:
                # Resume tailoring response
                response_data["formatted_resume"] = formatted_resume
                response_data["final_resume"] = final_resume
                response_data["document_url"] = document_url
                response_data["resume_text"] = final_resume or formatted_resume
            else:
                # Job search response
                if job_listings:
                    try:
                        # Try to parse JSON if it's a string
                        import json
                        import re
                        if isinstance(job_listings, str):
                            # Remove markdown code blocks if present
                            clean_json = re.sub(r"^```(?:json)?\n|```$", "", job_listings.strip())
                            job_listings = json.loads(clean_json)
                        response_data["job_listings"] = job_listings
                    except Exception as e:
                        logger.warning(f"Failed to parse job listings: {e}")
                
                if company_research:
                    try:
                        # Try to parse JSON if it's a string
                        if isinstance(company_research, str):
                            # Remove markdown code blocks if present
                            clean_json = re.sub(r"^```(?:json)?\n|```$", "", company_research.strip())
                            company_research = json.loads(clean_json)
                        response_data["company_research"] = company_research
                    except Exception as e:
                        logger.warning(f"Failed to parse company research: {e}")
            
            # Return formatted response
            return {
                "message": final_message, 
                "status": "success",
                "data": response_data
            }

        except Exception as e:
            logger.error(f"Error running agent: {str(e)}", exc_info=True)
            return {
                "message": f"Error processing your request: {str(e)}",
                "status": "error",
                "data": {"error_type": type(e).__name__}
            }