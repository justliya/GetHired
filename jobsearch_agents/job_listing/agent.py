import asyncio
import os
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, SseServerParams
from google.adk.tools.agent_tool import AgentTool
from contextlib import AsyncExitStack
from . import prompt
from . import approval


load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))


request_approval = Agent(
    name="RequestHumanApproval",
    instruction=(
        "Invoke the LongRunningFunctionTool to send job listings for human review. "
        "Wait for approval before proceeding."
    ),
    tools=[approval.approval_tool],
    output_key="approval_response"
)


async def create_agent():
    # Create exit stack first
    exit_stack = AsyncExitStack()
    
    # MCPToolset is NOT awaitable - instantiate directly
    tools = MCPToolset(
        connection_params=SseServerParams(
            url='https://gethired-mcp.onrender.com/jobsearch-mcp/',
        ),
        tool_filter=[
            'search_jobs',
            'search_jobs_by_company',
            'get_job_details',
            'search_glassdoor_jobs',
        ]
    )
    
    # Register cleanup callback
    async def cleanup():
        if hasattr(tools, 'close'):
            await tools.close()
    
    exit_stack.push_async_callback(cleanup)
    
    # Create the agent
    agent_instance = Agent(
        name="listing_search_agent",
        description=(
            "Search and retrieve job listings based on user preferences, "
            "then allow human selection of listings for further research."
        ),
        instruction=prompt.LISTING_SEARCH_AGENT_PROMPT,
        model="gemini-2.0-flash-001",
        tools=[tools, AgentTool(agent=request_approval, skip_summarization=True)],
    )
    
    return agent_instance, exit_stack


root_agent = create_agent()