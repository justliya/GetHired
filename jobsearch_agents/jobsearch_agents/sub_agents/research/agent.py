from google.adk.agents.llm_agent import LlmAgent
from ...shared_libraries import constants
from . import prompt
from ...mcp_wrapper import mcp_wrapper

company_research_agent = LlmAgent(
    model=constants.MODEL,
    name="company_research_agent",
    description="Perform extensive research on companies and provide comprehensive intelligence reports",
    instruction=prompt.COMPANY_RESEARCH_AGENT_PROMPT,
    output_key="company_research",
    tools=[
        mcp_wrapper.create_toolset(
            external_url='https://gethired-mcp.onrender.com/jobsearch-mcp/',
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
    ]
)