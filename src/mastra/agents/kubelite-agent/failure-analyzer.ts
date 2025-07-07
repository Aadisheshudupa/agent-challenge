import type { NosanaContainer } from "./types";
import { NosanaClient } from "./nosana-client";

export interface FailureAnalysis {
	containerId: string;
	appName: string;
	rootCause: string;
	explanation: string;
	suggestedFix: string;
	confidence: number;
	logs: string;
}

export interface LLMModel {
	generateText(prompt: string): Promise<{ text: string }>;
}

export class FailureAnalyzer {
	private nosanaClient: NosanaClient;
	private model?: LLMModel;

	constructor(nosanaClient: NosanaClient, model?: LLMModel) {
		this.nosanaClient = nosanaClient;
		this.model = model;
	}

	/**
	 * Analyze a failed container using AI-powered log analysis
	 */
	async analyzeFailure(containerId: string): Promise<FailureAnalysis> {
		const container = await this.nosanaClient.getContainer(containerId);
		if (!container) {
			throw new Error(`Container ${containerId} not found`);
		}

		if (container.status !== "failed") {
			throw new Error(`Container ${containerId} is not in failed state`);
		}

		// Get logs for analysis
		const logs = await this.nosanaClient.getContainerLogs(containerId);
		
		// Perform AI-powered log analysis if LLM is available
		let analysis;
		if (this.model) {
			analysis = await this.performAILogAnalysis(container, logs);
		} else {
			// Fallback to rule-based analysis
			analysis = this.performRuleBasedLogAnalysis(container, logs);
		}

		return {
			containerId,
			appName: container.labels?.["kubelite.app"] || container.name,
			...analysis,
			logs
		};
	}

	/**
	 * AI-powered log analysis using LLM
	 */
	private async performAILogAnalysis(container: NosanaContainer, logs: string): Promise<Omit<FailureAnalysis, 'containerId' | 'appName' | 'logs'>> {
		const prompt = `You are an expert DevOps engineer analyzing container failures. Analyze the following container failure and provide a detailed diagnosis.

Container Information:
- Name: ${container.name}
- Image: ${container.image}
- Status: ${container.status}
- Created: ${container.createdAt}

Container Logs:
${logs}

Please analyze the failure and respond with ONLY a JSON object in this exact format:
{
  "rootCause": "Brief description of the main cause",
  "explanation": "Detailed technical explanation of what went wrong",
  "suggestedFix": "Specific actionable steps to resolve the issue",
  "confidence": 0.0-1.0
}

Focus on:
1. Identifying the root cause from log patterns
2. Understanding the technical context
3. Providing actionable remediation steps
4. Assessing confidence based on log clarity

Common failure patterns to look for:
- Image pull failures
- Port binding conflicts
- Resource limitations
- Configuration errors
- Dependency failures
- Permission issues
- Network connectivity problems`;

		try {
			const response = await this.model!.generateText(prompt);
			const analysis = JSON.parse(response.text);
			
			return {
				rootCause: analysis.rootCause || "Unknown failure",
				explanation: analysis.explanation || "Could not determine specific cause from logs",
				suggestedFix: analysis.suggestedFix || "Review container configuration and logs",
				confidence: Math.max(0, Math.min(1, analysis.confidence || 0.5))
			};
		} catch (error) {
			console.error('AI analysis failed, falling back to rule-based analysis:', error);
			return this.performRuleBasedLogAnalysis(container, logs);
		}
	}

