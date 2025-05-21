import os
import dotenv

dotenv.load_dotenv()

AGENT_NAME = "job_search"
DESCRIPTION = "A helpful assistant for personalized job searching."
PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "EMPTY")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "global")
MODEL = os.getenv("MODEL", "gemini-2.0-flash-001")

DISABLE_WEB_DRIVER = int(os.getenv("DISABLE_WEB_DRIVER", 0))
WHL_FILE_NAME = os.getenv("ADK_WHL_FILE", "")
STAGING_BUCKET = os.getenv("STAGING_BUCKET", "")


# constants.py

# Firestore User Preferences Keys

PREF_INDUSTRY = "industry"
PREF_ROLE = "role"
PREF_LOCATION = "location"
PREF_JOB_TYPE = "jobType"
PREF_SALARY = "salary"
PREF_POSTING_DATE = "postingDate"
PREF_OTHER = "other" 

# Path components for Firestore (if you want to centralize these too)
USERS_COLLECTION = "users"
PREFERENCES_COLLECTION = "preferences"
