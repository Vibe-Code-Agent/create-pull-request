import { AIProviderManager } from './ai-providers/manager.js';
import { PromptBuilder } from './ai-providers/prompt-builder.js';
import { ResponseParser } from './ai-providers/response-parser.js';
import { GenerateDescriptionOptions, GeneratedPRContent } from '../interface/ai.js';

// Re-export interfaces for backward compatibility
export type { GenerateDescriptionOptions, GeneratedPRContent } from '../interface/ai.js';

export class AIDescriptionGeneratorService {
  private readonly providerManager: AIProviderManager;
  private readonly promptBuilder: PromptBuilder;
  private readonly responseParser: ResponseParser;

  constructor() {
    this.providerManager = new AIProviderManager();
    this.promptBuilder = new PromptBuilder();
    this.responseParser = new ResponseParser();
  }

  async generatePRDescription(options: GenerateDescriptionOptions): Promise<GeneratedPRContent> {
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

  // All other functionality is now handled by the modular classes:
  // - AIProviderManager handles provider selection and API calls
  // - PromptBuilder handles prompt construction
  // - ResponseParser handles response parsing
}
