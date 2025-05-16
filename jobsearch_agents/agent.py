
"""Job Search Optimization Agent"""

from google.adk.agents.llm_agent import Agent

from .shared_libraries import constants

from .sub_agents.listing.agent import listing_agent
from .sub_agents.research.agent import research_agent
from .sub_agents.resume.agent import resume_agent
from .sub_agents.application.agent import application_agent

from . import prompt


root_agent = Agent(
    model=constants.MODEL,
    name=constants.AGENT_NAME,
    description=constants.DESCRIPTION,
    instruction=prompt.ROOT_PROMPT,
    sub_agents=[
        listing_agent,
        research_agent,
        resume_agent,
        application_agent,
    ],
)