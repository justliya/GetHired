#!/usr/bin/env python
"""
Entry point for the Speaker Agent.
Initializes and starts the agent's server.
"""

# CRITICAL: This MUST be at the very top before any imports
import os
import sys

# Set timeout environment variable before any imports
os.environ['MCP_CLIENT_TIMEOUT'] = '60.0'

# Monkey patch the MCP session timeout
try:
    # Patch the timedelta import in mcp_session_manager
    from datetime import timedelta as original_timedelta
    
    # Create a custom timedelta that defaults to 60 seconds
    class PatchedTimedelta(original_timedelta):
        def __new__(cls, seconds=60, **kwargs):
            if seconds == 5:  # Override the hardcoded 5 second timeout
                seconds = float(os.getenv('MCP_CLIENT_TIMEOUT', '60.0'))
            return super().__new__(cls, seconds=seconds, **kwargs)
    
    # Replace timedelta in the mcp module before it's imported
    sys.modules['datetime'].timedelta = PatchedTimedelta
    
except Exception as e:
    print(f"Warning: Could not patch MCP timeout: {e}", file=sys.stderr)

import logging
import argparse
import uvicorn
import asyncio 
from contextlib import AsyncExitStack 
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
load_status = load_dotenv(dotenv_path=dotenv_path, override=True)

api_key=os.getenv("GOOGLE_API_KEY")
# Use relative imports within the agent package
from .task_manager import TaskManager 
from .agent import root_agent 
from common.a2a_server import AgentRequest, AgentResponse, create_agent_server 
 
# Constants
DEFAULT_AGENT_TIMEOUT = 60.0  # 60 seconds default timeout

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# Load environment variables

# Global variable for the TaskManager instance
task_manager_instance: TaskManager | None = None

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Start the Speaker Agent server")
    parser.add_argument(
        "--host", 
        type=str, 
        default=os.getenv("SPEAKER_HOST", "0.0.0.0"),
        help="Host to bind the server to"
    )
    parser.add_argument(
        "--port", 
        type=int, 
        default=int(os.getenv("SPEAKER_PORT", "8003")),
        help="Port to bind the server to"
    )
    parser.add_argument(
        "--log-level",
        choices=["debug", "info", "warning", "error", "critical"],
        default=os.getenv("LOG_LEVEL", "info"),
        help="Set the logging level"
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=float(os.getenv("SPEAKER_AGENT_TIMEOUT", DEFAULT_AGENT_TIMEOUT)),
        help="Timeout for agent operations in seconds (default: 60.0)"
    )
    # Arguments related to TaskManager are handled via env vars now
    return parser.parse_args()

def add_cors_middleware(app: FastAPI):
    """Add CORS middleware to the FastAPI app."""
    # Configure CORS origins - add your React dev server URLs
    origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        # Add any other origins you need
    ]
    
    # You can also use ["*"] to allow all origins in development
    # origins = ["*"]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
    logger.info(f"CORS middleware added with origins: {origins}")

async def main(): # Make main async
    """Initialize and start the Speaker Agent server."""
    global task_manager_instance
    
    # Parse command line arguments
    args = parse_args()
    
    # Set logging level based on argument
    logging.getLogger().setLevel(getattr(logging, args.log_level.upper()))
    
    logger.info("Starting Speaker Agent A2A Server initialization...")
    logger.info(f"Agent timeout set to: {args.timeout} seconds")
    
    # Await the root_agent coroutine to get the actual agent and exit_stack
    logger.info("Awaiting root_agent creation...")
    agent_instance, exit_stack = await root_agent
    logger.info(f"Agent instance created: {agent_instance.name}")

    # Use the exit_stack to manage the MCP connection lifecycle
    async with exit_stack:
        logger.info("MCP exit_stack entered.")
        
        # Initialize the TaskManager with the resolved agent instance and timeout
        # Check if TaskManager accepts timeout parameter
        try:
            task_manager_instance = TaskManager(agent=agent_instance, timeout=args.timeout)
            logger.info(f"TaskManager initialized with agent instance and {args.timeout}s timeout.")
        except TypeError:
            # If TaskManager doesn't accept timeout parameter, use default initialization
            task_manager_instance = TaskManager(agent=agent_instance)
            logger.info("TaskManager initialized with agent instance (timeout parameter not supported).")
            # Set timeout as an attribute if possible
            if hasattr(task_manager_instance, 'timeout'):
                task_manager_instance.timeout = args.timeout
                logger.info(f"TaskManager timeout set to {args.timeout}s via attribute.")

        # Configuration for the A2A server
        # Use environment variables or defaults
        host = os.getenv("SPEAKER_A2A_HOST", "127.0.0.1")
        port = int(os.getenv("SPEAKER_A2A_PORT", 8003))
        
        # Create the FastAPI app using the helper
        # Pass the agent name, description, and the task manager instance
        # Check if create_agent_server accepts timeout parameter
        try:
            app = create_agent_server(
                name=agent_instance.name,
                description=agent_instance.description,
                task_manager=task_manager_instance,
                timeout=args.timeout
            )
        except TypeError:
            # If create_agent_server doesn't accept timeout parameter, use default
            app = create_agent_server(
                name=agent_instance.name,
                description=agent_instance.description,
                task_manager=task_manager_instance
            )
            logger.info("create_agent_server called without timeout parameter.")
        
        # Add CORS middleware to the app
        add_cors_middleware(app)
        
        logger.info(f"Speaker Agent A2A server starting on {host}:{port}")
        
        # Configure uvicorn
        config = uvicorn.Config(app, host=host, port=port, log_level=args.log_level)
        server = uvicorn.Server(config)
        
        # Run the server
        await server.serve()
        
        # This part will be reached after the server is stopped (e.g., Ctrl+C)
        logger.info("Speaker Agent A2A server stopped.")

if __name__ == "__main__":
    try:
        # Set asyncio timeout if needed
        # This affects all asyncio operations unless they specify their own timeout
        if os.getenv("ASYNCIO_TIMEOUT"):
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
        # Run the async main function
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Speaker Agent server stopped by user.")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Error during server startup: {str(e)}", exc_info=True)
        sys.exit(1)