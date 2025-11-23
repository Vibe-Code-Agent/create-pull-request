import { AIProvider } from './base.js';
export declare class AIProviderManager {
    private readonly lazyLoader;
    private readonly availableProviders;
    private selectedProvider;
    constructor();
    /**
     * Discover which providers are configured without loading them
     */
    private discoverAvailableProviders;
    private getConfigSafely;
    selectProvider(): Promise<AIProvider>;
    generateContent(prompt: string, provider?: AIProvider): Promise<string>;
    /**
     * Generate content with streaming support
     * @param prompt The prompt to send to the AI
     * @param provider Optional specific provider to use
     * @param onChunk Optional callback for streaming chunks
     * @returns Complete content when generation is done
     */
    generateContentStream(prompt: string, provider?: AIProvider, onChunk?: (chunk: string) => void): Promise<string>;
    getAvailableProviders(): AIProvider[];
    hasProvider(provider: AIProvider): boolean;
    private getProviderDisplayName;
}
//# sourceMappingURL=manager.d.ts.map