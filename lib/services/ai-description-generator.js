import { AIProviderManager } from './ai-providers/manager.js';
import { PromptBuilder } from './ai-providers/prompt-builder.js';
import { ResponseParser } from './ai-providers/response-parser.js';
export class AIDescriptionGeneratorService {
    constructor() {
        this.providerManager = new AIProviderManager();
        this.promptBuilder = new PromptBuilder();
        this.responseParser = new ResponseParser();
    }
    async generatePRDescription(options) {
        // Select AI provider
        const selectedProvider = await this.providerManager.selectProvider();
        // Build the prompt using the new PromptBuilder
        const prompt = this.promptBuilder.buildPrompt(options);
        // Generate content using the provider manager
        const content = await this.providerManager.generateContent(prompt, selectedProvider);
        // Parse the response using the new ResponseParser
        const result = this.responseParser.parseAIResponse({ content }, selectedProvider);
        return result;
    }
}
//# sourceMappingURL=ai-description-generator.js.map