	/**
	 * Rule-based log analysis as fallback
	 */
	private performRuleBasedLogAnalysis(container: NosanaContainer, logs: string): Omit<FailureAnalysis, 'containerId' | 'appName' | 'logs'> {
		const lowerLogs = logs.toLowerCase();

		// Image pull failures
		if (lowerLogs.includes("pull") && (lowerLogs.includes("failed") || lowerLogs.includes("error"))) {
			return {
				rootCause: "Image Pull Failed",
				explanation: "The container image could not be pulled from the registry. This might be due to network issues, authentication problems, or the image not existing.",
				suggestedFix: "Verify the image name and tag, check network connectivity to the registry, and ensure proper authentication credentials are configured.",
				confidence: 0.90
			};
		}

		// Port binding issues
		if (lowerLogs.includes("port") && (lowerLogs.includes("already in use") || lowerLogs.includes("bind"))) {
			return {
				rootCause: "Port Already In Use",
				explanation: "The container tried to bind to a port that is already being used by another process or container.",
				suggestedFix: "Change the port mapping to use an available port, or stop the process/container using the conflicting port.",
				confidence: 0.92
			};
		}

		// Out of memory
		if (lowerLogs.includes("out of memory") || lowerLogs.includes("oom") || lowerLogs.includes("killed")) {
			return {
				rootCause: "Out of Memory",
				explanation: "The container was killed because it exceeded the available memory limits.",
				suggestedFix: "Increase memory limits for the container or optimize the application to use less memory.",
				confidence: 0.95
			};
		}

		// Database connection issues
		if (lowerLogs.includes("connection") && (lowerLogs.includes("refused") || lowerLogs.includes("timeout"))) {
			return {
				rootCause: "Database Connection Failed",
				explanation: "The application cannot connect to its database. This could be due to network issues, incorrect credentials, or the database being unavailable.",
				suggestedFix: "Verify database connection settings, ensure the database service is running, and check network connectivity.",
				confidence: 0.85
			};
		}

		// Permission issues
		if (lowerLogs.includes("permission denied") || lowerLogs.includes("access denied")) {
			return {
				rootCause: "Permission Denied",
				explanation: "The container doesn't have the necessary permissions to access required files, directories, or resources.",
				suggestedFix: "Check file permissions, run the container with appropriate user privileges, or modify the security context.",
				confidence: 0.88
			};
		}

		// Missing dependencies
		if (lowerLogs.includes("not found") || lowerLogs.includes("no such file") || lowerLogs.includes("command not found")) {
			return {
				rootCause: "Missing Dependencies",
				explanation: "The container is missing required files, commands, or dependencies needed to run the application.",
				suggestedFix: "Verify the Docker image includes all necessary dependencies, or update the image to include missing components.",
				confidence: 0.82
			};
		}

		// Configuration issues
		if (lowerLogs.includes("config") && (lowerLogs.includes("invalid") || lowerLogs.includes("missing"))) {
			return {
				rootCause: "Configuration Error",
				explanation: "The application configuration is invalid or missing required settings.",
				suggestedFix: "Check configuration files, environment variables, and ensure all required settings are provided.",
				confidence: 0.80
			};
		}

		// Network issues
		if (lowerLogs.includes("network") || lowerLogs.includes("dns")) {
			return {
				rootCause: "Network Connectivity Issue",
				explanation: "The container is experiencing network connectivity problems or DNS resolution failures.",
				suggestedFix: "Check network configuration, DNS settings, and ensure required services are accessible.",
				confidence: 0.75
			};
		}

		// Generic failure
		return {
			rootCause: "Container Startup Failed",
			explanation: "The container failed to start properly. The logs may contain more specific error information.",
			suggestedFix: "Review the complete container logs, check the application configuration, and verify all dependencies are available.",
			confidence: 0.50
		};
	}

	/**
	 * Analyze all failed containers for comprehensive failure analysis
	 */
	async analyzeAllFailures(): Promise<FailureAnalysis[]> {
		const containers = await this.nosanaClient.getRunningContainers();
		const failedContainers = containers.filter(c => c.status === "failed");
		
		const analyses: FailureAnalysis[] = [];
		for (const container of failedContainers) {
			try {
				const analysis = await this.analyzeFailure(container.id);
				analyses.push(analysis);
			} catch (error) {
				console.error(`Failed to analyze container ${container.id}:`, error);
			}
		}
		
		return analyses;
	}

	/**
	 * Generate a comprehensive failure report using AI analysis
	 */
	async generateFailureReport(): Promise<string> {
		const analyses = await this.analyzeAllFailures();
		
		if (analyses.length === 0) {
			return "✅ No failed containers detected. All applications are running normally.";
		}

		if (this.model) {
			return this.generateAIReport(analyses);
		} else {
			return this.generateBasicReport(analyses);
		}
	}

