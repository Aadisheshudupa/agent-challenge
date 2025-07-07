# KubeLite Agent - Nosana Builders Challenge Submission

![Agent-101](./assets/NosanaBuildersChallengeAgents.jpg)

## 🚀 Agent Description

**KubeLite** is an AI-native container orchestrator specifically designed for the Nosana network. This advanced agent leverages Large Language Models (LLM) for intelligent infrastructure management, moving beyond traditional rule-based orchestration to provide natural language control, intelligent failure analysis, and automated healing capabilities.

### Key Features

- **🤖 Full LLM Integration**: All command parsing, failure analysis, and decision-making powered by AI
- **🗣️ Natural Language Control**: Deploy and manage containers using conversational commands
- **🩺 AI-Powered Healing**: Intelligent failure detection, analysis, and automatic remediation
- **📊 Smart Monitoring**: Real-time health checks with AI-driven insights
- **🔄 Continuous Reconciliation**: Automated state management and drift correction
- **⚡ Lightweight**: Optimized for efficient resource usage on Nosana network

### Use Cases

- Container deployment and scaling through natural language
- Automated failure detection and remediation for production workloads
- Infrastructure management for developers without Kubernetes expertise
- Intelligent log analysis and root cause diagnosis
- Proactive system health monitoring and alerts

## Original Challenge Description

The main goal of this `Nosana Builders Challenge` to teach participants to build and deploy agents. This first step will be in running a basic AI agent and giving it some basic functionality. Participants will add a tool, for the tool calling capabilities of the agent. These are basically some TypeScript functions, that will, for example, retrieve some data from a weather API, post a tweet via an API call, etc.

## [Mastra](https://github.com/mastra-ai/mastra)

For this challenge we will be using Mastra to build our tool.

> Mastra is an opinionated TypeScript framework that helps you build AI applications and features quickly. It gives you the set of primitives you need: workflows, agents, RAG, integrations, and evals. You can run Mastra on your local machine, or deploy to a serverless cloud.

### Required Reading

We recommend reading the following sections to get started with how to create an Agent and how to implement Tool Calling.

