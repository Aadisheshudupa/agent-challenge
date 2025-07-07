# KubeLite Agent LLM-Only Testing Guide

## Test the Command Parser via API

The agent is now running on port 8080. You can test it using curl, Postman, or any HTTP client.

### Basic Test Commands

1. **Deploy Command Test**:
```bash
curl -X POST http://localhost:8080/api/agents/kubelite-agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input": "deploy 3 nginx containers with port 80",
    "thread_id": "test-thread-1"
  }'
```

2. **Scale Command Test**:
```bash
curl -X POST http://localhost:8080/api/agents/kubelite-agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input": "scale my-app to 5 replicas",
    "thread_id": "test-thread-2"
  }'
```

3. **Delete Command Test**:
```bash
curl -X POST http://localhost:8080/api/agents/kubelite-agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input": "delete the redis service",
    "thread_id": "test-thread-3"
  }'
```

4. **Status Command Test**:
```bash
curl -X POST http://localhost:8080/api/agents/kubelite-agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input": "show me what is currently running",
    "thread_id": "test-thread-4"
  }'
```

5. **Complex Contextual Command**:
```bash
curl -X POST http://localhost:8080/api/agents/kubelite-agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "input": "I need to run a web server for my e-commerce site using nginx, make it highly available with 4 instances",
    "thread_id": "test-thread-5"
  }'
```

## Expected LLM Response Format

The LLM should now parse these commands and return structured JSON responses like:

```json
{
  "intent": "deploy",
  "appName": "e-commerce-site",
  "image": "nginx",
  "replicas": 4,
  "ports": [80],
  "confidence": 0.85,
  "reasoning": "User wants to deploy nginx for e-commerce with high availability"
}
```

## What Changed (LLM-Only Benefits)

1. **Better Context Understanding**: The LLM can now understand:
   - "make it highly available" → higher replica count
   - "web server for e-commerce" → nginx + port 80
   - Complex sentences with implicit requirements

2. **No Regex Limitations**: Previous regex couldn't handle:
   - Natural language variations
   - Complex contextual requests
   - Implicit requirements

3. **Improved Reasoning**: The LLM provides reasoning for its decisions, making debugging easier.

## Testing Different Scenarios

Try these edge cases to see how well the LLM handles context:

- "I want a database for my app" (should suggest postgres/mysql)
- "Scale down the frontend to save costs" (should understand scaling down)
- "Remove everything that's broken" (should ask for clarification)
- "Deploy a load balancer in front of my web servers" (complex infrastructure)