	/**
	 * Generate AI-powered comprehensive report
	 */
	private async generateAIReport(analyses: FailureAnalysis[]): Promise<string> {
		const prompt = `You are a senior DevOps engineer creating a comprehensive failure analysis report. Analyze the following container failures and create an executive summary.

Failure Analyses:
${analyses.map(analysis => `
App: ${analysis.appName}
Root Cause: ${analysis.rootCause}
Explanation: ${analysis.explanation}
Suggested Fix: ${analysis.suggestedFix}
Confidence: ${analysis.confidence}`).join('\n')}

Create a comprehensive report that includes:
1. Executive Summary
2. Critical Issues (high confidence failures)
3. Common Patterns (if multiple similar failures)
4. Recommended Actions (prioritized by impact)
5. System Health Assessment

Format the response as a clear, professional report that a DevOps team can act upon immediately.`;

		try {
			const response = await this.model!.generateText(prompt);
			return response.text;
		} catch (error) {
			console.error('AI report generation failed, using basic report:', error);
			return this.generateBasicReport(analyses);
		}
	}

	/**
	 * Generate basic structured report as fallback
	 */
	private generateBasicReport(analyses: FailureAnalysis[]): string {
		let report = `🚨 CONTAINER FAILURE ANALYSIS REPORT\n`;
		report += `═══════════════════════════════════════\n\n`;
		
		report += `📊 Summary: ${analyses.length} failed container${analyses.length > 1 ? 's' : ''} detected\n\n`;

		// Group by root cause
		const groupedFailures = analyses.reduce((groups, analysis) => {
			const cause = analysis.rootCause;
			if (!groups[cause]) groups[cause] = [];
			groups[cause].push(analysis);
			return groups;
		}, {} as Record<string, FailureAnalysis[]>);

		report += `🔍 Failure Breakdown:\n`;
		Object.entries(groupedFailures).forEach(([cause, failures]) => {
			report += `  • ${cause}: ${failures.length} instance${failures.length > 1 ? 's' : ''}\n`;
		});

		report += `\n📋 Detailed Analysis:\n`;
		report += `─────────────────────\n`;

		analyses.forEach((analysis, index) => {
			report += `\n${index + 1}. ${analysis.appName} (${analysis.containerId.substring(0, 12)})\n`;
			report += `   🔥 Root Cause: ${analysis.rootCause}\n`;
			report += `   📝 Explanation: ${analysis.explanation}\n`;
			report += `   🔧 Suggested Fix: ${analysis.suggestedFix}\n`;
			report += `   📊 Confidence: ${Math.round(analysis.confidence * 100)}%\n`;
		});

		report += `\n🎯 Recommended Actions:\n`;
		report += `─────────────────────\n`;
		
		// Prioritize high-confidence failures
		const highConfidenceFailures = analyses.filter(a => a.confidence > 0.8);
		if (highConfidenceFailures.length > 0) {
			report += `1. 🔴 HIGH PRIORITY: Address ${highConfidenceFailures.length} high-confidence failure${highConfidenceFailures.length > 1 ? 's' : ''}\n`;
			highConfidenceFailures.forEach(failure => {
				report += `   - Fix ${failure.appName}: ${failure.suggestedFix}\n`;
			});
		}

		const mediumConfidenceFailures = analyses.filter(a => a.confidence >= 0.6 && a.confidence <= 0.8);
		if (mediumConfidenceFailures.length > 0) {
			report += `2. 🟡 MEDIUM PRIORITY: Investigate ${mediumConfidenceFailures.length} potential issue${mediumConfidenceFailures.length > 1 ? 's' : ''}\n`;
		}

		const lowConfidenceFailures = analyses.filter(a => a.confidence < 0.6);
		if (lowConfidenceFailures.length > 0) {
			report += `3. 🟢 LOW PRIORITY: Review ${lowConfidenceFailures.length} unclear failure${lowConfidenceFailures.length > 1 ? 's' : ''}\n`;
		}

		return report;
	}
}