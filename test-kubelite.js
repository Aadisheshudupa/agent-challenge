// Test script for KubeLite Phase 1
import { KubeLiteOrchestrator } from "./src/mastra/agents/kubelite-agent/orchestrator";
import path from "path";

async function testKubeLite() {
	console.log("=== KubeLite Phase 1 Test ===");
	
	const orchestrator = new KubeLiteOrchestrator();
	const manifestPath = path.join(process.cwd(), "deploy.yaml");
	
	try {
		console.log("1. Deploying from manifest...");
		await orchestrator.deployFromManifest(manifestPath);
		
		console.log("\n2. Getting status...");
		const status = await orchestrator.getStatus();
		console.log("Status:", JSON.stringify(status, null, 2));
		
		console.log("\n3. Starting reconciliation loop...");
		await orchestrator.start(manifestPath);
		
		console.log("\n4. Waiting 15 seconds for reconciliation...");
		await new Promise(resolve => setTimeout(resolve, 15000));
		
		console.log("\n5. Getting final status...");
		const finalStatus = await orchestrator.getStatus();
		console.log("Final Status:", JSON.stringify(finalStatus, null, 2));
		
		console.log("\n6. Stopping orchestrator...");
		orchestrator.stop();
		
		console.log("\n=== Test completed successfully! ===");
		
	} catch (error) {
		console.error("Test failed:", error);
	}
}

testKubeLite();
