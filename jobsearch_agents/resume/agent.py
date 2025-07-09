import os 

from google.adk.agents.llm_agent import Agent
from google.adk.agents import SequentialAgent
from . import prompt
from .resume_doc import create_formatted_resume, download_and_extract_resume_text

from contextlib import AsyncExitStack

base_resume_cleanup =  Agent(
    model="gemini-2.0-flash",
    name="base_resume_cleanup",
    instruction = prompt.BASE_PROMPT,
    tools=[download_and_extract_resume_text],
    output_key="base_resume",
    )

job_optimization_agent =  Agent(
    model="gemini-2.0-flash",
    name="job_optimization_agent",
    instruction = prompt.JOB_OPTIMIZATION,
    output_key="job_optimized_resume"
    )

experience_optimization_agent  =  Agent(
    model="gemini-2.0-flash",
    name="experience_optimization_agent",
    instruction = prompt.EXPERIENCE_OPTIMIZATION,
    output_key='experience_optimized_resume'
    )

ats_optimization_agent =  Agent(
    model="gemini-2.0-flash",
    name="ats_optimization_agent",
    instruction = prompt.ATS_OPTIMIZATION,
    output_key='ats_optimized_resume'
    )

humanize_resume_agent =  Agent(
    model="gemini-2.0-flash",
    name="humanize_resume_agent",
    instruction = prompt.HUMANIZE,
    output_key='draft_resume'
    )

proof_reader_agent =  Agent(
    model="gemini-2.0-flash",
    name="proof_reader_agent",
    instruction = prompt.PROOF_READ_RESUME,
    output_key='final_resume'
    )

resume_formatted_agent = Agent(
    model="gemini-2.0-flash",
    name="resume_formatted_agent",
    instruction = prompt.RESUME_FORMAT_HELPER,
    output_key='formatted_resume'
    )
doc_creator_agent =  Agent(
    model="gemini-2.0-flash",
    name="doc_creator_agent",
    instruction = prompt.TEMPLATE_DOCUMENT_CREATION,
    tools=[
        create_formatted_resume
    ],
     output_key='doc'
    )
async def create_agent():
    exit_stack = AsyncExitStack()
    resume_pipeline_agent = SequentialAgent(
    name='ResumeTailorAgent',
    description='Agent design to tailor resumes to a job description',
    sub_agents=[
        base_resume_cleanup,
        job_optimization_agent,
        experience_optimization_agent,
        ats_optimization_agent,
        humanize_resume_agent,
        proof_reader_agent,
        resume_formatted_agent,
        doc_creator_agent,
        ],
    )
    return resume_pipeline_agent, exit_stack

def root_agent():
    """Return the agent creation coroutine"""
    return create_agent()
