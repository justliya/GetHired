import os
from dotenv import load_dotenv
from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPServerParams
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from contextlib import AsyncExitStack
from . import prompt


load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
MCP_SERVER_URL = os.getenv(
    "MCP_SERVER_URL", "https://gethired-mcp.onrender.com/jobsearch-mcp/"
)


class Preferences(BaseModel):
    location: str = Field(description="City, State or Country")
    keywords: List[str] = Field(
        default_factory=list, description="Primary keywords to search for"
    )
    jobType: str = Field(
        description="Type of job (e.g., full-time, part-time, contract)"
    )
    excludeKeywords: List[str] = Field(
        default_factory=list, description="Keywords to exclude from search"
    )
    remote: Literal["yes", "no", "hybrid"] = Field(description="Remote work preference")
    experienceLevel: Literal["entry", "mid", "senior"] = Field(
        description="Experience level"
    )
    salaryMin: Optional[float] = Field(
        default=None, description="Minimum desired salary"
    )
    salaryMax: Optional[float] = Field(
        default=None, description="Maximum desired salary"
    )
    skills: List[str] = Field(
        default_factory=list, description="Required or preferred skills"
    )
    titles: List[str] = Field(default_factory=list, description="Preferred job titles")
    companies: List[str] = Field(default_factory=list, description="Target companies")
    other: List[str] = Field(
        default_factory=list, description="Additional filters or preferences"
    )


async def create_agent():
    # Create exit stack first
    exit_stack = AsyncExitStack()

    # MCPToolset with proper timeout settings
    toolset = MCPToolset(
        connection_params=StreamableHTTPServerParams(
            url=MCP_SERVER_URL,
        ),
        tool_filter=[
            "search_jobs",
            "search_jobs_by_company",
            "get_job_details",
            "search_glassdoor_jobs",
        ],
    )

    # Register cleanup callback
    async def cleanup():
        if hasattr(toolset, "close"):
            await toolset.close()

    exit_stack.push_async_callback(cleanup)

    # Create the agent
    agent_instance = Agent(
        name="listing_search_agent",
        description=("Search and retrieve job listings based on user preferences, "),
        instruction=prompt.LISTING_SEARCH_AGENT_PROMPT,
        model="gemini-2.5-flash-preview-05-20",
        output_key="job_listings",
        tools=[toolset],
    )

    return agent_instance, exit_stack


root_agent = create_agent()
