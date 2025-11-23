import { AIProviderManager } from './ai-providers/manager.js';
import { PromptBuilder } from './ai-providers/prompt-builder.js';
import { ResponseParser } from './ai-providers/response-parser.js';
import { GenerateDescriptionOptions, GeneratedPRContent } from '../interface/ai-provider.js';
export type { GenerateDescriptionOptions, GeneratedPRContent } from '../interface/ai-provider.js';
export declare class AIDescriptionGeneratorService {
    private readonly providerManager;
    private readonly promptBuilder;
    private readonly responseParser;
    constructor(providerManager: AIProviderManager, promptBuilder: PromptBuilder, responseParser: ResponseParser);
    generatePRDescription(options: GenerateDescriptionOptions, onProgress?: (chunk: string) => void): Promise<GeneratedPRContent>;
}
//# sourceMappingURL=ai-description-generator.d.ts.map