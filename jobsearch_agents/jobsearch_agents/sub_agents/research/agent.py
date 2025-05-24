# company_research_agent.py
from google.adk.agents.llm_agent import LlmAgent
from google.adk.tools import FunctionTool
from ...shared_libraries import constants
from . import prompt
from ...tools.web_search import tools


company_research_agent = LlmAgent(
    model=constants.MODEL,
    name="company_research_agent",
    description="Perform extensive research on job postings and company details using web browsing",
    instruction=prompt.COMPANY_RESEARCH_AGENT_PROMPT,
    output_key="company_research",
    tools=tools,
)
