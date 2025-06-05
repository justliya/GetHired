import asyncio
import os
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, SseServerParams
from contextlib import AsyncExitStack
from . import prompt

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))


# Get MCP timeout from environment or use default (60 seconds)
MCP_TIMEOUT = float(os.getenv("MCP_CLIENT_TIMEOUT", "60.0"))

async def create_agent():
    # Create exit stack first
    exit_stack = AsyncExitStack()
    
    # MCPToolset with proper timeout settings
    tools = MCPToolset(
        connection_params=SseServerParams(
            url='https://gethired-mcp.onrender.com/jobsearch-mcp/',
            timeout=MCP_TIMEOUT,  # Connection timeout
            sse_read_timeout=MCP_TIMEOUT * 5  # SSE read timeout (5x connection timeout)

        ),
        tool_filter=[
            # Company Research Tools
            'search_companies',
            'get_company_overview',
            'get_company_reviews',
            'get_company_salaries_glassdoor',
            'get_company_interviews',
            'get_company_salary'
        ]
    )
    
    # Register cleanup callback
    async def cleanup():
        if hasattr(tools, 'close'):
            await tools.close()
    
    exit_stack.push_async_callback(cleanup)
    
    # Create the agent
    agent_instance = Agent(
        name="company_research",
        description="Perform extensive research on companies and provide comprehensive intelligence reports",
        instruction=prompt.COMPANY_RESEARCH_AGENT_PROMPT,
        model="gemini-2.0-flash-001",
        tools=[tools], 
    )
    
    return agent_instance, exit_stack

root_agent = create_agent()