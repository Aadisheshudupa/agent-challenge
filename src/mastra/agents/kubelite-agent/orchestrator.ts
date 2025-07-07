import { ManifestParser } from "./manifest-parser";
import { NosanaClient } from "./nosana-client";
import type { KubeLiteApp, NosanaContainer } from "./types";

export class KubeLiteOrchestrator {
	private nosanaClient: NosanaClient;
	private isRunning = false;
	private reconcileInterval?: NodeJS.Timeout;
	private readonly reconcileIntervalMs = 10000; // 10 seconds

	constructor() {
		this.nosanaClient = new NosanaClient();
	}

	/**
	 * Start the orchestrator with continuous reconciliation
	 */
	async start(manifestPath?: string): Promise<void> {
		if (this.isRunning) {
			console.log("[KubeLite] Orchestrator is already running");
			return;
		}

		this.isRunning = true;
		console.log("[KubeLite] Starting orchestrator...");

		// Initial reconciliation
		if (manifestPath) {
			await this.reconcile(manifestPath);
		}

		// Start continuous reconciliation loop
		this.reconcileInterval = setInterval(async () => {
			if (manifestPath) {
				try {
					await this.reconcile(manifestPath);
				} catch (error) {
					console.error("[KubeLite] Reconciliation error:", error);
				}
			}
		}, this.reconcileIntervalMs);

		console.log(
			`[KubeLite] Orchestrator started with ${this.reconcileIntervalMs}ms reconcile interval`,
		);
	}

	/**
	 * Stop the orchestrator
	 */
	stop(): void {
		if (!this.isRunning) {
			return;
		}

		this.isRunning = false;
		if (this.reconcileInterval) {
			clearInterval(this.reconcileInterval);
			this.reconcileInterval = undefined;
		}

		console.log("[KubeLite] Orchestrator stopped");
	}

	/**
	 * Perform a single reconciliation cycle
	 */
	async reconcile(manifestPath: string): Promise<void> {
		console.log("[KubeLite] Starting reconciliation cycle...");

		try {
			// 1. Read desired state from manifest
			const desiredApp = ManifestParser.parseFromFile(manifestPath);
			console.log(
				`[KubeLite] Desired state: ${desiredApp.name} with ${desiredApp.replicas} replicas`,
			);

			// 2. Get current state from Nosana
			const currentContainers = await this.nosanaClient.getContainersByApp(
				desiredApp.name,
			);
			const currentReplicas = currentContainers.length;

			console.log(
				`[KubeLite] Current state: ${currentReplicas} running containers`,
			);

			// 3. Compare and reconcile
			await this.reconcileApp(desiredApp, currentContainers);

			console.log("[KubeLite] Reconciliation cycle completed");
		} catch (error) {
			console.error("[KubeLite] Reconciliation failed:", error);
			throw error;
		}
	}

	/**
	 * Reconcile a single application
	 */
	private async reconcileApp(
		desiredApp: KubeLiteApp,
		currentContainers: NosanaContainer[],
	): Promise<void> {
		const currentReplicas = currentContainers.length;
		const desiredReplicas = desiredApp.replicas;

		if (currentReplicas < desiredReplicas) {
			// Scale up: deploy more containers
			const toCreate = desiredReplicas - currentReplicas;
			console.log(
				`[KubeLite] Scaling up ${desiredApp.name}: deploying ${toCreate} containers`,
			);

			for (let i = 0; i < toCreate; i++) {
				await this.deployContainer(desiredApp);
			}
		} else if (currentReplicas > desiredReplicas) {
			// Scale down: stop excess containers
			const toRemove = currentReplicas - desiredReplicas;
			console.log(
				`[KubeLite] Scaling down ${desiredApp.name}: removing ${toRemove} containers`,
			);

			// Remove the oldest containers first
			const containersToRemove = currentContainers
				.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
				.slice(0, toRemove);

			for (const container of containersToRemove) {
				await this.nosanaClient.stopContainer(container.id);
			}
		} else {
			console.log(`[KubeLite] ${desiredApp.name} is in desired state`);
		}
	}

	/**
	 * Deploy a single container for an app
	 */
	private async deployContainer(app: KubeLiteApp): Promise<string> {
		return await this.nosanaClient.deployContainer(app.image, app.name);
	}

	/**
	 * Get status of all managed applications
	 */
	async getStatus(): Promise<
		Array<{
			appName: string;
			image: string;
			desiredReplicas: number;
			currentReplicas: number;
			containers: NosanaContainer[];
		}>
	> {
		const allContainers = await this.nosanaClient.getRunningContainers();

		// Group containers by app name
		const appContainers = new Map<string, NosanaContainer[]>();
		for (const container of allContainers) {
			const appName = container.labels?.["kubelite.app"];
			if (appName) {
				if (!appContainers.has(appName)) {
					appContainers.set(appName, []);
				}
				const containers = appContainers.get(appName);
				if (containers) {
					containers.push(container);
				}
			}
		}

		// Build status for each app
		const status = [];
		for (const [appName, containers] of appContainers) {
			const firstContainer = containers[0];
			status.push({
				appName,
				image: firstContainer.image,
				desiredReplicas: 0, // We don't know the desired state without the manifest
				currentReplicas: containers.length,
				containers,
			});
		}

		return status;
	}

	/**
	 * Deploy an app from a manifest (one-time deployment)
	 */
	async deployFromManifest(manifestPath: string): Promise<void> {
		const app = ManifestParser.parseFromFile(manifestPath);
		console.log(
			`[KubeLite] Deploying ${app.name} with ${app.replicas} replicas`,
		);

		for (let i = 0; i < app.replicas; i++) {
			await this.deployContainer(app);
		}

		console.log(`[KubeLite] Successfully deployed ${app.name}`);
	}

	/**
	 * Delete all containers for an app
	 */
	async deleteApp(appName: string): Promise<void> {
		const containers = await this.nosanaClient.getContainersByApp(appName);
		console.log(
			`[KubeLite] Deleting ${containers.length} containers for ${appName}`,
		);

		for (const container of containers) {
			await this.nosanaClient.stopContainer(container.id);
		}

		console.log(`[KubeLite] Successfully deleted ${appName}`);
	}
}
