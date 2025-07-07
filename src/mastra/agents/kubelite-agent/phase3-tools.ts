import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { FailureAnalyzer } from "./failure-analyzer";
import { KubeLiteOrchestrator } from "./orchestrator";
import { NosanaClient } from "./nosana-client";

// Global instances for Phase 3
const nosanaClient = new NosanaClient();
const failureAnalyzer = new FailureAnalyzer(nosanaClient);
const orchestrator = new KubeLiteOrchestrator();

export const analyzeFailureTool = createTool({
	id: "analyze-failure",
	description: "Analyze a failed application and provide AI-powered diagnosis with human-readable explanations",
	inputSchema: z.object({
		appName: z.string().describe("Name of the failed application to analyze")
	}),
	outputSchema: z.object({
		success: z.boolean(),
		analysis: z.object({
			containerId: z.string(),
			appName: z.string(),
			rootCause: z.string(),
			explanation: z.string(),
			suggestedFix: z.string(),
			confidence: z.number(),
			logs: z.string()
		}).optional(),
		report: z.string(),
		message: z.string()
	}),
	execute: async ({ context }) => {
		try {
			// Get containers for the specified app
			const containers = await nosanaClient.getContainersByApp(context.appName);
			
			if (containers.length === 0) {
				return {
					success: false,
					report: "",
					message: `No containers found for application '${context.appName}'. Make sure the app name is correct and the application has been deployed.`
				};
			}

			// Find failed containers
			const failedContainers = containers.filter(c => c.status === "failed");
			
			if (failedContainers.length === 0) {
				const runningCount = containers.filter(c => c.status === "running").length;
				return {
					success: true,
					report: `✅ Application '${context.appName}' appears to be healthy with ${runningCount} running container(s). No failures to analyze.`,
					message: `No failed containers found for '${context.appName}'`
				};
			}
		// Analyze the first failed container (could be extended to analyze all)
		const analysis = await failureAnalyzer.analyzeFailure(failedContainers[0].id);
		const report = await failureAnalyzer.generateFailureReport();

		return {
			success: true,
			analysis,
			report,
			message: `Analyzed failure for ${context.appName}. Root cause identified: ${analysis.rootCause}`
		};

		} catch (error) {
			return {
				success: false,
				report: "",
				message: `Failed to analyze application: ${error}`
			};
		}
	}
});

export const healthCheckTool = createTool({
	id: "health-check",
	description: "Perform a comprehensive health check of all applications and identify any failures",
	inputSchema: z.object({}),
	outputSchema: z.object({
		overallHealth: z.string(),
		totalApps: z.number(),
		healthyApps: z.number(),
		failedApps: z.number(),
		failureSummary: z.string(),
		recommendations: z.array(z.string())
	}),
	execute: async () => {
		try {
			// Get all containers
			const allContainers = await nosanaClient.getRunningContainers();
			const failedContainers = await nosanaClient.getFailedContainers();

			// Group by application
			const appHealth = new Map<string, { running: number; failed: number }>();
			
			[...allContainers, ...failedContainers].forEach(container => {
				const appName = container.labels?.["kubelite.app"] || container.name;
				const current = appHealth.get(appName) || { running: 0, failed: 0 };
				
				if (container.status === "running") {
					current.running++;
				} else if (container.status === "failed") {
					current.failed++;
				}
				
				appHealth.set(appName, current);
			});

			const totalApps = appHealth.size;
			const failedApps = Array.from(appHealth.values()).filter(h => h.failed > 0).length;
			const healthyApps = totalApps - failedApps;
		// Generate failure analysis for failed containers
		const failureAnalyses = await failureAnalyzer.analyzeAllFailures();
		const failureSummary = await failureAnalyzer.generateFailureReport();

			// Generate recommendations
			const recommendations: string[] = [];
			if (failedApps > 0) {
				recommendations.push(`🔧 ${failedApps} application(s) need immediate attention`);
				recommendations.push("📋 Use 'analyze <app-name>' for detailed failure diagnosis");
				
				// Add specific recommendations based on failure patterns
				const commonCauses = failureAnalyses.map(f => f.rootCause);
				const causeFreq = commonCauses.reduce((acc, cause) => {
					acc[cause] = (acc[cause] || 0) + 1;
					return acc;
				}, {} as Record<string, number>);

				Object.entries(causeFreq).forEach(([cause, count]) => {
					if (count > 1) {
						recommendations.push(`⚠️ Multiple instances of '${cause}' detected - investigate common infrastructure issues`);
					}
				});
			} else {
				recommendations.push("✅ All applications are running normally");
				recommendations.push("🔄 Consider enabling continuous health monitoring");
			}

			const overallHealth = failedApps === 0 ? "HEALTHY" : 
			                    failedApps < totalApps ? "DEGRADED" : "CRITICAL";

			return {
				overallHealth,
				totalApps,
				healthyApps,
				failedApps,
				failureSummary,
				recommendations
			};

		} catch (error) {
			return {
				overallHealth: "UNKNOWN",
				totalApps: 0,
				healthyApps: 0,
				failedApps: 0,
				failureSummary: `Health check failed: ${error}`,
				recommendations: ["❌ Unable to perform health check - investigate system connectivity"]
			};
		}
	}
});

