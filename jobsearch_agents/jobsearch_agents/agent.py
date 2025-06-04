# agent.py
import os
import logging
from dotenv import load_dotenv
from google.adk.agents.llm_agent import LlmAgent
from .shared_libraries import constants
from .sub_agents.listing.agent import listing_search_agent
from .sub_agents.research.agent import company_research_agent
from .mcp_wrapper import mcp_wrapper
from . import prompt

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv(".env")

service_path = os.environ.get("SERVICE_ACCOUNT_KEY_PATH")
storage = os.environ.get("FIREBASE_STORAGE_BUCKET")

# Log environment variables for debugging
logger.info(f"SERVICE_ACCOUNT_KEY_PATH: {service_path}")
logger.info(f"FIREBASE_STORAGE_BUCKET: {storage}")

# Check if service account file exists
if service_path and os.path.exists(service_path):
    logger.info(f"Service account key file found at: {service_path}")
else:
    logger.warning(f"Service account key file not found at: {service_path}")

# --- Main Agent Definition ---
root_agent = LlmAgent(
    model="gemini-2.0-flash-001",
    name=constants.AGENT_NAME,
    description=constants.DESCRIPTION,
    instruction=prompt.ROOT_PROMPT,
    sub_agents=[
        listing_search_agent,
        company_research_agent,
    ],
    tools=[
        # Use the wrapper for Firebase MCP Server
        mcp_wrapper.create_toolset(
            server_command="npx",
            server_args=["-y", "@gannonh/firebase-mcp"],
            server_env={
                "SERVICE_ACCOUNT_KEY_PATH": service_path,
                "FIREBASE_STORAGE_BUCKET": storage,
            },
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