# company_research_agent.py
# pylint: disable=relative-beyond-top-level
from google.adk.agents.llm_agent import LlmAgent
from google.adk.tools import FunctionTool
from ...shared_libraries import constants
from .prompt import COMPANY_RESEARCH_AGENT_PROMPT
from ...tools.web_search import tools


company_research_agent = LlmAgent(
    model=constants.MODEL,
    name="company_research_agent",
    description="Perform extensive research on job postings and company details using web browsing",
    instruction=COMPANY_RESEARCH_AGENT_PROMPT,
    output_key="company_research",
    tools=tools,
)
