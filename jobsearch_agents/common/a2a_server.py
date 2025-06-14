"""
Standardized Agent to Agent (A2A) server implementation following Google ADK standards.
This module provides a FastAPI server implementation for agent-to-agent communication.
"""

import os
import json
import inspect
from typing import Dict, Any, Callable, Optional, List

from fastapi import FastAPI, Body, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

class AgentRequest(BaseModel):
    """Standard A2A agent request format."""
    message: str = Field(..., description="The message to process")
    context: Dict[str, Any] = Field(default_factory=dict, description="Additional context for the request")
    session_id: Optional[str] = Field(None, description="Session identifier for stateful interactions")

class AgentResponse(BaseModel):
    """Standard A2A agent response format."""
    message: str = Field(..., description="The response message")
    status: str = Field(default="success", description="Status of the response (success, error)")
    data: Dict[str, Any] = Field(default_factory=dict, description="Additional data returned by the agent")
    session_id: Optional[str] = Field(None, description="Session identifier for stateful interactions")

def create_agent_server(
    name: str, 
    description: str, 
    task_manager: Any, 
    endpoints: Optional[Dict[str, Callable]] = None,
    well_known_path: Optional[str] = None
) -> FastAPI:
    """
    Create a FastAPI server for an agent following A2A protocol.
    
    Args:
        name: The name of the agent
        description: A description of the agent's functionality
        task_manager: The TaskManager instance for handling tasks
        endpoints: Optional dictionary of additional endpoints to register
        well_known_path: Optional path to the .well-known directory
        
    Returns:
        A configured FastAPI application
    """
    app = FastAPI(title=f"{name} Agent", description=description)
    
    # Add CORS middleware - IMPORTANT: This must be added before routes
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In production, specify your frontend domains
        allow_credentials=True,
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
        endpoint_names = ["run"]
        if endpoints:
            endpoint_names.extend(endpoints.keys())
        
        agent_metadata = {
            "name": name,
            "description": description,
            "endpoints": endpoint_names,
            "version": "1.0.0"
        }
        
        with open(agent_json_path, "w") as f:
            json.dump(agent_metadata, f, indent=2)
    
    # Standard A2A run endpoint
    @app.post("/run", response_model=AgentResponse)
    async def run(request: AgentRequest = Body(...)):
        """Standard A2A run endpoint for processing agent requests."""
        try:
            result = await task_manager.process_task(request.message, request.context, request.session_id)
            return AgentResponse(
                message=result.get("message", "Task completed"),
                status="success",
                data=result.get("data", {}),
                session_id=request.session_id
            )
        except Exception as e:
            return AgentResponse(
                message=f"Error processing request: {str(e)}",
                status="error",
                data={"error_type": type(e).__name__},
                session_id=request.session_id
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
    @app.options("/run")
    async def options_run():
        """Handle preflight OPTIONS requests for /run endpoint."""
        return JSONResponse(content={}, headers={
            "Access-Control-Allow-Origin": "http://localhost:5174",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        })
    
    # Register additional endpoints if provided
    if endpoints:
        for path, handler in endpoints.items():
            app.add_api_route(f"/{path}", handler, methods=["POST"])
    
    return app