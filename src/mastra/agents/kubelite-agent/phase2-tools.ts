// in your-project/src/app/agents/kubelite/phase2-tools.ts

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { StateManager } from "./state-manager";
import { KubeLiteOrchestrator } from "./orchestrator";
import fs from "node:fs";
import path from "node:path";
import type { KubeLiteApp } from "./types";

// Global instances can remain if other tools use them
const stateManager = new StateManager();
const orchestrator = new KubeLiteOrchestrator();

// Helper function to add application to state manager
function addOrUpdateApplication(name: string, image: string, replicas: number): KubeLiteApp {
    const app: KubeLiteApp = {
        name,
        image,
        replicas,
        ports: [],
    };
    
    // Use the StateManager's applyCommand method with a deploy command
    const result = stateManager.applyCommand({
        intent: "deploy",
        appName: name,
        image,
        replicas,
        confidence: 1.0, // Direct tool call has high confidence
    });
    
    return app;
}

// Helper function to delete application from state manager
function deleteApplicationFromState(appName: string): boolean {
    const result = stateManager.applyCommand({
        intent: "delete",
        appName,
        confidence: 1.0, // Direct tool call has high confidence
    });
    return result.success;
}

// Helper function to scale application in state manager
function scaleApplicationInState(appName: string, replicas: number): boolean {
    const result = stateManager.applyCommand({
        intent: "scale",
        appName,
        replicas,
        confidence: 1.0, // Direct tool call has high confidence
    });
    return result.success;
}

// Step 1: Define the schema with supercharged descriptions and create a type from it.
const deployToolSchema = z.object({
    intent: z.enum(['deploy', 'scale', 'delete'])
        .describe("The user's primary goal. This MUST be 'deploy', 'scale', or 'delete'."),
    
    // CRITICAL CHANGE: Be explicit about where to find the image.
    image: z.string().optional()
        .describe("The Docker image name. You MUST extract this from the user's text. E.g., in 'deploy nginx', the image is 'nginx'."),
    
    // CRITICAL CHANGE: Force the AI to look for numbers and provide an example.
    replicas: z.number().optional().default(1)
        .describe("The number of instances/copies. You MUST extract this numerical value from the user's text. For example, in 'deploy 3 redis containers', the value is 3. Defaults to 1 if no number is found."),
    
    // CRITICAL CHANGE: Be more specific about what an appName is.
    appName: z.string()
        .describe("The name for the application, required for 'scale' and 'delete'. For new deployments, this can be inferred from the image name if not provided. E.g., in 'scale my-app to 5', the appName is 'my-app'."),
});

// This part stays the same
type DeployToolInput = z.infer<typeof deployToolSchema>;

// --- REFACTORED naturalLanguageDeployTool ---
// We no longer need the CommandParser for this tool.
export const naturalLanguageDeployTool = createTool({
    id: "naturalLanguageDeployTool",
    description: `
        MUST be used to deploy, create, run, scale, or delete an application from a natural language command.
        Extracts entities like the image name, replica count, application name, and user intent directly from the user's text.
    `,

    // CRITICAL CHANGE: The schema now has specific fields with supercharged descriptions.
    // The AI will populate these fields for you by parsing the user's command.
    inputSchema: deployToolSchema,

    // The output schema remains largely the same for consistency.
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
    }),        // The execute function is now much simpler.
        // It directly receives the parsed arguments from the LLM.
        execute: async ({ context }) => {
            try {
                const { intent, appName, image, replicas = 1 } = context;

                // Apply the parsed command directly to the state and orchestrator
                if (intent === 'deploy') {
                    // Infer the Docker image if not provided
                    let deployImage = image;
                    if (!deployImage && appName) {
                        // Try to infer the image from the app name
                        // Common cases: nginx -> nginx:latest, redis -> redis:latest, etc.
                        const commonImages: Record<string, string> = {
                            'nginx': 'nginx:latest',
                            'redis': 'redis:latest',
                            'postgres': 'postgres:latest',
                            'mysql': 'mysql:latest',
                            'mongo': 'mongo:latest',
                            'apache': 'httpd:latest',
                            'ubuntu': 'ubuntu:latest',
                            'alpine': 'alpine:latest',
                            'node': 'node:latest',
                            'python': 'python:latest'
                        };
                        
                        const lowerAppName = appName.toLowerCase();
                        deployImage = commonImages[lowerAppName] || `${appName}:latest`;
                    }
                    
                    if (!deployImage) {
                        return { success: false, message: "Error: Could not determine Docker image to deploy. Please specify an image name." };
                    }
                    
                    // Use appName if provided, otherwise derive it from the image
                    const deploymentName = appName || deployImage.split(':')[0];
                    addOrUpdateApplication(deploymentName, deployImage, replicas);
                const manifest = stateManager.generateManifest(deploymentName);
                if (!manifest) {
                    return { success: false, message: "Error: Could not generate manifest for deployment." };
                }
                const manifestPath = path.join(process.cwd(), `${deploymentName}-manifest.yaml`);
                fs.writeFileSync(manifestPath, manifest);
                await orchestrator.deployFromManifest(manifestPath);
                return { success: true, message: `Successfully deployed ${replicas} instance(s) of ${deploymentName}.`};
            }

            if (intent === 'scale') {
                const app = stateManager.getApplication(appName);
                if (!app) {
                    return { success: false, message: `Error: Application '${appName}' not found.`};
                }
                scaleApplicationInState(appName, replicas);
                 // Regenerate manifest and reconcile
                const manifest = stateManager.generateManifest(app.name);
                if (!manifest) {
                    return { success: false, message: "Error: Could not generate manifest for scaling." };
                }
                const manifestPath = path.join(process.cwd(), `${app.name}-manifest.yaml`);
                fs.writeFileSync(manifestPath, manifest);
                await orchestrator.reconcile(manifestPath);
                return { success: true, message: `Successfully scaled ${appName} to ${replicas} replicas.`};
            }

            if (intent === 'delete') {
                const success = deleteApplicationFromState(appName);
                if (!success) {
                    return { success: false, message: `Error: Application '${appName}' not found.`};
                }
                await orchestrator.deleteApp(appName);
                return { success: true, message: `Successfully deleted application '${appName}'.`};
            }
            
            return { success: false, message: `Could not handle intent: ${intent}`};

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                message: `Failed to execute command: ${errorMessage}`,
            };
        }
    },
});

