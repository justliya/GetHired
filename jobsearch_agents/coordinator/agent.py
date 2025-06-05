import os
from contextlib import AsyncExitStack
from google.adk.agents import Agent
from dotenv import load_dotenv

from job_coach.agent import create_agent as coach_agent
from company_research.agent import create_agent as company_research_agent
#from resume.agent import create_agent as resume_agent
from job_listing.agent import create_agent as jobsearch_agent
from . import prompt


load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
api_key=os.environ.get("GOOGLE_API_KEY")

async def create_coordinator_agent():
    exit_stack = AsyncExitStack()
    await exit_stack.__aenter__()
    
    jobcoach_agent, profile_stack = await coach_agent()
    await exit_stack.enter_async_context(profile_stack)
    
    listing_search_agent, listing_stack = await jobsearch_agent()
    await exit_stack.enter_async_context(listing_stack)
    
    company_research, research_stack = await company_research_agent()
    await exit_stack.enter_async_context(research_stack)
    
   # resume, edit_stack = await resume_agent()
   # await exit_stack.enter_async_context(edit_stack)

    coordinator = Agent(
        name="coordinator_agent",
        description=prompt.ROOT_PROMPT,
        model="gemini-2.0-flash-001",
        instruction=(
            "Your ultimate goal is to make the job search process highly automated user interaction is not required unless getting approval or advising"
        ),
        sub_agents=[listing_search_agent, company_research, jobcoach_agent]
        
    )
    return coordinator, exit_stack

root_agent = create_coordinator_agent()