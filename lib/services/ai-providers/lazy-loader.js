import { AI_PROVIDERS } from '../../constants/index.js';
/**
 * Lazy loader for AI provider implementations
 * Loads provider modules only when needed to reduce startup time
 */
export class AIProviderLazyLoader {
    constructor() {
        this.loadedProviders = new Map();
        this.loadingPromises = new Map();
    }
    /**
     * Generate a cache key that includes provider, apiKey, and model
     */
    getCacheKey(provider, apiKey, model) {
        return `${provider}:${apiKey}:${model || 'default'}`;
    }
    /**
     * Lazily load and instantiate an AI provider
     */
    async loadProvider(provider, apiKey, model) {
        const cacheKey = this.getCacheKey(provider, apiKey, model);
        // Return cached instance if already loaded
        if (this.loadedProviders.has(cacheKey)) {
            return this.loadedProviders.get(cacheKey);
        }
        // If currently loading, wait for that promise
        if (this.loadingPromises.has(cacheKey)) {
            return this.loadingPromises.get(cacheKey);
        }
        // Start loading the provider
        const loadingPromise = this.doLoadProvider(provider, apiKey, model);
        this.loadingPromises.set(cacheKey, loadingPromise);
        try {
            const instance = await loadingPromise;
            this.loadedProviders.set(cacheKey, instance);
            return instance;
        }
        finally {
            this.loadingPromises.delete(cacheKey);
        }
    }
    /**
     * Actually perform the dynamic import and instantiation
     */
    async doLoadProvider(provider, apiKey, model) {
        switch (provider) {
            case AI_PROVIDERS.CLAUDE: {
                const { ClaudeProvider } = await import('./claude.js');
                return new ClaudeProvider(apiKey, model);
            }
            case AI_PROVIDERS.OPENAI: {
                const { OpenAIProvider } = await import('./openai.js');
                return new OpenAIProvider(apiKey, model);
            }
            case AI_PROVIDERS.GEMINI: {
                const { GeminiProvider } = await import('./gemini.js');
                return new GeminiProvider(apiKey, model);
            }
            case AI_PROVIDERS.COPILOT: {
                const { CopilotProvider } = await import('./copilot.js');
                return new CopilotProvider(apiKey);
            }
            default:
                throw new Error(`Unknown AI provider: ${provider}`);
        }
    }
    /**
     * Check if a provider has been loaded
     */
    isLoaded(provider, apiKey, model) {
        // If no apiKey provided, check if any instance of this provider type is loaded
        if (!apiKey) {
            return Array.from(this.loadedProviders.keys()).some(key => key.startsWith(`${provider}:`));
        }
        const cacheKey = this.getCacheKey(provider, apiKey, model);
        return this.loadedProviders.has(cacheKey);
    }
    /**
     * Get a loaded provider without triggering a load
     */
    getLoaded(provider, apiKey, model) {
        // If no apiKey provided, return the first instance of this provider type
        if (!apiKey) {
            const key = Array.from(this.loadedProviders.keys()).find(k => k.startsWith(`${provider}:`));
            return key ? this.loadedProviders.get(key) : undefined;
        }
        const cacheKey = this.getCacheKey(provider, apiKey, model);
        return this.loadedProviders.get(cacheKey);
    }
    /**
     * Clear all loaded providers (useful for testing)
     */
    clear() {
        this.loadedProviders.clear();
        this.loadingPromises.clear();
    }
}
//# sourceMappingURL=lazy-loader.js.map