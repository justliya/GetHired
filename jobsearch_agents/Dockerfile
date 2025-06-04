FROM python:3.11-slim

# Set up working directory
WORKDIR /app

# Install essential tools
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js for MCPToolSet
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install --no-cache-dir poetry==2.1.0

# Copy poetry configuration files
COPY pyproject.toml poetry.lock* ./

# Configure poetry to not create a virtual environment inside container
RUN poetry config virtualenvs.create false

# Install dependencies
RUN poetry install --no-interaction --no-ansi --no-root

# Copy the rest of the application
COPY . .

# Install the application itself
RUN poetry install --no-interaction

# Default environment variables
ENV PORT=8080
ENV GOOGLE_GENAI_USE_VERTEXAI=true

# Expose the port
EXPOSE ${PORT}

# Run the ADK API Server
CMD ["poetry", "run", "adk", "api_server", \
     "--host=0.0.0.0", \
     "--port=8080", \
     "jobsearch_agents/jobsearch_agents"]
