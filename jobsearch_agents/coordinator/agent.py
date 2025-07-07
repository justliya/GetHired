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
    description="Orchestrates job search and resume tailoring workflows by coordinating between the job search pipeline and resume optimization agent",
    model="gemini-2.0-flash-001",
    instruction="""You are the master coordinator for a comprehensive job search and application system.

Your role is to:
1. Route requests to the appropriate sub-agent based on user intent
2. For job search requests: Direct to the job_search_ai_assistant pipeline which will:
   - Fetch user preferences from Firebase
   - Search for matching job listings
   - Research companies for found positions
3. For resume tailoring requests: Direct to the resume agent to optimize resumes for specific job descriptions

Key behaviors:
- When receiving a user ID for job search, invoke the job search pipeline
- When receiving resume content and job description, invoke the resume agent
- Pass through all outputs from sub-agents without modification
- Ensure proper data flow between agents when needed

You coordinate but do not perform the actual work - let your specialized sub-agents handle their domains.""",
    sub_agents=[jobsearch_pipeline, resume],
)
    return coordinator, exit_stack


root_agent = create_coordinator_agent()
