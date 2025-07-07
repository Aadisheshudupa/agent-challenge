import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { kubeLiteAgent } from "./agents/kubelite-agent/kubelite-agent";

export const mastra = new Mastra({
	agents: { kubeLiteAgent },
	logger: new PinoLogger({
		name: "Mastra",
		level: "info",
	}),
	server: {
		port: 8080,
		timeout: 10000,
	},
});
