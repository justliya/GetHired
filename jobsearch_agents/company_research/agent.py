import asyncio
import os
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPServerParams
from contextlib import AsyncExitStack
from . import prompt

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

# Get MCP server URL from environment
MCP_SERVER_URL = os.getenv('MCP_SERVER_URL', 'https://gethired-mcp.onrender.com/jobsearch-mcp/')


async def create_agent():

    exit_stack = AsyncExitStack()

    tools = MCPToolset(
        connection_params=StreamableHTTPServerParams(
            url=MCP_SERVER_URL,
        ),
        tool_filter=[
            "search_companies",
            "get_company_overview",
            "get_company_reviews",
            "get_company_salaries_glassdoor",
            "get_company_interviews",
            "get_company_salary",
        ],
    )

    async def cleanup():
        if hasattr(tools, "close"):
            await tools.close()

    exit_stack.push_async_callback(cleanup)

    agent_instance = Agent(
        name="company_research",
        description="Perform extensive research on companies and provide comprehensive insightful reports",
        instruction=prompt.COMPANY_RESEARCH_AGENT_PROMPT,
        model="gemini-2.0-flash-001",
        tools=[tools],
    )

    return agent_instance, exit_stack


root_agent = create_agent()
