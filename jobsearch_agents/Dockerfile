FROM python:3.11-slim

WORKDIR /app

ENV PORT=8080
ENV PYTHONUNBUFFERED=1
ENV GOOGLE_GENAI_USE_VERTEXAI=true

RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY package*.json ./

RUN npm install

RUN npm install @gannonh/firebase-mcp

COPY . .

COPY ../../template ./template

EXPOSE ${PORT}

CMD ["python", "-m", "coordinator", "--host=0.0.0.0", "--port=8080"]