export const simulateFailureTool = createTool({
	id: "simulate-failure",
	description: "Simulate a container failure for testing the AI diagnosis capabilities",
	inputSchema: z.object({
		appName: z.string().describe("Name of the application to simulate failure for"),
		failureType: z.enum([
			"port-conflict",
			"out-of-memory", 
			"db-connection",
			"permission-denied",
			"missing-dependency",
			"config-error",
			"network-issue"
		]).describe("Type of failure to simulate")
	}),
	outputSchema: z.object({
		success: z.boolean(),
		message: z.string(),
		containerId: z.string().optional()
	}),
	execute: async ({ context }) => {
		try {
			// Get containers for the app
			const containers = await nosanaClient.getContainersByApp(context.appName);
			
			if (containers.length === 0) {
				return {
					success: false,
					message: `No containers found for application '${context.appName}'`
				};
			}

			// Pick the first running container
			const runningContainer = containers.find(c => c.status === "running");
			if (!runningContainer) {
				return {
					success: false,
					message: `No running containers found for '${context.appName}' to simulate failure`
				};
			}

			// Generate failure reason and logs based on type
			const failureReasons = {
				"port-conflict": "Port 8080 already in use by another service",
				"out-of-memory": "Container killed due to OOM (out of memory)",
				"db-connection": "Connection to database server refused - timeout after 30s",
				"permission-denied": "Permission denied accessing /app/data directory",
				"missing-dependency": "Command 'node' not found in container image",
				"config-error": "Invalid configuration: missing required environment variable DB_HOST",
				"network-issue": "DNS resolution failed for api.external-service.com"
			};

			const reason = failureReasons[context.failureType];
			
			// Add some realistic log entries before simulating failure
			const logEntries = {
				"port-conflict": [
					"Starting web server on port 8080...",
					"Error: listen EADDRINUSE: address already in use :::8080"
				],
				"out-of-memory": [
					"Loading large dataset into memory...",
					"Allocating 2GB for data processing...",
					"Memory usage: 95%... 98%... 100%"
				],
				"db-connection": [
					"Connecting to database at db.example.com:5432",
					"Connection attempt 1 failed: timeout",
					"Connection attempt 2 failed: timeout",
					"Connection attempt 3 failed: connection refused"
				],
				"permission-denied": [
					"Starting application initialization...",
					"Creating data directory /app/data...",
					"Error: cannot create directory '/app/data': Permission denied"
				],
				"missing-dependency": [
					"Executing startup script...",
					"/bin/sh: node: command not found",
					"Required dependency 'node' is not installed in this image"
				],
				"config-error": [
					"Loading application configuration...",
					"Error: Missing required environment variable: DB_HOST",
					"Application cannot start without proper configuration"
				],
				"network-issue": [
					"Initializing external API connections...",
					"Resolving hostname api.external-service.com...",
					"DNS lookup failed: Name or service not known"
				]
			};

			// Add the pre-failure logs
			logEntries[context.failureType].forEach(entry => {
				nosanaClient.addLogEntry(runningContainer.id, entry);
			});

			// Simulate the actual failure
			await nosanaClient.simulateFailure(runningContainer.id, reason);

			return {
				success: true,
				message: `Simulated ${context.failureType} failure for ${context.appName}. Use 'analyze ${context.appName}' to see the AI diagnosis.`,
				containerId: runningContainer.id
			};

		} catch (error) {
			return {
				success: false,
				message: `Failed to simulate failure: ${error}`
			};
		}
	}
});

export const autoHealTool = createTool({
	id: "auto-heal",
	description: "Automatically attempt to heal failed containers by restarting them",
	inputSchema: z.object({
		appName: z.string().optional().describe("Specific app to heal, or leave empty to heal all failed apps")
	}),
	outputSchema: z.object({
		success: z.boolean(),
		message: z.string(),
		healedContainers: z.array(z.object({
			containerId: z.string(),
			appName: z.string(),
			action: z.string()
		}))
	}),
	execute: async ({ context }) => {
		try {
			const healedContainers: Array<{containerId: string; appName: string; action: string}> = [];
			
			let containersToHeal: Array<{id: string; appName: string}> = [];
			
			if (context.appName) {
				// Heal specific app
				const containers = await nosanaClient.getContainersByApp(context.appName);
				const failed = containers.filter(c => c.status === "failed");
				containersToHeal = failed.map(c => ({
					id: c.id,
					appName: context.appName!
				}));
			} else {
				// Heal all failed apps
				const failedContainers = await nosanaClient.getFailedContainers();
				containersToHeal = failedContainers.map(c => ({
					id: c.id,
					appName: c.labels?.["kubelite.app"] || c.name
				}));
			}

			if (containersToHeal.length === 0) {
				return {
					success: true,
					message: context.appName ? 
						`No failed containers found for '${context.appName}'` :
						"No failed containers found to heal",
					healedContainers: []
				};
			}

			// Attempt healing by removing failed containers (orchestrator will recreate them)
			for (const container of containersToHeal) {
				try {
					await nosanaClient.stopContainer(container.id);
					healedContainers.push({
						containerId: container.id,
						appName: container.appName,
						action: "Removed failed container for recreation"
					});
				} catch (error) {
					console.warn(`Failed to heal container ${container.id}: ${error}`);
				}
			}

			const successCount = healedContainers.length;
			const message = context.appName ?
				`Auto-healed ${successCount} failed container(s) for '${context.appName}'. The orchestrator will recreate them automatically.` :
				`Auto-healed ${successCount} failed container(s) across all applications.`;

			return {
				success: true,
				message,
				healedContainers
			};

		} catch (error) {
			return {
				success: false,
				message: `Auto-heal failed: ${error}`,
				healedContainers: []
			};
		}
	}
});
