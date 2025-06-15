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
    from datetime import timedelta as original_timedelta
    class PatchedTimedelta(original_timedelta):
        def __new__(cls, seconds=60, **kwargs):
            if seconds == 5:
                seconds = float(os.getenv('MCP_CLIENT_TIMEOUT', '60.0'))
            return super().__new__(cls, seconds=seconds, **kwargs)
    sys.modules['datetime'].timedelta = PatchedTimedelta
except Exception as e:
    print(f"Warning: Could not patch MCP timeout: {e}", file=sys.stderr)

import logging
import argparse
import uvicorn
import asyncio
import signal
from contextlib import AsyncExitStack
from dotenv import load_dotenv

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
load_dotenv(dotenv_path=dotenv_path, override=True)

from .task_manager import TaskManager
from .agent import root_agent
from common.a2a_server import create_agent_server

# Constants
default_timeout = 60.0

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

def parse_args():
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
        default=float(os.getenv("SPEAKER_AGENT_TIMEOUT", default_timeout)),
        help="Timeout for agent operations in seconds"
    )
    return parser.parse_args()

async def main():
    args = parse_args()

    # Apply log level
    logging.getLogger().setLevel(getattr(logging, args.log_level.upper()))
    logger.info("Starting Speaker Agent A2A Server initialization...")
    logger.info(f"Agent timeout set to: {args.timeout} seconds")

    # Track running tasks for cleanup
    running_tasks = set()
    
    def add_task(task):
        running_tasks.add(task)
        task.add_done_callback(running_tasks.discard)
    
    # Signal handler for graceful shutdown
    def signal_handler():
        logger.info("Received shutdown signal, cleaning up tasks...")
        for task in running_tasks:
            if not task.done():
                task.cancel()
    
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
        logger.info(f"Agent instance created: {agent_instance.name}")

        async with exit_stack:
            # Initialize TaskManager
            try:
                tm = TaskManager(agent=agent_instance, timeout=args.timeout)
            except TypeError:
                tm = TaskManager(agent=agent_instance)
                if hasattr(tm, 'timeout'):
                    tm.timeout = args.timeout
            
            # Determine bind address
            host = args.host
            port = int(os.getenv('PORT', args.port))

            # Create FastAPI app (CORS is now handled in create_agent_server)
            try:
                app = create_agent_server(
                    name=agent_instance.name,
                    description=agent_instance.description,
                    task_manager=tm,
                    timeout=args.timeout
                )
            except TypeError:
                app = create_agent_server(
                    name=agent_instance.name,
                    description=agent_instance.description,
                    task_manager=tm
                )

            logger.info(f"Speaker Agent A2A server starting on {host}:{port}")
            config = uvicorn.Config(app, host=host, port=port, log_level=args.log_level)
            server = uvicorn.Server(config)
            
            # Start server as a task
            server_task = asyncio.create_task(server.serve())
            add_task(server_task)
            
            try:
                await server_task
            except asyncio.CancelledError:
                logger.info("Server task was cancelled")
                
    except asyncio.CancelledError:
        logger.info("Main task was cancelled")
    except Exception as e:
        logger.error(f"Error during server execution: {e}", exc_info=True)
        raise
    finally:
        # Clean up any remaining tasks
        if running_tasks:
            logger.info(f"Cleaning up {len(running_tasks)} remaining tasks...")
            await asyncio.gather(*running_tasks, return_exceptions=True)

if __name__ == "__main__":
    try:
        if os.getenv("ASYNCIO_TIMEOUT"):
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Speaker Agent server stopped by user.")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Error during server startup: {e}", exc_info=True)
        sys.exit(1)