import os
from contextlib import AsyncExitStack
from google.adk.agents import Agent
from dotenv import load_dotenv
from google.adk.agents import SequentialAgent
from profile.agent import create_agent as profile_agent
from company_research.agent import create_agent as company_research_agent
from resume.agent import create_agent as resume_agent
from job_listing.agent import create_agent as jobsearch_agent



load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", ".env"))


async def create_coordinator_agent():
    exit_stack = AsyncExitStack()
    await exit_stack.__aenter__()

    profile_preferences, profile_stack = await profile_agent()
    await exit_stack.enter_async_context(profile_stack)

    listing_search_agent, listing_stack = await jobsearch_agent()
    await exit_stack.enter_async_context(listing_stack)

    company_research, research_stack = await company_research_agent()
    await exit_stack.enter_async_context(research_stack)

    resume, edit_stack = await resume_agent()
    await exit_stack.enter_async_context(edit_stack)




    jobsearch_pipeline = SequentialAgent(
        name="job_search_ai_assistant",
        description="execute a sequence of profile_agent, listing_search, and company_research",
        sub_agents=[ profile_preferences, listing_search_agent, company_research]
        
    )


    coordinator = Agent(
        name="coordinator_agent",
        description="jobsearch_pipeline that executes a sequence of profile_agent, listing_search, and company_research, and the resume tailoring agent for job applications.",
        model="gemini-2.0-flash-001",
        instruction="",
        sub_agents=[ jobsearch_pipeline, resume],
    )
    return coordinator, exit_stack


root_agent = create_coordinator_agent()
