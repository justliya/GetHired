import asyncio
import os
from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
from dotenv import load_dotenv
from contextlib import AsyncExitStack

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
service_account_dir = "/Users/aaliyahjohnson/GetHired-typescript/jobsearch_agents/coordinator/serviceAccountKey.json"
async def create_agent():
    # Create an exit stack to manage the toolset lifecycle
    exit_stack = AsyncExitStack()
    
    # Create MCPToolset with tool_filter
    toolset = MCPToolset(
        connection_params=StdioServerParameters(
            command="npx",
            args= ["-y", "firebase-tools@latest", "experimental:mcp"],
            service_account_dir=service_account_dir,
        ),
        tool_filter=[
            "firestore_list_collections",
            "firestore_query_collection",
            "auth_get_user",
            "storage_get_object_download_url",
            "firestore_get_documents",
            
        ]
    )
    
    # Register cleanup
    exit_stack.push_async_callback(toolset.close)
    
    agent_instance = Agent(
        name="jobcoach_agent",
        description="You are job search agent that automates and personalizes the job search process. Your primary function is to pass task results through agents. Starting with job listing agent that search for jobs based off user preferences, research the companies, tailor resume to each job description, and apply for the job upon users approval.",
        model="gemini-2.0-flash-001",
        instruction="Be a friendly job coach when user initiatiates",
        tools=[toolset],  # Pass the toolset directly
    )
    
    return agent_instance, exit_stack

root_agent = create_agent()