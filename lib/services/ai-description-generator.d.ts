import { GenerateDescriptionOptions, GeneratedPRContent } from '../interface/ai-provider.js';
export type { GenerateDescriptionOptions, GeneratedPRContent } from '../interface/ai-provider.js';
export declare class AIDescriptionGeneratorService {
    private readonly providerManager;
    private readonly promptBuilder;
    private readonly responseParser;
    constructor();
    generatePRDescription(options: GenerateDescriptionOptions): Promise<GeneratedPRContent>;
}
//# sourceMappingURL=ai-description-generator.d.ts.map