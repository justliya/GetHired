import os

from google.adk.agents.llm_agent import LlmAgent
from ...shared_libraries import constants
from . import prompt
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters
# Import from mcp_toolset, not mcp_session_manager
from google.adk.tools.mcp_tool.mcp_toolset import SseServerParams

google_maps_api_key = os.environ.get("GOOGLE_MAPS_API_KEY")

company_research_agent = LlmAgent(
    model=constants.MODEL,
    name="company_research_agent",
    description="Perform extensive research on companies and provide comprehensive intelligence reports",
    instruction=prompt.COMPANY_RESEARCH_AGENT_PROMPT,
    output_key="company_research",
    tools=[
        MCPToolset(
            connection_params=SseServerParams(
                url='https://gethired-mcp.onrender.com/jobsearch-mcp',
                timeout=15
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
        ),
        MCPToolset(
            connection_params=StdioServerParameters(
                command='npx',
                args=[
                    "-y",
                    "@modelcontextprotocol/server-google-maps",
                ],
                env={
                    "GOOGLE_MAPS_API_KEY": google_maps_api_key
                },
            ),
            tool_filter=[
                'maps_geocode',
                'maps_search_places',
                'maps_place_details',
                'maps_distance_matrix',
                'maps_directions'
            ]
        )
    ]
)