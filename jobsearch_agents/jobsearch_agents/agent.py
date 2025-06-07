"""
Job Search Optimization Agent
"""

import asyncio
import os
from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import StreamableHTTPServerParams
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset
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
            connection_params=StreamableHTTPServerParams(
                url=f"https://gethired-mcp-1.onrender.com/firebase-mcp/",
            ),
            tool_filter=[
                "auth_get_user",
                "storage_get_file_info",
                "firestore_list_documents",
                "firestore_get_document",
                "firestore_list_collections",
                "firestore_query_collection_group",
                "storage_upload",
                "storage_upload_from_url"


            ],
        )
    ],
)
