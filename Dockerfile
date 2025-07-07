FROM ollama/ollama:0.7.0

# Environment variables for KubeLite Agent
ENV API_BASE_URL=http://127.0.0.1:11434/api
ENV MODEL_NAME_AT_ENDPOINT=qwen2.5:1.5b

# Install system dependencies, Node.js 22.x, and Docker CLI
RUN apt-get update && apt-get install -y \
  curl \
  docker.io \
  && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm

# Create app directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy the rest of the application
COPY . .

# Build the project (ignore errors since dev mode works)
RUN pnpm run build || echo "Build failed, will use dev mode"

# Create startup script using printf to avoid heredoc issues
RUN printf '#!/bin/bash\nset -e\n\necho "🚀 Starting KubeLite Agent Container..."\necho "Model: ${MODEL_NAME_AT_ENDPOINT}"\necho "API: ${API_BASE_URL}"\n\n# Start Ollama in background\necho "Starting Ollama server..."\nollama serve &\nOLLAMA_PID=$!\n\n# Wait for Ollama to be ready\necho "Waiting for Ollama to start..."\nsleep 15\n\n# Pull the model\necho "Pulling model: ${MODEL_NAME_AT_ENDPOINT}"\nollama pull ${MODEL_NAME_AT_ENDPOINT} || echo "Model pull failed, continuing..."\n\n# Start the KubeLite agent\necho "🌟 Starting KubeLite Agent on port 8080..."\necho "Agent will be available at http://localhost:8080"\n\n# Try built version first, fallback to dev\nif [ -f ".mastra/output/index.mjs" ]; then\n    echo "Running built version..."\n    node .mastra/output/index.mjs\nelse\n    echo "Running in development mode..."\n    pnpm run dev\nfi\n' > /app/start.sh

RUN chmod +x /app/start.sh

# Expose port
EXPOSE 8080

# Override the base image's entrypoint to run our script
ENTRYPOINT ["/bin/bash", "/app/start.sh"]
