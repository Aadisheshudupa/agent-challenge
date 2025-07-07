// Core data models for KubeLite

export interface KubeLiteApp {
	name: string;
	image: string;
	replicas: number;
	ports?: number[];
	autoscaling?: AutoscalingConfig;
}

export interface AutoscalingConfig {
	enabled: boolean;
	minReplicas: number;
	maxReplicas: number;
	targetCpuUtilization: number;
}

export interface KubeLiteManifest {
	apiVersion: string;
	kind: string;
	metadata: {
		name: string;
	};
	spec: {
		replicas: number;
		container: {
			image: string;
			ports?: Array<{
				containerPort: number;
				protocol?: string;
			}>;
		};
		autoscaling?: AutoscalingConfig;
	};
}

export interface NosanaContainer {
	id: string;
	name: string;
	image: string;
	status: "running" | "stopped" | "failed" | "pending";
	createdAt: Date;
	labels?: Record<string, string>;
}

export interface ContainerMetrics {
	id: string;
	cpuUsage: number; // percentage
	memoryUsage: number; // percentage
	timestamp: Date;
}
