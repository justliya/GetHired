import asyncio
import os
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPServerParams
from pydantic import BaseModel, HttpUrl
from typing import List
from datetime import date
from contextlib import AsyncExitStack
from . import prompt

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
MCP_SERVER_URL = os.getenv('MCP_SERVER_URL', 'https://gethired-mcp.onrender.com/jobsearch-mcp/')
class JobListing(BaseModel):
    listing_number: int  # integer 10
    title: str
    company: str
    location: str  # e.g., "City, State"
    salary: str  # e.g., "$X–$Y" or "Not specified"
    date_posted: date  # format YYYY-MM-DD
    description: str
    qualifications: List[str]
    benefits: List[str]
    job_link: HttpUrl
    easy_apply: bool

async def create_agent():
    # Create exit stack first
    exit_stack = AsyncExitStack()
    
    # MCPToolset is NOT awaitable - instantiate directly
    tools = MCPToolset(
        connection_params=StreamableHTTPServerParams(
            url=MCP_SERVER_URL,
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
        input_schema=JobListing,
        output_key="company_research_report",
    )
    
    return agent_instance, exit_stack

root_agent = create_agent()


