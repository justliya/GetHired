
from google.adk.agents.llm_agent import Agent
from ...shared_libraries import constants
from . import prompt


company_research_agent = Agent(
    model=constants.MODEL,
    name="company_research_agent",
    description="Preform extensive research on job postings and collect information that helps user make an informed decision before applyingc",
    instruction=prompt.COMPANY_RESEARCH_AGENT_PROMPT,
    output_key='company_research',

)