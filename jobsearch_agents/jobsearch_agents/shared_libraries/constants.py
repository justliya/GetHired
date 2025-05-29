import os
import dotenv

dotenv.load_dotenv()

AGENT_NAME = "job_search"
DESCRIPTION = "You are job search agent that automates and personalizes the jop search process. Your primary function is to pass task results through agents. Starting with job listing agent that search for jobs based off user preferences, research the companies, tailor resume to each job description, and apply for the job upon users approval."

PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "EMPTY")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "global")
MODEL = os.getenv("MODEL", "gemini-2.0-flash-001")

WHL_FILE_NAME = os.getenv("ADK_WHL_FILE", "")
STAGING_BUCKET = os.getenv("STAGING_BUCKET", "")



