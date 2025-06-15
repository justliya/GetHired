FROM python:3.11-slim


WORKDIR /app


ENV PORT=8080
ENV PYTHONUNBUFFERED=1
ENV GOOGLE_GENAI_USE_VERTEXAI=true


RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js for MCPToolSet
RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

RUN pip install --no-cache-dir \
    google-adk>=1.1.1 \
    google-genai>=1.5.0 \
    absl-py>=2.2.2 \
    google-cloud-aiplatform[agent-engines]>=1.95.1 \
    pytest>=8.3.5 \
    pillow>=11.1.0 \
    deprecated>=1.2.18 \
    python-dotenv \
    fastapi>=0.100.0 \
    uvicorn[standard]>=0.20.0 \
    aiohttp

COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Install the Firebase MCP package globally
RUN npm install @gannonh/firebase-mcp

COPY . .

EXPOSE ${PORT}

CMD ["python", "-m", "coordinator", "--host=0.0.0.0", "--port=8080"]
