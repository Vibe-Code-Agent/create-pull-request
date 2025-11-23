import { BaseAIProvider, AIProvider } from './base.js';
/**
 * Lazy loader for AI provider implementations
 * Loads provider modules only when needed to reduce startup time
 */
export declare class AIProviderLazyLoader {
    private loadedProviders;
    private loadingPromises;
    /**
     * Lazily load and instantiate an AI provider
     */
    loadProvider(provider: AIProvider, apiKey: string, model?: string): Promise<BaseAIProvider>;
    /**
     * Actually perform the dynamic import and instantiation
     */
    private doLoadProvider;
    /**
     * Check if a provider has been loaded
     */
    isLoaded(provider: AIProvider): boolean;
    /**
     * Get a loaded provider without triggering a load
     */
    getLoaded(provider: AIProvider): BaseAIProvider | undefined;
    /**
     * Clear all loaded providers (useful for testing)
     */
    clear(): void;
}
//# sourceMappingURL=lazy-loader.d.ts.map