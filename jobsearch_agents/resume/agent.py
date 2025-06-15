from google.adk.agents.llm_agent import Agent
from google.adk.agents import SequentialAgent

from . import prompt
from .resume_doc import load_resume_job_desc, create_formatted_resume


resume, job_spec = load_resume_job_desc()

base_resume_cleanup =  Agent(
    model="gemini-2.0-flash",
    name="base_resume_cleanup",
    instruction = prompt.BASE_PROMPT.format("Lakaleigh","Software Engineer", "AI", resume),
    output_key="base_resume",
    )

job_optimization_agent =  Agent(
    model="gemini-2.0-flash",
    name="job_optimization_agent",
    instruction = prompt.JOB_OPTIMIZATION.format(job_spec),
    output_key="job_optimized_resume"
    )

experience_optimization_agent  =  Agent(
    model="gemini-2.0-flash",
    name="experience_optimization_agent",
    instruction = prompt.EXPERIENCE_OPTIMIZATION.format(job_spec),
    output_key='experience_optimizated_resume'
    )

ats_optimization_agent =  Agent(
    model="gemini-2.0-flash",
    name="ats_optimization_agent",
    instruction = prompt.ATS_OPTIMIZATION.format(job_spec),
    output_key='ats_optimized_resume'
    )

humanize_resume_agent =  Agent(
    model="gemini-2.0-flash",
    name="humanize_resume_agent",
    instruction = prompt.HUMANIZE.format(job_spec),
    output_key='draft_resume'
    )

proof_reader_agent =  Agent(
    model="gemini-2.0-flash",
    name="humanize_resume_agent",
    instruction = prompt.PROOF_READ_RESUME,
    output_key='final_resume'
    )
doc_creator_agent =  Agent(
    model="gemini-2.0-flash",
    name="humanize_resume_agent",
    instruction = prompt.TEMPLATE_DOCUMENT_CREATION,
    tools=[
        create_formatted_resume
    ]
    )

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
        doc_creator_agent,
        ],
)