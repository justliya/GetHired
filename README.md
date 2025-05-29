# 🚀 GetHired

**GetHired** is an AI-powered job search platform designed to automate and streamline every stage of the job hunt. Leveraging intelligent agents, the platform performs job discovery, company research, and personalized resume tailoring to improve application outcomes and reduce manual effort.

---

## 🧠 Intelligent Agent Overview

### 🕵️‍♀️ Job Discovery Agent
- Searches top job boards (e.g., LinkedIn, Indeed) using user-defined keywords, location, and remote preferences.
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
  - **Firestore** to persist data on job listings, resumes, user preferences, and research.
- **Custom MCP Server**:
  - Manages tool orchestration and sub-agent coordination.
  - Integrates scraping, prompt routing, and multi-agent collaboration.

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
   cd GetHired

	2.	Install dependencies

npm install


	3.	Configure environment variables
Create a .env file in the root directory:

VITE_FIREBASE_API_KEY=<YOUR_PROJECT>
VITE_FIREBASE_AUTH_DOMAIN=<YOUR_PROJECT>
VITE_FIREBASE_PROJECT_ID=<YOUR_PROJECT>
VITE_FIREBASE_STORAGE_BUCKET=<YOUR_PROJECT>
VITE_FIREBASE_MESSAGING_SENDER_ID=<YOUR_PROJECT>
VITE_FIREBASE_APP_ID=<YOUR_PROJECT>


	4.	Run the development server

npm run dev



⸻

🧠 Backend Setup & Installation

Prerequisites
	•	Python 3.11+
	•	Poetry for dependency management
	•	A Google Cloud Platform (GCP) project
	•	IAM Permission: Vertex AI User

Configuration
	1.	Set environment variables
Create a .env file in the backend root:

GOOGLE_GENAI_USE_VERTEXAI=True
GOOGLE_CLOUD_PROJECT=<YOUR_PROJECT>
GOOGLE_CLOUD_LOCATION=us-central1


	2.	Authenticate with Google Cloud

gcloud auth application-default login



Installation Steps
	1.	Create and activate a virtual environment

python -m venv .venv

	•	Mac/Linux:

source .venv/bin/activate


	•	Windows CMD:

.venv\Scripts\activate.bat


	•	Windows PowerShell:

.venv\Scripts\Activate.ps1


	2.	Navigate to the backend directory

cd jobsearch_agents


	3.	Install dependencies

poetry install



⸻

🔄 Running the Agent Server

Once setup is complete, start the agent system with:

adk web
