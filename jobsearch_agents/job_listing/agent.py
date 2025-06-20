import asyncio
import os
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPServerParams
from google.adk.tools.agent_tool import AgentTool
from contextlib import AsyncExitStack
from . import prompt
from . import approval

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

MCP_TIMEOUT = float(os.getenv("MCP_CLIENT_TIMEOUT", "60.0"))
# Get MCP server URL from environment
MCP_SERVER_URL = os.getenv('MCP_SERVER_URL', 'https://gethired-mcp.onrender.com/jobsearch-mcp/')

request_approval = Agent(
    name="RequestHumanApproval",
    model="gemini-2.5-flash-preview-05-20",
    instruction=(
        "Invoke the LongRunningFunctionTool to send job listings . "
        "Wait for approval before proceeding."
    ),
    tools=[approval.approval_tool],
    output_key="approval_response",
)


async def create_agent():
    # Create exit stack first
    exit_stack = AsyncExitStack()

    # MCPToolset with proper timeout settings
    tools = MCPToolset(
        connection_params=StreamableHTTPServerParams(
            url=MCP_SERVER_URL,
            timeout=MCP_TIMEOUT,
            sse_read_timeout=MCP_TIMEOUT * 5,
        ),
        tool_filter=[
            "search_jobs",
            "search_jobs_by_company",
            "get_job_details",
        ],
    )

    # Register cleanup callback
    async def cleanup():
        if hasattr(tools, "close"):
            await tools.close()

    exit_stack.push_async_callback(cleanup)

    # Create the agent
    agent_instance = Agent(
        name="listing_search_agent",
        description=(
            "Search and retrieve job listings based on user preferences, "
            "then allow human selection of listings."
        ),
        instruction=prompt.LISTING_SEARCH_AGENT,
        model="gemini-2.5-flash-preview-05-20",
        tools=[tools],
        #AgentTool(agent=request_approval, skip_summarization=True)
    )

    return agent_instance, exit_stack

root_agent = create_agent()

