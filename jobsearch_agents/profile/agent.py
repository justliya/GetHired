import os
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
from contextlib import AsyncExitStack
from pydantic import BaseModel
from . import prompt

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))


env = os.environ.copy()


class User(BaseModel):
    user_id: str


async def create_agent():
    """Create the job coach agent with MCP tools"""
    # Create exit stack first
    exit_stack = AsyncExitStack()

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

    # Register cleanup callback
    async def cleanup():
        if hasattr(tools, "close"):
            await tools.close()

    exit_stack.push_async_callback(cleanup)

    # Create the agent
    agent_instance = Agent(
        name="profile_agent",
        description="You are job search agent that automates and personalizes the job search process. Your primary function is to pass task results through agents. Starting with job listing agent that search for jobs based off user preferences, research the companies, tailor resume to each job description, and apply for the job upon users approval.",
        model="gemini-2.0-flash-001",
        instruction=prompt.PROFILE,
        tools=[tools],
        input_schema=User,
        output_key="user_preferences",
    )

    return agent_instance, exit_stack


# Create a function that returns the coroutine
def root_agent():
    """Return the agent creation coroutine"""
    return create_agent()
