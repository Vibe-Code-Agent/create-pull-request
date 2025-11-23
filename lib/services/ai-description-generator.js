export class AIDescriptionGeneratorService {
    constructor(providerManager, promptBuilder, responseParser) {
        this.providerManager = providerManager;
        this.promptBuilder = promptBuilder;
        this.responseParser = responseParser;
    }
    async generatePRDescription(options, onProgress) {
        // Select AI provider
        const selectedProvider = await this.providerManager.selectProvider();
        // Build the prompt using the new PromptBuilder
        const prompt = this.promptBuilder.buildPrompt(options);
        // Generate content using the provider manager (with optional streaming)
        const content = await this.providerManager.generateContentStream(prompt, selectedProvider, onProgress);
        // Parse the response using the new ResponseParser
        const result = this.responseParser.parseAIResponse({ content }, selectedProvider);
        return result;
    }
}
//# sourceMappingURL=ai-description-generator.js.map