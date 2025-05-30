# sub_agents/listing/agent.py

from google.adk.agents import LlmAgent
from ...shared_libraries import constants
from . import prompt
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPServerParams
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
        "Search and retrieve job listings based on user preferences , "
        "then allow human selection of listings for further research."
    ),
    instruction=prompt.LISTING_SEARCH_AGENT_PROMPT,
    output_key="job_listings",
    tools=[
        MCPToolset(
            connection_params=StreamableHTTPServerParams(
                url='https://gethired-mcp.onrender.com/jobsearch-mcp',
            ),
            tool_filter=[
                # Job Discovery Tools
                'search_jobs',
                'search_jobs_by_company',
                'get_job_details',
                'search_glassdoor_jobs',
                
                
            ]
        ),
        AgentTool(agent=request_approval, skip_summarization=True)
    ]
)