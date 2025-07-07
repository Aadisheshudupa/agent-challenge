#!/bin/bash

# Example of how to run the KubeLite Agent Docker container

echo "🚀 Starting KubeLite Agent Docker Container"

# Run the container with:
# - Port 8080 mapped to host
# - Environment variable for the model name  
# - Container automatically removed when stopped
# - Name for easy management

docker run -d \
  --name kubelite-agent \
  --rm \
  -p 8080:8080 \
  -e MODEL_NAME_AT_ENDPOINT="llama3.2:3b" \
  -e API_BASE_URL="http://127.0.0.1:11434/api" \
  kubelite-agent

echo "✅ Container started successfully!"
echo "🌐 Agent will be available at http://localhost:8080"
echo "📝 Check logs with: docker logs kubelite-agent" 
echo "🛑 Stop container with: docker stop kubelite-agent"

# Wait a moment for startup
echo "⏳ Waiting for services to start..."
sleep 20

# Test if the agent is responding
echo "🔍 Testing agent endpoint..."
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ Agent is responding successfully!"
else
    echo "❌ Agent is not responding yet, check logs"
fi
