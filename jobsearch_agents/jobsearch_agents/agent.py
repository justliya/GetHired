"""
Job Search Optimization Agent
"""
import os
import logging
from contextlib import AsyncExitStack
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
from .shared_libraries import constants
from .sub_agents.listing.agent import listing_search_agent
from .sub_agents.research.agent import company_research_agent
from . import prompt

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv(".env")

service_path = os.environ.get("SERVICE_ACCOUNT_KEY_PATH")
storage = os.environ.get("FIREBASE_STORAGE_BUCKET")


async def create_job_search_agent():
    """Creates the Job Search agent with MCP tools and sub-agents."""
    
    # Create exit stack for managing MCP connections
    exit_stack = AsyncExitStack()
    await exit_stack.__aenter__()
    
    try:
        # Connect to Firebase MCP Server
        print("--- Connecting to Firebase MCP server ---")
        firebase_tools, firebase_stack = await MCPToolset.from_server(
            connection_params=StdioServerParameters(
                command='npx',
                args=[
                    "-y",
                    "@gannonh/firebase-mcp"
                ],
                env={
                    "SERVICE_ACCOUNT_KEY_PATH": service_path,
                    "FIREBASE_STORAGE_BUCKET": storage,
                }
            )
        )
        await exit_stack.enter_async_context(firebase_stack)
        
        # Filter the tools we want to use
        filtered_tools = [
            tool for tool in firebase_tools 
            if tool.name in [
                'auth_get_user',
                'storage_get_file_info',
                'firestore_list_documents',
                'firestore_get_document',
                'firestore_list_collections',
                'firestore_query_collection_group',
            ]
        ]
        
        print(f"--- Successfully connected. Using {len(filtered_tools)} Firebase tools. ---")
        
    except Exception as e:
        print(f"--- ERROR connecting to Firebase MCP server: {e} ---")
        filtered_tools = []
    
    # Create the main agent
    job_search_agent = Agent(
        model="gemini-2.0-flash-001",
        name=constants.AGENT_NAME,
        description=constants.DESCRIPTION,
        instruction=prompt.ROOT_PROMPT,
        sub_agents=[
            listing_search_agent,
            company_research_agent,
        ],
        tools=filtered_tools
    )
    
    return job_search_agent, exit_stack


# This is what ADK looks for
root_agent = create_job_search_agent()


# --- Test/Debug Functions (not used by ADK) ---
async def test_agent():
    """Test function for local development."""
    from google.genai import types
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService
    from google.adk.artifacts.in_memory_artifact_service import InMemoryArtifactService
    
    # Create agent and exit stack
    agent, exit_stack = await create_job_search_agent()
    
    async with exit_stack:
        session_service = InMemorySessionService()
        artifacts_service = InMemoryArtifactService()
        
        session = await session_service.create_session(
            state={}, app_name="job_search_app", user_id="job_seeker_001"
        )
        
        query = "Search for python developer jobs in San Francisco"
        print(f"User Query: '{query}'")
        content = types.Content(role="user", parts=[types.Part(text=query)])
        
        runner = Runner(
            app_name="job_search_app",
            agent=agent,
            artifact_service=artifacts_service,
            session_service=session_service,
        )
        
        print("Running Job Search agent...")
        try:
            events_async = runner.run_async(
                session_id=session.id, user_id=session.user_id, new_message=content
            )
            
            async for event in events_async:
                print(f"Event received: {event}")
        except Exception as e:
            logger.error(f"Error during execution: {e}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_agent())