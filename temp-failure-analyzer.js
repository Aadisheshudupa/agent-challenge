
class FailureAnalyzer {
  constructor(model) {
    this.model = model;
  }

  async analyzeFailure(appName, logs, appStatus) {
    const prompt = `Analyze failure for app: ${appName}
Status: ${JSON.stringify(appStatus)}
Recent logs:
${logs.map(log => `[${log.timestamp}] ${log.level}: ${log.message}`).join('\n')}

Please provide failure analysis in JSON format with:
- rootCause: string
- severity: "Low" | "Medium" | "High" | "Critical" 
- affectedComponents: string[]
- suggestedFixes: string[]
- confidence: number (0-1)`;

    const result = await this.model.generateText(prompt);
    return JSON.parse(result.text);
  }
}

module.exports = { FailureAnalyzer };
