#!/usr/bin/env python
"""
Initializes and starts the Job Search AI Assistant server.
"""

import os
import sys
import logging
import argparse
import uvicorn
import asyncio
import signal
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
load_dotenv(dotenv_path=dotenv_path, override=True)

from .task_manager import TaskManager
from .agent import root_agent
from common.a2a_server import create_agent_server

# Constants
DEFAULT_TIMEOUT = 300.0
DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 8080

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# Global exit stack for proper cleanup
global_exit_stack = None
agent_instance = None

@asynccontextmanager
async def lifespan(app):
    """Lifespan context manager for FastAPI app."""
    # Startup
    yield
    # Shutdown - cleanup will be handled by main()

def parse_args():
    parser = argparse.ArgumentParser(description="Start the Job Search AI Assistant server")
    parser.add_argument(
        "--host",
        type=str,
        default=os.getenv("JOB_SEARCH_HOST", DEFAULT_HOST),
        help="Host to bind the server to"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.getenv("JOB_SEARCH_PORT", str(DEFAULT_PORT))),
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
        default=float(os.getenv("JOB_SEARCH_TIMEOUT", str(DEFAULT_TIMEOUT))),
        help="Timeout for agent operations in seconds"
    )
    return parser.parse_args()

async def main():
    global global_exit_stack, agent_instance
    
    args = parse_args()

    # Apply log level
    logging.getLogger().setLevel(getattr(logging, args.log_level.upper()))
    logger.info("Starting Job Search AI Assistant Server initialization...")
    logger.info(f"Agent timeout set to: {args.timeout} seconds")

    # Track if we're shutting down
    shutdown_event = asyncio.Event()
    
    # Signal handler for graceful shutdown
    def signal_handler():
        logger.info("Received shutdown signal...")
        shutdown_event.set()
    
    # Set up signal handlers
    try:
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(sig, signal_handler)
    except NotImplementedError:
        # Windows doesn't support add_signal_handler
        pass

    try:
        # Instantiate agent and exit stack
        agent_instance, exit_stack = await root_agent
        global_exit_stack = exit_stack
        logger.info(f"Agent instance created: {agent_instance.name}")
        logger.info("Sub-agents loaded: profile analyzer, job searcher, company researcher")

        # Initialize TaskManager
        tm = TaskManager(agent=agent_instance, timeout=args.timeout)
        
        # Determine bind address
        host = args.host
        port = int(os.getenv('PORT', args.port))

        # Create FastAPI app with lifespan
        from fastapi import FastAPI
        app_base = create_agent_server(
            name=agent_instance.name,
            description=agent_instance.description,
            task_manager=tm
        )
        
        # Create a new FastAPI instance with lifespan management
        app = FastAPI(
            title=app_base.title,
            description=app_base.description,
            version=app_base.version,
            lifespan=lifespan
        )
        
        # Copy all routes from base app
        for route in app_base.routes:
            app.routes.append(route)

        logger.info(f"Job Search AI Assistant server starting on {host}:{port}")
        logger.info(f"API documentation available at http://{host}:{port}/docs")
        logger.info(f"Main endpoint: POST http://{host}:{port}/run-job-search")
        
        config = uvicorn.Config(
            app, 
            host=host, 
            port=port, 
            log_level=args.log_level,
            access_log=True,
            loop="asyncio",
            lifespan="on"
        )
        server = uvicorn.Server(config)
        
        # Run server in a task
        server_task = asyncio.create_task(server.serve())
        
        # Wait for shutdown signal
        await shutdown_event.wait()
        
        logger.info("Initiating graceful shutdown...")
        
        # Shutdown the server
        server.should_exit = True
        
        # Wait for server to finish with timeout
        try:
            await asyncio.wait_for(server_task, timeout=10.0)
        except asyncio.TimeoutError:
            logger.warning("Server shutdown timed out")
            server_task.cancel()
            try:
                await server_task
            except asyncio.CancelledError:
                pass
                
    except Exception as e:
        logger.error(f"Error during server execution: {e}", exc_info=True)
        raise
    finally:
        # Clean up the exit stack in the same task context
        if global_exit_stack:
            try:
                logger.info("Cleaning up agent resources...")
                await global_exit_stack.__aexit__(None, None, None)
                logger.info("Agent cleanup completed")
            except Exception as e:
                logger.error(f"Error during agent cleanup: {e}", exc_info=True)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Job Search AI Assistant server stopped by user.")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Error during server startup: {e}", exc_info=True)
        sys.exit(1)