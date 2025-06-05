"""
Job Search Optimization Agent
"""

import asyncio
import os
from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
from dotenv import load_dotenv
from .shared_libraries import constants
from .sub_agents.listing.agent import listing_search_agent
from .sub_agents.research.agent import company_research_agent
from . import prompt

# Correct path reference
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

# Define root agent with proper indentation
root_agent = Agent(
    name="jobcoach_agent",
    description=constants.DESCRIPTION,
    model="gemini-2.0-flash-001",
    instruction=prompt.ROOT_PROMPT,
    sub_agents=[listing_search_agent, company_research_agent],
    tools=[
        MCPToolset(
            connection_params=StdioServerParameters(
                command="npx",
                args=["-y", "firebase-tools@latest", "experimental:mcp"],
            ),
            tool_filter=[
                "firestore_list_collections",
                "firestore_query_collection",
                "auth_get_user",
                "storage_get_object_download_url",
                "firestore_get_documents",
            ],
        )
    ],
)