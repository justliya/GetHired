# 🚀 GetHired

**GetHired** is an AI-powered job search platform designed to automate and streamline every stage of the job hunt. Leveraging intelligent agents, the platform performs job discovery, company research, and personalized resume tailoring to improve application outcomes and reduce manual effort.

---

## Intelligent Agent Overview

### 🕵️‍♀️ Job Discovery Agent
- Searches top job boards (e.g., LinkedIn, Indeed) using user-defined keywords, location, and preferences.
- Learns user preferences over time to improve recommendation relevance.
- Ranks jobs based on:
  - Salary potential
  - Role alignment
  - Company reputation

### 📝 Resume Tailoring Agent
- Analyzes job descriptions to extract required skills and qualifications.
- Recommends resume edits to enhance alignment and keyword match.
- Auto-generates personalized cover letters based on job context and tone.
- Auto-generates resume for specified jobs pulling data from users profile stored in firebase to include only relevant experience and skills.

### 🧠 Company Research Agent
- Compiles insights on company culture, employee reviews, benefits, and salary range.

### 📬 Job Coach Agent
- Learns user preferences over time
- Sends reminders for follow-ups and interview prep
- Logs progress in Firestore

### ⏰ Scheduled Search System
- Automated job searches with customizable schedules (daily/weekly/monthly)
- Smart email notifications with job results
- Cloud Tasks integration for reliable scheduling
- Timezone-aware with quiet hours support
- See [SCHEDULED_SEARCH_README.md](SCHEDULED_SEARCH_README.md) for detailed documentation

## Coordinator Agent
---

## ⚙️ How We Built It

###  Tech Stack

- **Agent Framework**: [Google Agent Development Kit (ADK)](https://github.com/google/agent-development-kit) in Python
- **Prompt Engineering**:
  - Modular, template-based prompts for tailoring resumes, researching companies, and job matching.
  - Dynamic adaptation based on role type (e.g., technical, creative, leadership).
  - Context-aware chaining to increase response relevance and accuracy.
- **Cloud Infrastructure**:
  - **Vertex AI** for LLM-driven intelligence, reasoning, and content generation.
  - **Firestore** to persist data on job listings, resumes, user preferences, and research
  - **Cloud Run** used to deploy agent
- **Custom MCP Server**:
  - Provides access to tools that agents utilize to complete task.

---

## 🌟 What Makes GetHired Unique

- Multi-agent design: Each agent specializes in a key stage of the job application process.
- AI-driven personalization: Tailored output at every step — from job match to resume and company research.
- Scalable, modular architecture: Easy to expand with new agents (e.g., interview coaching, skill gap analysis).

---

## 🧩 Frontend Setup & Installation

### Prerequisites

- Node.js v16+
- npm

### Steps

1. **Clone the repository**
   
   ```bash
   git clone https://github.com/justliya/GetHired.git

3. **Install dependencies**
   
   		npm install
   
4. **Configure environment variables**

- Create a .env file in the root directory:

    	VITE_FIREBASE_API_KEY=<YOUR_PROJECT>
    	VITE_FIREBASE_AUTH_DOMAIN=<YOUR_PROJECT>
    	VITE_FIREBASE_PROJECT_ID=<YOUR_PROJECT>
    	VITE_FIREBASE_STORAGE_BUCKET=<YOUR_PROJECT>
    	VITE_FIREBASE_MESSAGING_SENDER_ID=<YOUR_PROJECT>
    	VITE_FIREBASE_APP_ID=<YOUR_PROJECT>

4. **Run the development server**

		npm run dev


## 🧠 Backend Setup & Installation

### Prerequisites

	•	Python 3.11+
	•	A Google Cloud Platform (GCP) project
 	•	A Firebase project
	•	IAM Permission: Vertex AI User

### Configuration

   • **Add** your **firebase service account key** to the *jobsearch_agents* folder

   • Set environment variables

   • Create a .env file in the backend root:

	GOOGLE_GENAI_USE_VERTEXAI=True
	GOOGLE_CLOUD_PROJECT=<YOUR_PROJECT>
	GOOGLE_CLOUD_LOCATION=us-central1
	SERVICE_ACCOUNT_KEY_PATH=<YOUR_FIREBASE_SERVICE_KEY_PATH>
	FIREBASE_STORAGE_BUCKET=<YOUR_BUCKET>

## Authenticate with Google Cloud

	gcloud auth application-default login


## Create and activate a virtual environment

	python -m venv .venv

	Mac/Linux:

	source .venv/bin/activate


	Windows CMD:

	.venv\Scripts\activate.bat


	Windows PowerShell:

	.venv\Scripts\Activate.ps1


## Navigate to the backend directory

	cd jobsearch_agents

	pip install -r requirements.txt

	export GOOGLE_GENAI_USE_VERTEXAI=True
	export GOOGLE_CLOUD_PROJECT=<YOUR_PROJECT>
	export GOOGLE_CLOUD_LOCATION=us-central1

## Running the agent server for testing

• Start the agent server with:

	python -m coordinator

## Server should look like the terminal below

	jobsearch_agents % python -m coordinator
	INFO:__main__:Starting Coordinator Agent A2A Server initialization...		
	INFO:__main__:Agent timeout set to: 60.0 seconds
	INFO:__main__:Agent instance created: coordinator_agent
	INFO:coordinator.task_manager:Initializing TaskManager for agent: coordinator_agent with timeout: 60.0s
	INFO:coordinator.task_manager:ADK Runner initialized for app 'jobsearch_agents'
	INFO:__main__:Coordinator Agent A2A server starting on 0.0.0.0:8003
	INFO:     Started server process [35570]
	INFO:     Waiting for application startup.
	INFO:     Application startup complete.
	INFO:     Uvicorn running on http://0.0.0.0:8003 (Press CTRL+C to quit)	

## Test in browser

**COPY**  "http://0.0.0.0:8003" from running servers' final line in the terminal 

**PASTE IN BROWSER** "http://0.0.0.0:8003" **THEN** add *"/docs"*

**URL should look like this in browser**

	http://0.0.0.0:8003/docs