export const chatStatusTool = createTool({
    id: "chatStatusTool",
    description: "Get the current status of all applications in a conversational format",
    inputSchema: z.object({}),
    outputSchema: z.object({
        message: z.string(),
        applications: z.array(
            z.object({
                name: z.string(),
                desiredReplicas: z.number(),
                currentReplicas: z.number(),
                image: z.string(),
                status: z.string(),
            }),
        ),
    }),
    execute: async () => {
        try {
            // Get desired state
            const desiredApps = stateManager.getAllApplications();
            
            // Get current state from orchestrator
            const currentStatus = await orchestrator.getStatus();
            
            // Combine the information
            const applications = desiredApps.map((app) => {
                const currentApp = currentStatus.find(
                    (status) => status.appName === app.name,
                );
                return {
                    name: app.name,
                    desiredReplicas: app.replicas,
                    currentReplicas: currentApp?.currentReplicas || 0,
                    image: app.image,
                    status: currentApp
                        ? currentApp.currentReplicas === app.replicas
                            ? "✅ In sync"
                            : currentApp.currentReplicas < app.replicas
                                ? "⚠️ Scaling up"
                                : "⚠️ Scaling down"
                        : "❌ Not deployed",
                };
            });
            
            let message = "📊 **KubeLite Application Status**\n\n";
            
            if (applications.length === 0) {
                message += "No applications are currently managed by KubeLite.";
            } else {
                applications.forEach((app) => {
                    message += `**${app.name}**\n`;
                    message += `- Image: ${app.image}\n`;
                    message += `- Desired: ${app.desiredReplicas} replica(s)\n`;
                    message += `- Current: ${app.currentReplicas} replica(s)\n`;
                    message += `- Status: ${app.status}\n\n`;
                });
            }
            
            return { message, applications };
        } catch (error) {
            return {
                message: `Failed to get status: ${error instanceof Error ? error.message : 'Unknown error'}`,
                applications: [],
            };
        }
    },
});

export const helpTool = createTool({
    id: "helpTool",
    description: "Provide help information about KubeLite capabilities",
    inputSchema: z.object({
        topic: z.string().optional().describe("Specific topic to get help about"),
    }),
    outputSchema: z.object({
        message: z.string(),
    }),
    execute: async ({ context }) => {
        const { topic } = context;
        let message = "🚀 **KubeLite AI Container Orchestrator Help**\n\n";
        
        if (!topic || topic === "general") {
            message += `I can help you manage containers using natural language! Here's what I can do:

**🔧 Container Management:**
- Deploy: "deploy nginx", "create 3 redis containers"
- Scale: "scale my-app to 5 replicas"
- Delete: "remove my-app", "delete nginx"
- Status: "show running apps", "what's deployed?"

**🩺 Health & Analysis:**
- Health checks: "check system health"
- Failure analysis: "analyze failures", "what's broken?"
- Auto-healing: "fix problems", "heal my deployment"

**💬 Natural Language:**
Just tell me what you want to do! I understand:
- "I need 2 postgres databases"
- "Scale the web server to handle more traffic"
- "Something seems wrong with my app"

**🎯 Examples:**
- \`deploy nginx\` - Creates a single nginx container
- \`deploy 3 redis containers\` - Creates 3 redis instances
- \`show me what's running\` - Lists all your apps
- \`scale web-app to 5\` - Scales web-app to 5 replicas`;
        } else {
            message += `Here's help for "${topic}":\n\n`;
            message += "For general help, just ask me anything about containers or say 'help'!";
        }
        
        return { message };
    },
});

export const startInteractiveModeTool = createTool({
    id: "startInteractiveModeTool",
    description: "Start an interactive conversation mode for container management",
    inputSchema: z.object({}),
    outputSchema: z.object({
        message: z.string(),
        mode: z.string(),
    }),
    execute: async () => {
        return {
            message: `🎯 **Interactive Mode Activated!**

I'm ready to help you manage your containers! You can:

- Ask me to deploy applications
- Check what's running
- Scale your services
- Diagnose problems
- Get help anytime

Just tell me what you'd like to do in plain English. I'll understand and take action!

**Quick Examples:**
- "deploy a web server"
- "show me my apps" 
- "scale up the database"
- "is everything healthy?"

What would you like to do first?`,
            mode: "interactive",
        };
    },
});