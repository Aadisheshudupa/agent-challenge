import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { KubeLiteOrchestrator } from "./orchestrator";

// Global orchestrator instance
const orchestrator = new KubeLiteOrchestrator();

export const deployTool = createTool({
	id: "deploy-app",
	description:
		"Deploy an application from a YAML manifest file to the Nosana network",
	inputSchema: z.object({
		manifestPath: z
			.string()
			.describe("Path to the YAML manifest file describing the application"),
	}),
	outputSchema: z.object({
		success: z.boolean(),
		message: z.string(),
		appName: z.string().optional(),
	}),
	execute: async ({ context }) => {
		try {
			await orchestrator.deployFromManifest(context.manifestPath);
			return {
				success: true,
				message: `Successfully deployed application from ${context.manifestPath}`,
			};
		} catch (error) {
			return {
				success: false,
				message: `Failed to deploy: ${error}`,
			};
		}
	},
});

export const reconcileTool = createTool({
	id: "reconcile",
	description:
		"Perform a single reconciliation cycle to ensure the desired state matches the current state",
	inputSchema: z.object({
		manifestPath: z
			.string()
			.describe("Path to the YAML manifest file to reconcile against"),
	}),
	outputSchema: z.object({
		success: z.boolean(),
		message: z.string(),
	}),
	execute: async ({ context }) => {
		try {
			await orchestrator.reconcile(context.manifestPath);
			return {
				success: true,
				message: "Reconciliation completed successfully",
			};
		} catch (error) {
			return {
				success: false,
				message: `Reconciliation failed: ${error}`,
			};
		}
	},
});

export const statusTool = createTool({
	id: "get-status",
	description:
		"Get the current status of all deployed applications and their containers",
	inputSchema: z.object({}),
	outputSchema: z.object({
		applications: z.array(
			z.object({
				appName: z.string(),
				image: z.string(),
				currentReplicas: z.number(),
				containers: z.array(
					z.object({
						id: z.string(),
						name: z.string(),
						status: z.string(),
						createdAt: z.string(),
					}),
				),
			}),
		),
	}),
	execute: async () => {
		const status = await orchestrator.getStatus();
		return {
			applications: status.map((app) => ({
				appName: app.appName,
				image: app.image,
				currentReplicas: app.currentReplicas,
				containers: app.containers.map((container) => ({
					id: container.id,
					name: container.name,
					status: container.status,
					createdAt: container.createdAt.toISOString(),
				})),
			})),
		};
	},
});

export const startOrchestratorTool = createTool({
	id: "start-orchestrator",
	description:
		"Start the KubeLite orchestrator with continuous reconciliation loop",
	inputSchema: z.object({
		manifestPath: z
			.string()
			.describe("Path to the YAML manifest file to continuously reconcile"),
	}),
	outputSchema: z.object({
		success: z.boolean(),
		message: z.string(),
	}),
	execute: async ({ context }) => {
		try {
			await orchestrator.start(context.manifestPath);
			return {
				success: true,
				message: "Orchestrator started successfully",
			};
		} catch (error) {
			return {
				success: false,
				message: `Failed to start orchestrator: ${error}`,
			};
		}
	},
});

export const stopOrchestratorTool = createTool({
	id: "stop-orchestrator",
	description: "Stop the KubeLite orchestrator reconciliation loop",
	inputSchema: z.object({}),
	outputSchema: z.object({
		success: z.boolean(),
		message: z.string(),
	}),
	execute: async () => {
		try {
			orchestrator.stop();
			return {
				success: true,
				message: "Orchestrator stopped successfully",
			};
		} catch (error) {
			return {
				success: false,
				message: `Failed to stop orchestrator: ${error}`,
			};
		}
	},
});

export const deleteAppTool = createTool({
	id: "delete-app",
	description: "Delete all containers for a specific application",
	inputSchema: z.object({
		appName: z.string().describe("Name of the application to delete"),
	}),
	outputSchema: z.object({
		success: z.boolean(),
		message: z.string(),
	}),
	execute: async ({ context }) => {
		try {
			await orchestrator.deleteApp(context.appName);
			return {
				success: true,
				message: `Successfully deleted application ${context.appName}`,
			};
		} catch (error) {
			return {
				success: false,
				message: `Failed to delete application: ${error}`,
			};
		}
	},
});
