"""
Job Search Optimization Agent
"""

import os
import logging
from dotenv import load_dotenv

from google.adk.agents.llm_agent import LlmAgent
from google.adk.tools.mcp_tool.mcp_toolset import StreamableHTTPServerParams
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset

from .shared_libraries import constants
from .sub_agents.listing.agent import listing_search_agent
from .sub_agents.research.agent import company_research_agent
from . import prompt


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASEDIR = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(BASEDIR, "../.env"))

service_path = os.environ.get("SERVICE_ACCOUNT_KEY_PATH")
storage = os.environ.get("FIREBASE_STORAGE_BUCKET")


# --- Main Agent Definition ---
root_agent = LlmAgent(
    model="gemini-2.0-flash-001",
    name=constants.AGENT_NAME,
    description=constants.DESCRIPTION,
    instruction=prompt.ROOT_PROMPT,
    output_key="preferred_job_listings",
    sub_agents=[
        listing_search_agent,
        company_research_agent,
    ],
    tools=[
        # Firebase MCP Server for storage and coordination
        MCPToolset(
              connection_params=StreamableHTTPServerParams(
                url='http://localhost:3000/mcp',
                env={
                    "SERVICE_ACCOUNT_KEY_PATH": service_path,
                    "FIREBASE_STORAGE_BUCKET": storage,
                },
            ),
            tool_filter=[
                "auth_get_user",
                "storage_get_file_info",
                "firestore_list_documents",
                "firestore_get_document",
                "firestore_list_collections",
                "firestore_query_collection_group",
            ],
        ),
    ],
)
