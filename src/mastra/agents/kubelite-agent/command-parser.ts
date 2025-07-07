import { KubeLiteApp } from "./types";

// Parsed command structure
export interface ParsedCommand {
	intent: "deploy" | "scale" | "delete" | "status" | "stop" | "help";
	appName?: string;
	image?: string;
	replicas?: number;
	ports?: number[];
	confidence: number; // 0-1 confidence score
	reasoning?: string; // LLM reasoning for the decision
}

// Ollama LLM client
class OllamaClient {
	constructor(private baseUrl: string = "http://127.0.0.1:11434/api") {}

	async generateText(prompt: string): Promise<{ text: string }> {
		const response = await fetch(`${this.baseUrl}/generate`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: "qwen2.5:1.5b",
				prompt: prompt,
				stream: false,
				options: {
					temperature: 0.1, // Low temperature for consistent parsing
					num_predict: 200,  // Limit response length
				},
			}),
		});

		if (!response.ok) {
			throw new Error(`Ollama API error: ${response.status}`);
		}

		const data = await response.json();
		return { text: data.response };
	}
}

export class CommandParser {
	private llmClient: OllamaClient;

	constructor() {
		// Always use LLM - no fallback
		this.llmClient = new OllamaClient();
	}

	/**
	 * Parse natural language input using LLM-powered analysis only
	 */
	async parseCommand(input: string): Promise<ParsedCommand> {
		const prompt = `You are an expert Kubernetes/container orchestration assistant. Parse this user command into structured deployment instructions.

User input: "${input}"

Analyze the user's intent and extract deployment parameters. Respond with ONLY a JSON object in this exact format:
{
  "intent": "deploy|scale|delete|status|help",
  "appName": "extracted app name or null",
  "image": "container image name or null", 
  "replicas": number or null,
  "ports": [port numbers] or null,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of your analysis"
}

Guidelines:
- "deploy/create/start/run" → intent: "deploy"
- "scale/resize/change replicas" → intent: "scale" 
- "delete/remove/stop/kill" → intent: "delete"
- "status/list/show/what's running" → intent: "status"
- Extract numeric values for replicas (instances/copies/replicas)
- Identify container images (nginx, redis, postgres, etc.)
- Extract port numbers if mentioned
- Set confidence based on clarity of the command
- If unclear, set lower confidence and explain reasoning

Examples:
"deploy 3 nginx containers" → {"intent": "deploy", "image": "nginx", "replicas": 3, "confidence": 0.9}
"scale my-app to 5" → {"intent": "scale", "appName": "my-app", "replicas": 5, "confidence": 0.8}

Remember: respond with ONLY the JSON object, no additional text.`;

		try {
			const response = await this.llmClient.generateText(prompt);
			
			// Extract JSON from response (in case LLM adds extra text)
			let jsonText = response.text.trim();
			const jsonMatch = jsonText.match(/\{.*\}/s);
			if (jsonMatch) {
				jsonText = jsonMatch[0];
			}
			
			const parsed = JSON.parse(jsonText);
			
			// Validate and sanitize the response
			const result = {
				intent: parsed.intent || "help",
				appName: parsed.appName === "null" ? undefined : parsed.appName,
				image: parsed.image === "null" ? undefined : parsed.image,
				replicas: parsed.replicas || undefined,
				ports: parsed.ports || undefined,
				confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
				reasoning: parsed.reasoning || "LLM analysis completed"
			};
			
			// Auto-generate app name if missing but we have an image for deploy commands
			if (result.intent === "deploy" && !result.appName && result.image) {
				result.appName = `${result.image.replace(/[^a-zA-Z0-9]/g, '-')}-app`;
				result.reasoning = `${result.reasoning} (auto-generated app name: ${result.appName})`;
			}
			
			return result;
		} catch (error) {
			console.error('LLM parsing failed:', error);
			// Simple fallback without regex
			return {
				intent: "help",
				confidence: 0.1,
				reasoning: `Failed to parse command: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}

	/**
	 * Generate a human-readable explanation of the parsed command
	 */
	generateExplanation(command: ParsedCommand): string {
		let explanation: string;
		
		switch (command.intent) {
			case "deploy":
				explanation = "I understand you want to deploy";
				if (command.replicas) {
					explanation += ` ${command.replicas} instance${command.replicas > 1 ? 's' : ''}`;
				} else {
					explanation += " an application";
				}
				if (command.image) {
					explanation += ` using the ${command.image} image`;
				}
				if (command.appName) {
					explanation += ` named ${command.appName}`;
				}
				explanation += ".";
				break;

			case "scale":
				explanation = "I understand you want to scale";
				if (command.appName) {
					explanation += ` ${command.appName}`;
				} else {
					explanation += " an application";
				}
				if (command.replicas) {
					explanation += ` to ${command.replicas} replica${command.replicas > 1 ? 's' : ''}`;
				}
				explanation += ".";
				break;

			case "delete":
				explanation = "I understand you want to delete";
				if (command.appName) {
					explanation += ` ${command.appName}`;
				} else {
					explanation += " an application";
				}
				explanation += ".";
				break;

			case "status":
				explanation = "I understand you want to check the status of your deployments.";
				break;

			default:
				explanation = "I can help you deploy, scale, delete applications, or check their status. What would you like to do?";
		}

		if (command.confidence < 0.7) {
			explanation += ` (Confidence: ${Math.round(command.confidence * 100)}% - please clarify if this isn't what you meant)`;
		}

		return explanation;
	}
}