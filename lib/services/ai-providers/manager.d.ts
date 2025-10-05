import { AIProvider } from './base.js';
export declare class AIProviderManager {
    private readonly providers;
    private selectedProvider;
    constructor();
    private initializeProviders;
    private getConfigSafely;
    selectProvider(): Promise<AIProvider>;
    generateContent(prompt: string, provider?: AIProvider): Promise<string>;
    getAvailableProviders(): AIProvider[];
    hasProvider(provider: AIProvider): boolean;
    private getProviderDisplayName;
}
//# sourceMappingURL=manager.d.ts.map