import asyncio
import os
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
from contextlib import AsyncExitStack
from . import prompt

env = os.environ.copy()


async def create_agent():
    """Create the job coach agent with MCP tools"""
    # Create exit stack first
    exit_stack = AsyncExitStack()

    # MCPToolset with proper timeout settings
    tools = MCPToolset(
        connection_params=StdioServerParameters(
            command="npx",
            args=["-y", "@gannonh/firebase-mcp"],
            env=env,
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

    async def cleanup():
        if hasattr(tools, "close"):
            await tools.close()

    exit_stack.push_async_callback(cleanup)

    agent_instance = Agent(
        name="jobcoach_agent",
        description="You are a job coach responsible for managing user job preferences and profile",
        model="gemini-2.0-flash-001",
        instruction=prompt.JOB_COACH,
        tools=[tools],
    )

    return agent_instance, exit_stack


def root_agent():
  
    return create_agent()
