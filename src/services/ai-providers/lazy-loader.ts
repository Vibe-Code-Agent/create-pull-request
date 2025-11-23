import { BaseAIProvider, AIProvider } from './base.js';
import { AI_PROVIDERS } from '../../constants/index.js';

/**
 * Lazy loader for AI provider implementations
 * Loads provider modules only when needed to reduce startup time
 */
export class AIProviderLazyLoader {
    private loadedProviders: Map<AIProvider, BaseAIProvider> = new Map();
    private loadingPromises: Map<AIProvider, Promise<BaseAIProvider>> = new Map();

    /**
     * Lazily load and instantiate an AI provider
     */
    async loadProvider(
        provider: AIProvider,
        apiKey: string,
        model?: string
    ): Promise<BaseAIProvider> {
        // Return cached instance if already loaded
        if (this.loadedProviders.has(provider)) {
            return this.loadedProviders.get(provider)!;
        }

        // If currently loading, wait for that promise
        if (this.loadingPromises.has(provider)) {
            return this.loadingPromises.get(provider)!;
        }

        // Start loading the provider
        const loadingPromise = this.doLoadProvider(provider, apiKey, model);
        this.loadingPromises.set(provider, loadingPromise);

        try {
            const instance = await loadingPromise;
            this.loadedProviders.set(provider, instance);
            return instance;
        } finally {
            this.loadingPromises.delete(provider);
        }
    }

    /**
     * Actually perform the dynamic import and instantiation
     */
    private async doLoadProvider(
        provider: AIProvider,
        apiKey: string,
        model?: string
    ): Promise<BaseAIProvider> {
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
    isLoaded(provider: AIProvider): boolean {
        return this.loadedProviders.has(provider);
    }

    /**
     * Get a loaded provider without triggering a load
     */
    getLoaded(provider: AIProvider): BaseAIProvider | undefined {
        return this.loadedProviders.get(provider);
    }

    /**
     * Clear all loaded providers (useful for testing)
     */
    clear(): void {
        this.loadedProviders.clear();
        this.loadingPromises.clear();
    }
}
