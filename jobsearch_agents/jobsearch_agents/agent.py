"""
Job Search Optimization Agent

"""

from google.adk.agents.llm_agent import Agent

from .shared_libraries import constants
from .sub_agents.listing.agent import listing_search_agent
from .sub_agents.research.agent import company_research_agent
from . import prompt

MODEL = "gemini-2.0-flash-exp"


root_agent = Agent(
    model=MODEL,
    name=constants.AGENT_NAME,
    description=constants.DESCRIPTION,
    instruction=prompt.ROOT_PROMPT,
    sub_agents=[
        listing_search_agent,
        company_research_agent,
    ],
)
