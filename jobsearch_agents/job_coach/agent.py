import asyncio
import os
from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
from dotenv import load_dotenv
from contextlib import AsyncExitStack


load_dotenv("./env")


async def get_tools_async():
    # MCPToolset is not awaitable - instantiate it directly
    tools = MCPToolset(
        connection_params=StdioServerParameters(
            command="npx",
            args=["-y", "@gannonh/firebase-mcp"],
            env={
                "SERVICE_ACCOUNT_KEY_PATH": os.path.abspath(os.environ.get("SERVICE_ACCOUNT_KEY_PATH", "")),
                "FIREBASE_STORAGE_BUCKET": os.environ.get("FIREBASE_STORAGE_BUCKET", ""),
            }
        ),
        tool_filter=[
            "auth_get_user",
            "storage_get_file_info",
            "firestore_list_documents",
            "firestore_get_document",
            "firestore_list_collections",
            "firestore_query_collection_group",
        ],
    )
    
    # Create an exit stack to manage the toolset lifecycle
    exit_stack = AsyncExitStack()
    
    # Register cleanup callback if the toolset has a close method
    async def cleanup():
        if hasattr(tools, 'close'):
            await tools.close()
    
    exit_stack.push_async_callback(cleanup)
    
    return tools, exit_stack


async def create_agent():
    tools, exit_stack = await get_tools_async()
    agent_instance = Agent(
        name="jobsearch_agent",
        description="You are job search agent that automates and personalizes the job search process. Your primary function is to pass task results through agents. Starting with job listing agent that search for jobs based off user preferences, research the companies, tailor resume to each job description, and apply for the job upon users approval.",
        model="gemini-2.0-flash-001",
        instruction="Be a friendly job coach when user initiatiates",
        tools=[tools],  # Note: tools should be a list
    )
    return agent_instance, exit_stack


root_agent = create_agent()