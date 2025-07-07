import type { ContainerMetrics, NosanaContainer } from "./types";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Real Docker client that actually creates and manages Docker containers
// This replaces the mock implementation with real Docker commands
export class NosanaClient {
	private containers: Map<string, NosanaContainer> = new Map();
	private nextId = 1;
	private containerLogs: Map<string, string[]> = new Map();
	private failureReasons: Map<string, string> = new Map();

	/**
	 * Deploy a container using real Docker commands
	 */
	async deployContainer(
		image: string,
		name: string,
		labels?: Record<string, string>,
	): Promise<string> {
		try {
			// Generate unique container name
			const containerName = `kubelite-${name}-${this.nextId++}`;
			
			// Build Docker run command with labels
			const labelArgs = Object.entries({
				...labels,
				"kubelite.managed": "true",
				"kubelite.app": name,
			}).map(([key, value]) => `--label ${key}=${value}`).join(' ');

			// Run the actual Docker container
			const dockerCommand = `docker run -d --name ${containerName} ${labelArgs} ${image}`;
			console.log(`[NosanaClient] Executing: ${dockerCommand}`);
			
			const { stdout, stderr } = await execAsync(dockerCommand);
			
			if (stderr && !stderr.includes('Unable to find image')) {
				console.warn(`[NosanaClient] Docker warning: ${stderr}`);
			}

			const containerId = stdout.trim();
			
			// Get container details from Docker
			const inspectCommand = `docker inspect ${containerId} --format='{{.Name}},{{.Config.Image}},{{.State.Status}},{{.Created}}'`;
			const { stdout: inspectOutput } = await execAsync(inspectCommand);
			const [dockerName, dockerImage, status, created] = inspectOutput.trim().split(',');

			// Store container info
			const container: NosanaContainer = {
				id: containerId,
				name: containerName,
				image: dockerImage,
				status: status as "running" | "stopped" | "failed",
				createdAt: new Date(created),
				labels: {
					...labels,
					"kubelite.managed": "true",
					"kubelite.app": name,
				},
			};

			this.containers.set(containerId, container);
			
			// Initialize logs
			const initialLogs = [
				`[${new Date().toISOString()}] Real Docker container ${containerId} starting...`,
				`[${new Date().toISOString()}] Image: ${image}`,
				`[${new Date().toISOString()}] Container ${containerId} deployed successfully`
			];
			this.containerLogs.set(containerId, initialLogs);
			
			console.log(`[NosanaClient] Successfully deployed real Docker container: ${containerId}`);
			return containerId;
		} catch (error) {
			console.error(`[NosanaClient] Failed to deploy container:`, error);
			throw new Error(`Failed to deploy container: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Stop and remove a real Docker container
	 */
	async stopContainer(id: string): Promise<void> {
		try {
			const container = this.containers.get(id);
			if (!container) {
				throw new Error(`Container ${id} not found in local registry`);
			}

			// Stop the real Docker container
			console.log(`[NosanaClient] Stopping Docker container: ${id}`);
			await execAsync(`docker stop ${id}`);
			
			// Remove the container
			console.log(`[NosanaClient] Removing Docker container: ${id}`);
			await execAsync(`docker rm ${id}`);

			// Clean up local tracking
			this.containers.delete(id);
			this.containerLogs.delete(id);
			this.failureReasons.delete(id);
			
			console.log(`[NosanaClient] Successfully stopped and removed container: ${id}`);
		} catch (error) {
			console.error(`[NosanaClient] Failed to stop container ${id}:`, error);
			throw new Error(`Failed to stop container: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Get all running containers managed by KubeLite (from real Docker)
	 */
	async getRunningContainers(): Promise<NosanaContainer[]> {
		try {
			// Get all containers with kubelite.managed label from Docker
			const command = `docker ps --filter "label=kubelite.managed=true" --format "{{.ID}},{{.Names}},{{.Image}},{{.Status}},{{.CreatedAt}}"`;
			const { stdout } = await execAsync(command);
			
			const containers: NosanaContainer[] = [];
			
			if (stdout.trim()) {
				const lines = stdout.trim().split('\n');
				for (const line of lines) {
					const [id, name, image, status, createdAt] = line.split(',');
					
					// Get labels for this container
					const labelCommand = `docker inspect ${id} --format='{{range $k, $v := .Config.Labels}}{{$k}}={{$v}};{{end}}'`;
					const { stdout: labelOutput } = await execAsync(labelCommand);
					
					const labels: Record<string, string> = {};
					if (labelOutput.trim()) {
						labelOutput.trim().split(';').forEach(pair => {
							const [key, value] = pair.split('=');
							if (key && value) labels[key] = value;
						});
					}

					const container: NosanaContainer = {
						id,
						name,
						image,
						status: status.includes('Up') ? 'running' : 'stopped',
						createdAt: new Date(createdAt),
						labels,
					};
					
					containers.push(container);
					this.containers.set(id, container); // Update local cache
				}
			}
			
			return containers;
		} catch (error) {
			console.error(`[NosanaClient] Failed to get running containers:`, error);
			return [];
		}
	}

	/**
	 * Get container by ID
	 */
	async getContainer(id: string): Promise<NosanaContainer | null> {
		return this.containers.get(id) || null;
	}

	/**
	 * Get containers by app name
	 */
	async getContainersByApp(appName: string): Promise<NosanaContainer[]> {
		return Array.from(this.containers.values()).filter(
			(container) => container.labels?.["kubelite.app"] === appName,
		);
	}

	/**
	 * Get container metrics (for future phases)
	 */
	async getContainerMetrics(id: string): Promise<ContainerMetrics | null> {
		const container = this.containers.get(id);
		if (!container) {
			return null;
		}

		// Mock metrics - in real implementation, this would fetch from Nosana
		return {
			id,
			cpuUsage: Math.random() * 100,
			memoryUsage: Math.random() * 100,
			timestamp: new Date(),
		};
	}

	/**
	 * Get container logs from real Docker
	 */
	async getContainerLogs(id: string): Promise<string> {
		try {
			// Get real Docker logs
			const command = `docker logs ${id}`;
			const { stdout, stderr } = await execAsync(command);
			
			// Combine stdout and stderr
			const realLogs = [stdout, stderr].filter(Boolean).join('\n');
			
			// Also include any locally stored logs
			const localLogs = this.containerLogs.get(id) || [];
			
			return [...localLogs, realLogs].join('\n');
		} catch (error) {
			console.error(`[NosanaClient] Failed to get logs for ${id}:`, error);
			throw new Error(`Container ${id} not found or logs unavailable`);
		}
	}

	/**
	 * Get failed containers for analysis
	 */
	async getFailedContainers(): Promise<NosanaContainer[]> {
		return Array.from(this.containers.values()).filter(
			(container) => container.status === "failed",
		);
	}

	/**
	 * Get failure reason for a container
	 */
	getFailureReason(id: string): string | undefined {
		return this.failureReasons.get(id);
	}

	/**
	 * Simulate container failure for testing (Phase 3)
	 */
	async simulateFailure(id: string, reason: string): Promise<void> {
		const container = this.containers.get(id);
		if (!container) {
			throw new Error(`Container ${id} not found`);
		}

		container.status = "failed";
		this.failureReasons.set(id, reason);

		// Add failure log entries
		const logs = this.containerLogs.get(id) || [];
		logs.push(`[${new Date().toISOString()}] ERROR: ${reason}`);
		logs.push(`[${new Date().toISOString()}] Container failed with exit code 1`);
		this.containerLogs.set(id, logs);

		console.log(`[NosanaClient] Simulated failure for container ${id}: ${reason}`);
	}

	/**
	 * Add a log entry to a container (for simulation)
	 */
	addLogEntry(id: string, logEntry: string): void {
		const logs = this.containerLogs.get(id) || [];
		logs.push(`[${new Date().toISOString()}] ${logEntry}`);
		this.containerLogs.set(id, logs);
	}
}
