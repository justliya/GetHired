"""
Job Search Optimization Agent

"""
import asyncio
import logging
from dotenv import load_dotenv
from google.genai import types
from google.adk.agents.llm_agent import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPServerParams
from google.adk.artifacts.in_memory_artifact_service import InMemoryArtifactService
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset
from .shared_libraries import constants
from .sub_agents.listing.agent import listing_search_agent
from .sub_agents.research.agent import company_research_agent
from . import prompt


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


load_dotenv(".env")

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
        MCPToolset(
            connection_params=StreamableHTTPServerParams(
                url="https://gethired-mcp.onrender.com/jobsearch-mcp",
            ),
        )
    ],
)


# --- Main Execution Logic ---
async def async_main():
    session_service = InMemorySessionService()
    artifacts_service = InMemoryArtifactService()

    session = await session_service.create_session(
        state={}, app_name="job_search_app", user_id="job_seeker_001"
    )

    queries = [
        "Search for python developer jobs in San Francisco",
        "What's the salary range for data scientist positions in New York?",
        "Find all software engineer jobs at Google",
        "Get salary information for Amazon software developers",
    ]

    query = queries[0]
    print(f"User Query: '{query}'")
    content = types.Content(role="user", parts=[types.Part(text=query)])

    runner = Runner(
        app_name="job_search_app",
        agent=root_agent,
        artifact_service=artifacts_service,
        session_service=session_service,
    )

    print("Running Job Search agent...")
    try:
        events_async = runner.run_async(
            session_id=session.id, user_id=session.user_id, new_message=content
        )

        async for event in events_async:
            print(f"Event received: {event}")
    except Exception as e:
        logger.error(f"Error during execution: {e}")


# --- Interactive Mode ---
async def interactive_job_search():
    """Interactive mode for continuous job search queries."""
    session_service = InMemorySessionService()
    artifacts_service = InMemoryArtifactService()

    session = await session_service.create_session(
        state={}, app_name="interactive_job_search", user_id="job_seeker_interactive"
    )

    runner = Runner(
        app_name="interactive_job_search",
        agent=root_agent,
        artifact_service=artifacts_service,
        session_service=session_service,
    )

    try:
        print("=== Interactive Job Search Assistant ===")
        print("Ask me about jobs, salaries, companies, or type 'quit' to exit.")
        print("\nExample queries:")
        print("- 'Find remote data science jobs'")
        print("- 'What does a software engineer make at Microsoft?'")
        print("- 'Search for entry-level positions in Chicago'")
        print("-" * 50)

        while True:
            user_input = input("\nYour question: ").strip()

            if user_input.lower() in ["quit", "exit", "q"]:
                break

            if not user_input:
                continue

            print(f"\nSearching for: {user_input}")
            content = types.Content(role="user", parts=[types.Part(text=user_input)])

            try:
                events_async = runner.run_async(
                    session_id=session.id, user_id=session.user_id, new_message=content
                )

                print("\n--- Response ---")
                async for event in events_async:
                    if hasattr(event, "message") and event.message:
                        print(event.message)
                    else:
                        print(f"Event: {event}")
                print("-" * 30)
            except Exception as e:
                logger.error(f"Error processing query: {e}")
                print(f"Sorry, there was an error processing your request: {e}")

    except KeyboardInterrupt:
        print("\nExiting...")
    except Exception as e:
        logger.error(f"Error in interactive mode: {e}")


if __name__ == "__main__":
    import sys

    # Choose mode based on command line argument
    if len(sys.argv) > 1 and sys.argv[1] == "--interactive":
        try:
            asyncio.run(interactive_job_search())
        except Exception as e:
            print(f"An error occurred in interactive mode: {e}")
    else:
        try:
            asyncio.run(async_main())
        except Exception as e:
            print(f"An error occurred: {e}")