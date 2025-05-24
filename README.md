# GetHired



Frontend Setup and Installation

# Clone this repository.
git clone https://github.com/justliya/GetHired.git

npm install

# .env
VITE_FIREBASE_API_KEY=<YOUR_PROJECT>
VITE_FIREBASE_AUTH_DOMAIN=<YOUR_PROJECT>
VITE_FIREBASE_PROJECT_ID=<YOUR_PROJECT>
VITE_FIREBASE_STORAGE_BUCKET=<YOUR_PROJECT>
VITE_FIREBASE_MESSAGING_SENDER_ID=<YOUR_PROJECT>
VITE_FIREBASE_APP_ID=<YOUR_PROJECT>

npm run dev


Backend Setup and Installation


Prerequisites:

Python 3.11+
Poetry
For dependency management and packaging. Please follow the instructions on the official Poetry website for installation.
Create a project on Google Cloud Platform
Set IAM Permissions to 'VERTEX AI user'

Configuration:

Env file setup

GOOGLE_GENAI_USE_VERTEXAI=True
# IMPORTANT: Setting this flag to 1 will disable web driver
DISABLE_WEB_DRIVER=1
GOOGLE_CLOUD_PROJECT=<YOUR_PROJECT>
GOOGLE_CLOUD_LOCATION= us-central1


Authenticate with your Google Cloud account:

gcloud auth application-default login


Installation:

Create & activate virtual environment¶

python -m venv .venv

# Mac / Linux
source .venv/bin/activate

# Windows CMD:
.venv\Scripts\activate.bat

# Windows PowerShell:
.venv\Scripts\Activate.ps1

Install ADK¶

pip install google-adk

cd jobsearch_agents

Running the Agent

adk web


This should open a new chrome window through web-driver. If it doesn't, please make sure DISABLE_WEB_DRIVER=0 in the .env file.


