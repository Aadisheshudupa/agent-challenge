import fs from "node:fs";
import yaml from "js-yaml";
import type { KubeLiteApp, KubeLiteManifest } from "./types";

export class ManifestParser {
	/**
	 * Parse a YAML manifest file and convert it to a KubeLiteApp
	 */
	static parseFromFile(filePath: string): KubeLiteApp {
		try {
			const fileContent = fs.readFileSync(filePath, "utf8");
			return ManifestParser.parseFromString(fileContent);
		} catch (error) {
			throw new Error(`Failed to read manifest file ${filePath}: ${error}`);
		}
	}

	/**
	 * Parse a YAML string and convert it to a KubeLiteApp
	 */
	static parseFromString(yamlContent: string): KubeLiteApp {
		try {
			const manifest = yaml.load(yamlContent) as KubeLiteManifest;
			return ManifestParser.manifestToApp(manifest);
		} catch (error) {
			throw new Error(`Failed to parse YAML manifest: ${error}`);
		}
	}

	/**
	 * Convert a KubeLiteManifest to a KubeLiteApp
	 */
	private static manifestToApp(manifest: KubeLiteManifest): KubeLiteApp {
		if (!manifest || manifest.kind !== "Application") {
			throw new Error("Invalid manifest: must be of kind 'Application'");
		}

		if (!manifest.metadata?.name) {
			throw new Error("Invalid manifest: metadata.name is required");
		}

		if (!manifest.spec?.container?.image) {
			throw new Error("Invalid manifest: spec.container.image is required");
		}

		const app: KubeLiteApp = {
			name: manifest.metadata.name,
			image: manifest.spec.container.image,
			replicas: manifest.spec.replicas || 1,
		};

		// Parse ports if specified
		if (manifest.spec.container.ports) {
			app.ports = manifest.spec.container.ports.map((p) => p.containerPort);
		}

		// Parse autoscaling if specified
		if (manifest.spec.autoscaling) {
			app.autoscaling = manifest.spec.autoscaling;
		}

		return app;
	}

	/**
	 * Convert a KubeLiteApp back to a YAML manifest string
	 */
	static appToYaml(app: KubeLiteApp): string {
		const manifest: KubeLiteManifest = {
			apiVersion: "kubelite.io/v1",
			kind: "Application",
			metadata: {
				name: app.name,
			},
			spec: {
				replicas: app.replicas,
				container: {
					image: app.image,
				},
			},
		};

		if (app.ports && app.ports.length > 0) {
			manifest.spec.container.ports = app.ports.map((port) => ({
				containerPort: port,
				protocol: "TCP",
			}));
		}

		if (app.autoscaling) {
			manifest.spec.autoscaling = app.autoscaling;
		}

		return yaml.dump(manifest);
	}
}
