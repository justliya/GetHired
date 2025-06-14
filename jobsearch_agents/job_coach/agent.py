import asyncio
import os
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset
from google.adk.tools.mcp_tool.mcp_toolset import StreamableHTTPServerParams
from contextlib import AsyncExitStack


load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

# Get MCP timeout from environment or use default (60 seconds)
MCP_TIMEOUT = float(os.getenv("MCP_CLIENT_TIMEOUT", "60.0"))

async def create_agent():
    # Create exit stack first
    exit_stack = AsyncExitStack()
    
    # MCPToolset with proper timeout settings
    tools = MCPToolset(
        connection_params=StreamableHTTPServerParams(
            url='http://localhost:3000/mcp',
            
        ),
        tool_filter=[
            # Company Research Tools
            "auth_get_user",
            "storage_get_file_info",
            "firestore_list_documents",
            "firestore_get_document",
            "firestore_list_collections",
            "firestore_query_collection_group",
        ]
    )
    
    # Register cleanup callback
    async def cleanup():
        if hasattr(tools, 'close'):
            await tools.close()
    
    exit_stack.push_async_callback(cleanup)
    
    # Create the agent
    agent_instance = Agent(
        name="jobcoach_agent",
        description="You are job search agent that automates and personalizes the job search process. Your primary function is to pass task results through agents. Starting with job listing agent that search for jobs based off user preferences, research the companies, tailor resume to each job description, and apply for the job upon users approval.",
        model="gemini-2.0-flash-001",
        instruction="Be a friendly job coach when user initiatiates",
        tools=[tools],  # Pass the toolset directly
    )
    
    return agent_instance, exit_stack
    


root_agent = create_agent()