- <https://mastra.ai/en/docs/agents/overview>
- [Mastra Guide: Build an AI stock agent](https://mastra.ai/en/guides/guide/stock-agent)

## 🛠️ KubeLite Setup Instructions

### Prerequisites

- **Node.js >= 20.9.0** (IMPORTANT: Required for Mastra framework)
- Docker (for containerization)
- pnpm (recommended) or npm
- Ollama (for local LLM) or access to Nosana LLM endpoint

> **Note**: If you have Node.js < 20.9.0, please upgrade before running `pnpm run dev` or `pnpm run build`.

### Environment Setup

1. **Clone the repository**:
```bash
git clone <your-fork-url>
cd agent-challenge
```

2. **Install dependencies**:
```bash
pnpm install
```

3. **Configure environment variables**:
Create a `.env` file based on `.env.example`:

```bash
# For local development with Ollama
MODEL_NAME_AT_ENDPOINT=qwen2.5:1.5b
API_BASE_URL=http://127.0.0.1:11434/api

# For Nosana network (alternative)
# MODEL_NAME_AT_ENDPOINT=qwen2.5:1.5b
# API_BASE_URL=https://dashboard.nosana.com/jobs/GPVMUckqjKR6FwqnxDeDRqbn34BH7gAa5xWnWuNH1drf
```

4. **Start local development**:
```bash
pnpm run dev
```

### KubeLite Agent Usage

Once running, navigate to `http://localhost:8080` and interact with the KubeLite agent using natural language:

#### Example Commands

**Deployment Commands:**
- "Deploy 3 instances of nginx using nginx:alpine image"
- "Create a redis deployment with 2 replicas"
- "Scale my-app to 5 containers"

**Monitoring Commands:**
- "Show me what's currently running"
- "Check the health of all deployments"
- "What's broken in my infrastructure?"

**Healing Commands:**
- "Analyze any failures in my deployments"
- "Auto-heal my broken containers"
- "Simulate a failure for testing"

#### Advanced Features

**AI-Powered Failure Analysis:**
The agent can intelligently analyze container logs, identify root causes, and suggest remediation strategies using LLM reasoning.

**Natural Language YAML Generation:**
Automatically converts conversational commands into proper container deployment manifests.

**Proactive Healing:**
Continuously monitors deployments and can automatically fix common issues like resource constraints, image pull failures, and configuration errors.

## 🔧 Troubleshooting

### Node.js Version Issues
If you encounter build errors, ensure you're using Node.js >= 20.9.0:
```bash
node --version  # Should show >= 20.9.0
```

To upgrade Node.js:
- **Windows**: Download from [nodejs.org](https://nodejs.org)
- **macOS**: Use `brew install node` or download from nodejs.org
- **Linux**: Use your package manager or [NodeSource](https://github.com/nodesource/distributions)

### LLM Connection Issues
If the agent can't connect to the LLM:
1. For Ollama: Ensure `ollama serve` is running
2. For Nosana: Check your API endpoint in `.env`
3. Verify the model name matches your endpoint configuration

### Docker Build Issues
If Docker build fails:
1. Ensure Docker is running
2. Check that all files are properly copied in Dockerfile
3. Verify your base image supports the required Node.js version

## Get Started

To get started run the following command to start developing:
We recommend using [pnpm](https://pnpm.io/installation), but you can try npm, or bun if you prefer.

```sh
pnpm install
pnpm run dev
```

## Assignment

### Challenge Overview

Welcome to the Nosana AI Agent Hackathon! Your mission is to build and deploy an AI agent on Nosana.
While we provide a weather agent as an example, your creativity is the limit. Build agents that:

**Beginner Level:**

- **Simple Calculator**: Perform basic math operations with explanations
- **Todo List Manager**: Help users track their daily tasks

**Intermediate Level:**

- **News Summarizer**: Fetch and summarize latest news articles
- **Crypto Price Checker**: Monitor cryptocurrency prices and changes
- **GitHub Stats Reporter**: Fetch repository statistics and insights

**Advanced Level:**

- **Blockchain Monitor**: Track and alert on blockchain activities
- **Trading Strategy Bot**: Automate simple trading strategies
- **Deploy Manager**: Deploy and manage applications on Nosana

Or any other innovative AI agent idea at your skill level!

### Getting Started

1. **Fork the [Nosana Agent Challenge](https://github.com/nosana-ai/agent-challenge)** to your GitHub account
2. **Clone your fork** locally
3. **Install dependencies** with `pnpm install`
4. **Run the development server** with `pnpm run dev`
5. **Build your agent** using the Mastra framework

### How to build your Agent

Here we will describe the steps needed to build an agent.

#### Folder Structure

Provided in this repo, there is the `Weather Agent`.
This is a fully working agent that allows a user to chat with an LLM, and fetches real time weather data for the provided location.

There are two main folders we need to pay attention to:

- [src/mastra/agents/weather-agent/](./src/mastra/agents/weather-agent/)
- [src/mastra/agents/your-agents/](./src/mastra/agents/your-agent/)

In `src/mastra/agents/weather-agent/` you will find a complete example of a working agent. Complete with Agent definition, API calls, interface definition, basically everything needed to get a full fledged working agent up and running.
In `src/mastra/agents/your-agents/` you will find a bare bones example of the needed components, and imports to get started building your agent, we recommend you rename this folder, and it's files to get started.

Rename these files to represent the purpose of your agent and tools. You can use the [Weather Agent Example](#example:_weather_agent) as a guide until you are done with it, and then you can delete these files before submitting your final submission.

As a bonus, for the ambitious ones, we have also provided the [src/mastra/agents/weather-agent/weather-workflow.ts](./src/mastra/agents/weather-agent/weather-workflow.ts) file as an example. This file contains an example of how you can chain agents and tools to create a workflow, in this case, the user provides their location, and the agent retrieves the weather for the specified location, and suggests an itinerary.

### LLM-Endpoint

Agents depend on an LLM to be able to do their work.

#### Nosana Endpoint

You can use the following endpoint and model for testing, if you wish:

```
MODEL_NAME_AT_ENDPOINT=qwen2.5:1.5b
API_BASE_URL= https://dashboard.nosana.com/jobs/GPVMUckqjKR6FwqnxDeDRqbn34BH7gAa5xWnWuNH1drf
```

#### Running Your Own LLM with Ollama

The default configuration uses a local [Ollama](https://ollama.com) LLM.
For local development or if you prefer to use your own LLM, you can use [Ollama](https://ollama.ai) to serve the lightweight `qwen2.5:1.5b` mode.

**Installation & Setup:**

1. **[ Install Ollama ](https://ollama.com/download)**:

2. **Start Ollama service**:

```bash
ollama serve
```

3. **Pull and run the `qwen2.5:1.5b` model**:

```bash
ollama pull qwen2.5:1.5b
ollama run qwen2.5:1.5b
```

4. **Update your `.env` file**

There are two predefined environments defined in the `.env` file. One for local development and another, with a larger model, `qwen2.5:32b`, for more complex use cases.

**Why `qwen2.5:1.5b`?**

- Lightweight (only ~1GB)
- Fast inference on CPU
- Supports tool calling
- Great for development and testing

Do note `qwen2.5:1.5b` is not suited for complex tasks.

The Ollama server will run on `http://localhost:11434` by default and is compatible with the OpenAI API format that Mastra expects.

### Testing your Agent

You can read the [Mastra Documentation: Playground](https://mastra.ai/en/docs/local-dev/mastra-dev) to learn more on how to test your agent locally.
Before deploying your agent to Nosana, it's crucial to thoroughly test it locally to ensure everything works as expected. Follow these steps to validate your agent:

**Local Testing:**

1. **Start the development server** with `pnpm run dev` and navigate to `http://localhost:8080` in your browser
2. **Test your agent's conversation flow** by interacting with it through the chat interface
3. **Verify tool functionality** by triggering scenarios that call your custom tools
4. **Check error handling** by providing invalid inputs or testing edge cases
5. **Monitor the console logs** to ensure there are no runtime errors or warnings

**Docker Testing:**
After building your Docker container, test it locally before pushing to the registry:

```bash
# Build your container
docker build -t yourusername/agent-challenge:latest .

# Run it locally with environment variables
docker run -p 8080:8080 --env-file .env yourusername/agent-challenge:latest

# Test the containerized agent at http://localhost:8080
```

Ensure your agent responds correctly and all tools function properly within the containerized environment. This step is critical as the Nosana deployment will use this exact container.

## 🏆 KubeLite Submission Details

### Agent Overview

**KubeLite** represents an advanced submission to the Nosana Builders Challenge, demonstrating sophisticated AI-native infrastructure orchestration capabilities that go beyond basic tool calling to provide intelligent, conversational container management.

### Technical Innovation

**Full LLM Integration:** Unlike traditional orchestrators that rely on rigid rule-based logic, KubeLite uses Large Language Models for:
- **Intelligent Command Parsing**: Converts natural language requests into infrastructure actions
- **AI-Powered Failure Analysis**: Analyzes logs and system state to identify root causes
- **Automated Remediation**: Uses LLM reasoning to determine and execute optimal fix strategies
- **Smart Resource Management**: Makes intelligent decisions about scaling and resource allocation

### Real-World Impact

**Target Use Case**: Simplifying container orchestration for the Nosana ecosystem by providing an AI-first approach that makes infrastructure management accessible to developers without deep Kubernetes expertise.

**Value Proposition**:
- Reduces operational complexity through natural language interfaces
- Minimizes downtime with proactive AI-powered healing
- Optimizes resource utilization for cost-effective deployments
- Provides intelligent insights into system health and performance

### Docker Container

**Container Registry**: `yourusername/kubelite-agent:latest`

**Build Commands**:
```bash
# Build and tag the container
docker build -t yourusername/kubelite-agent:latest .

# Test locally
docker run -p 8080:8080 yourusername/kubelite-agent:latest

# Push to registry
docker login
docker push yourusername/kubelite-agent:latest
```

### Nosana Deployment

The KubeLite agent is configured for deployment on Nosana using the provided job definition at `./nos_job_def/nosana_mastra.json`.

**Deployment Steps**:
1. Update the job definition with your container image
2. Use Nosana CLI: `nosana job post --file nosana_mastra.json --market nvidia-3060 --timeout 30`
3. Monitor deployment on [Nosana Dashboard](https://dashboard.nosana.com/deploy)

### Video Demo

[Link to video demonstration will be provided]

### Submission Requirements

#### 1. Code Development

- Fork this repository and develop your AI agent
- Your agent must include at least one custom tool (function)
- Code must be well-documented and include clear setup instructions
- Include environment variable examples in a `.env.example` file

#### 2. Docker Container

- Create a `Dockerfile` for your agent
- Build and push your container to Docker Hub or GitHub Container Registry
- Container must be publicly accessible
- Include the container URL in your submission

##### Build, Run, Publish

Note: You'll need an account on [Dockerhub](https://hub.docker.com/)

```sh

# Build and tag
docker build -t yourusername/agent-challenge:latest .

# Run the container locally
docker run -p 8080:8080 yourusername/agent-challenge:latest

# Login
docker login

# Push
docker push yourusername/agent-challenge:latest
```

#### 3. Nosana Deployment

- Deploy your Docker container on Nosana
- Your agent must successfully run on the Nosana network
- Include the Nosana job ID or deployment link

##### Nosana Job Definition

We have included a Nosana job definition at <./nos_job_def/nosana_mastra.json>, that you can use to publish your agent to the Nosana network.

**A. Deploying using [@nosana/cli](https://github.com/nosana-ci/nosana-cli/)**

- Edit the file and add in your published docker image to the `image` property. `"image": "docker.io/yourusername/agent-challenge:latest"`
- Download and install the [@nosana/cli](https://github.com/nosana-ci/nosana-cli/)
- Load your wallet with some funds
  - Retrieve your address with: `nosana address`
  - Go to our [Discord](https://nosana.com/discord) and ask for some NOS and SOL to publish your job.
- Run: `nosana job post --file nosana_mastra.json --market nvidia-3060 --timeout 30`
- Go to the [Nosana Dashboard](https://dashboard.nosana.com/deploy) to see your job

**B. Deploying using the [Nosana Dashboard](https://dashboard.nosana.com/deploy)**

- Make sure you have https://phantom.com/, installed for your browser.
- Go to our [Discord](https://nosana.com/discord) and ask for some NOS and SOL to publish your job.
- Click the `Expand` button, on the [Nosana Dashboard](https://dashboard.nosana.com/deploy)
- Copy and Paste your edited Nosana Job Definition file into the Textarea
- Choose an appropriate GPU for the AI model that you are using
- Click `Deploy`

#### 4. Video Demo

- Record a 1-3 minute video demonstrating:
  - Your agent running on Nosana
  - Key features and functionality
  - Real-world use case demonstration
- Upload to YouTube, Loom, or similar platform

#### 5. Documentation

- Update this README with:
  - Agent description and purpose
  - Setup instructions
  - Environment variables required
  - Docker build and run commands
  - Example usage

### Submission Process

1. **Complete all requirements** listed above
2. **Commit all of your changes to the `main` branch of your forked repository**
   - All your code changes
   - Updated README
   - Link to your Docker container
   - Link to your video demo
   - Nosana deployment proof
3. **Social Media Post**: Share your submission on X (Twitter)
   - Tag @nosana_ai
   - Include a brief description of your agent
   - Add hashtag #NosanaAgentChallenge
4. **Finalize your submission on the <https://earn.superteam.fun/agent-challenge> page**

- Remember to add your forked GitHub repository link
- Remember to add a link to your X post.

### Judging Criteria

Submissions will be evaluated based on:

1. **Innovation** (25%)

   - Originality of the agent concept
   - Creative use of AI capabilities

2. **Technical Implementation** (25%)

   - Code quality and organization
   - Proper use of the Mastra framework
   - Efficient tool implementation

3. **Nosana Integration** (25%)

   - Successful deployment on Nosana
   - Resource efficiency
   - Stability and performance

4. **Real-World Impact** (25%)
   - Practical use cases
   - Potential for adoption
   - Value proposition

### Prizes

We’re awarding the **top 10 submissions**:

- 🥇 1st: $1,000 USDC
- 🥈 2nd: $750 USDC
- 🥉 3rd: $450 USDC
- 🏅 4th: $200 USDC
- 🔟 5th–10th: $100 USDC

All prizes are paid out directly to participants on [SuperTeam](https://superteam.fun)

### Resources

- [Nosana Documentation](https://docs.nosana.io)
- [Mastra Documentation](https://mastra.ai/docs)
- [Mastra Guide: Build an AI stock agent](https://mastra.ai/en/guides/guide/stock-agent)
- [Nosana CLI](https://github.com/nosana-ci/nosana-cli)
- [Docker Documentation](https://docs.docker.com)

### Support

- Join [Nosana Discord](https://nosana.com/discord) for technical support where we have dedicated [Builders Challenge Dev chat](https://discord.com/channels/236263424676331521/1354391113028337664) channel.
- Follow [@nosana_ai](https://x.com/nosana_ai) for updates.

### Important Notes

- Ensure your agent doesn't expose sensitive data
- Test thoroughly before submission
- Keep your Docker images lightweight
- Document all dependencies clearly
- Make your code reproducible
- You can vibe code it if you want 😉
- **Only one submission per participant**
- **Submissions that do not compile, and do not meet the specified requirements, will not be considered**
- **Deadline is: 9 July 2025, 12.01 PM**
- **Announcement will be announced about one week later, stay tuned for our socials for exact date**
- **Finalize your submission at [SuperTeam](https://earn.superteam.fun/agent-challenge)**

### Don’t Miss Nosana Builder Challenge Updates

Good luck, builders! We can't wait to see the innovative AI agents you create for the Nosana ecosystem.
**Happy Building!**
