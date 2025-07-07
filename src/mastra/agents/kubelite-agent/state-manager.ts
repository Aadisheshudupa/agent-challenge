import type { KubeLiteApp } from "./types";
import type { ParsedCommand } from "./command-parser";

export class StateManager {
	private applications: Map<string, KubeLiteApp> = new Map();

	/**
	 * Apply a parsed command to update the desired state
	 */
	applyCommand(command: ParsedCommand): {
		success: boolean;
		message: string;
		app?: KubeLiteApp;
	} {
		switch (command.intent) {
			case "deploy":
				return this.handleDeploy(command);
			case "scale":
				return this.handleScale(command);
			case "delete":
				return this.handleDelete(command);
			case "status":
				return this.handleStatus();
			default:
				return {
					success: false,
					message: `Unknown command intent: ${command.intent}`,
				};
		}
	}

	private handleDeploy(command: ParsedCommand): {
		success: boolean;
		message: string;
		app?: KubeLiteApp;
	} {
		if (!command.appName || !command.image) {
			return {
				success: false,
				message: "Deploy command requires both app name and image",
			};
		}

		const app: KubeLiteApp = {
			name: command.appName,
			image: command.image,
			replicas: command.replicas || 1,
			ports: command.ports || [],
		};

		this.applications.set(command.appName, app);

		return {
			success: true,
			message: `Created deployment for ${app.name} with ${app.replicas} replica(s) using image ${app.image}`,
			app,
		};
	}

	private handleScale(command: ParsedCommand): {
		success: boolean;
		message: string;
		app?: KubeLiteApp;
	} {
		if (!command.appName || command.replicas === undefined) {
			return {
				success: false,
				message: "Scale command requires both app name and replica count",
			};
		}

		const existingApp = this.applications.get(command.appName);
		if (!existingApp) {
			return {
				success: false,
				message: `Application ${command.appName} not found. Deploy it first.`,
			};
		}

		const oldReplicas = existingApp.replicas;
		existingApp.replicas = command.replicas;
		this.applications.set(command.appName, existingApp);

		const action =
			command.replicas > oldReplicas
				? "scaled up"
				: command.replicas < oldReplicas
					? "scaled down"
					: "maintained";

		return {
			success: true,
			message: `${existingApp.name} ${action} from ${oldReplicas} to ${command.replicas} replica(s)`,
			app: existingApp,
		};
	}

	private handleDelete(command: ParsedCommand): {
		success: boolean;
		message: string;
	} {
		if (!command.appName) {
			return {
				success: false,
				message: "Delete command requires an app name",
			};
		}

		const existingApp = this.applications.get(command.appName);
		if (!existingApp) {
			return {
				success: false,
				message: `Application ${command.appName} not found`,
			};
		}

		this.applications.delete(command.appName);

		return {
			success: true,
			message: `Deleted application ${command.appName}`,
		};
	}

	private handleStatus(): { success: boolean; message: string } {
		if (this.applications.size === 0) {
			return {
				success: true,
				message: "No applications currently defined",
			};
		}

		const appList = Array.from(this.applications.values())
			.map(
				(app) => `  - ${app.name}: ${app.replicas} replica(s) of ${app.image}`,
			)
			.join("\n");

		return {
			success: true,
			message: `Current applications:\n${appList}`,
		};
	}

	/**
	 * Get all applications in desired state
	 */
	getAllApplications(): KubeLiteApp[] {
		return Array.from(this.applications.values());
	}

	/**
	 * Get a specific application
	 */
	getApplication(name: string): KubeLiteApp | undefined {
		return this.applications.get(name);
	}

	/**
	 * Check if an application exists
	 */
	hasApplication(name: string): boolean {
		return this.applications.has(name);
	}

	/**
	 * Clear all applications (for testing)
	 */
	clear(): void {
		this.applications.clear();
	}

	/**
	 * Generate YAML manifest for an application
	 */
	generateManifest(appName: string): string | null {
		const app = this.applications.get(appName);
		if (!app) {
			return null;
		}

		const manifest = {
			apiVersion: "kubelite.io/v1",
			kind: "Application",
			metadata: {
				name: app.name,
			},
			spec: {
				replicas: app.replicas,
				container: {
					image: app.image,
					...(app.ports &&
						app.ports.length > 0 && {
							ports: app.ports.map((port) => ({
								containerPort: port,
								protocol: "TCP",
							})),
						}),
				},
			},
		};

		// Convert to YAML-like string (simplified for demo)
		return `apiVersion: ${manifest.apiVersion}
kind: ${manifest.kind}
metadata:
  name: ${manifest.metadata.name}
spec:
  replicas: ${manifest.spec.replicas}
  container:
    image: "${manifest.spec.container.image}"${
			app.ports && app.ports.length > 0
				? `
    ports:${app.ports
			.map(
				(port) => `
      - containerPort: ${port}
        protocol: TCP`,
			)
			.join("")}`
				: ""
		}`;
	}
}
