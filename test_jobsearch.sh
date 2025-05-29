#!/usr/bin/env bash
set -euo pipefail

# 1. Enter your project’s root (adjust path if needed)
cd "$(dirname "$0")"

# 2. Activate (or create) Python virtualenv
if [ -f ".venv/bin/activate" ]; then
  source .venv/bin/activate
else
  python3 -m venv .venv
  source .venv/bin/activate
  pip install --upgrade pip
  pip install "mcp[cli]" httpx beautifulsoup4 google-genai google-adk python-dotenv
fi

# 3. Export environment variables from your .env
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

# 4. Run the ADK agent (which will spin up your jobs.py MCP server under the hood)
echo "▶️  Testing Job Search Agent…"
python jobsearch_agents/jobsearch_agents/agent.py

echo "✅  Done."