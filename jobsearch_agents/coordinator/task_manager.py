"""
Task Manager for the jobsearch_agents.
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
A2A_APP_NAME = "jobsearch_agents"

# Default timeout in seconds
DEFAULT_TIMEOUT = 60.0

class TaskManager:
    """Task Manager for the Coordinator Agent in A2A mode."""
    
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
        Process an A2A task request by running the agent.
        
        Args:
            message: The text message to process.
            context: Additional context data.
            session_id: Session identifier (generated if None).
            
        Returns:
            Response dict with message, status, and data.
        """
        # Get user_id from context or use default
        user_id = context.get("user_id", "default_user")
        
        # Create or get session
        if not session_id:
            session_id = str(uuid.uuid4())
            logger.info(f"Generated new session_id: {session_id}")
        
        try:
            # Try to get existing session - AWAIT is needed here
            session = await self.session_service.get_session(
                app_name=A2A_APP_NAME, 
                user_id=user_id, 
                session_id=session_id
            )
            
            if not session:
                # Create new session if it doesn't exist - AWAIT is needed here too
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
        request_content = adk_types.Content(role="user", parts=[adk_types.Part(text=message)])
        
        try:
            # Run the agent with timeout
            logger.info(f"Running agent with timeout: {self.timeout}s")
            
            # Create a coroutine to process all events
            async def process_events():
                final_message = "(No response generated)"
                raw_events = []
                
                # Process events
                async for event in self.runner.run_async(
                    user_id=user_id, 
                    session_id=session_id, 
                    new_message=request_content
                ):
                    raw_events.append(event.model_dump(exclude_none=True))
                    
                    # Only extract from the final response
                    if event.is_final_response() and event.content and event.content.role == "model":
                        if event.content.parts and event.content.parts[0].text:
                            final_message = event.content.parts[0].text
                            logger.info(f"Final response: {final_message}")
                
                return final_message, raw_events
            
            # Apply timeout to the entire event processing
            try:
                final_message, raw_events = await asyncio.wait_for(
                    process_events(),
                    timeout=self.timeout
                )
                
                # Return formatted response
                return {
                    "message": final_message, 
                    "status": "success",
                    "data": {
                        "raw_events": raw_events[-3:] if raw_events else []
                    }
                }
                
            except asyncio.TimeoutError:
                logger.error(f"Agent execution timed out after {self.timeout} seconds")
                return {
                    "message": f"Request timed out after {self.timeout} seconds. Please try again with a simpler query.",
                    "status": "error",
                    "data": {"error_type": "TimeoutError", "timeout": self.timeout}
                }

        except Exception as e:
            logger.error(f"Error running agent: {str(e)}", exc_info=True)
            return {
                "message": f"Error processing your request: {str(e)}",
                "status": "error",
                "data": {"error_type": type(e).__name__}
            }