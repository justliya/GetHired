FROM python:3.11-slim

# Set up working directory
WORKDIR /app

# Set environment variables
ENV PORT=8080
ENV MCP_FIREBASE_PORT=3000
ENV PYTHONUNBUFFERED=1
ENV GOOGLE_GENAI_USE_VERTEXAI=true

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

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Install the Firebase MCP package globally
RUN npm install @gannonh/firebase-mcp

COPY . .

EXPOSE ${PORT}
EXPOSE ${MCP_FIREBASE_PORT}

CMD ["python", "-m", "coordinator", "--host=0.0.0.0", "--port=8080"]
