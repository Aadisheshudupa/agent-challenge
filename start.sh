#!/bin/bash
set -e

echo "🚀 Starting KubeLite Agent Container..."
echo "Model: ${MODEL_NAME_AT_ENDPOINT}"
echo "API: ${API_BASE_URL}"

# Start Ollama in background
echo "Starting Ollama server..."
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to be ready
echo "Waiting for Ollama to start..."
sleep 15

# Pull the model
echo "Pulling model: ${MODEL_NAME_AT_ENDPOINT}"
ollama pull ${MODEL_NAME_AT_ENDPOINT} || echo "Model pull failed, continuing..."

# Start the KubeLite agent
echo "🌟 Starting KubeLite Agent on port 8080..."
echo "Agent will be available at http://localhost:8080"

# Try built version first, fallback to dev
if [ -f ".mastra/output/index.mjs" ]; then
    echo "Running built version..."
    node .mastra/output/index.mjs
else
    echo "Running in development mode..."
    pnpm run dev
fi
