# sub_agents/listing/agent.py

from google.adk.agents import LlmAgent
from ...shared_libraries import constants
from . import prompt
from ...tools.web_search import tools as web_tools
from ...tools.approval import approval_tool

from google.adk.tools.agent_tool import AgentTool

request_approval = LlmAgent(
    name="RequestHumanApproval",
    instruction=(
        "Invoke the LongRunningFunctionTool to send job listings for human review. "
        "Wait for approval before proceeding."
    ),
    tools=[approval_tool],
    output_key="approval_response"
)

listing_search_agent = LlmAgent(
    model=constants.MODEL,
    name="listing_search_agent",
    description=(
        "Search and retrieve job listings based on user preferences via web browsing, "
        "then allow a human to select which listings to research further."
    ),
    instruction=prompt.LISTING_SEARCH_AGENT_PROMPT,
    output_key="job_listings",
    tools=[
        *web_tools,
        AgentTool(agent=request_approval, skip_summarization=True)
    ]
)