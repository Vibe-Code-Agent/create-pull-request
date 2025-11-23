import inquirer from 'inquirer';
import { getConfig } from '../../utils/config.js';
import { AI_PROVIDERS, AI_PROVIDER_NAMES, ENV_KEYS, CONFIG_SECTIONS } from '../../constants/index.js';
import { AIProviderLazyLoader } from './lazy-loader.js';
export class AIProviderManager {
    constructor() {
        this.lazyLoader = new AIProviderLazyLoader();
        this.availableProviders = [];
        this.selectedProvider = null;
        this.discoverAvailableProviders();
    }
    /**
     * Discover which providers are configured without loading them
     */
    discoverAvailableProviders() {
        const githubConfig = this.getConfigSafely(CONFIG_SECTIONS.GITHUB);
        const copilotConfig = this.getConfigSafely(CONFIG_SECTIONS.COPILOT);
        const aiProvidersConfig = this.getConfigSafely(CONFIG_SECTIONS.AI_PROVIDERS);
        // Claude client (primary AI provider)
        const claudeKey = aiProvidersConfig?.claude?.apiKey ||
            process.env[ENV_KEYS.ANTHROPIC_API_KEY] ||
            process.env.CLAUDE_API_KEY;
        if (claudeKey) {
            this.availableProviders.push({
                provider: AI_PROVIDERS.CLAUDE,
                apiKey: claudeKey,
                model: aiProvidersConfig?.claude?.model
            });
        }
        // OpenAI client
        const openaiKey = aiProvidersConfig?.openai?.apiKey ||
            process.env[ENV_KEYS.OPENAI_API_KEY];
        if (openaiKey) {
            this.availableProviders.push({
                provider: AI_PROVIDERS.OPENAI,
                apiKey: openaiKey,
                model: aiProvidersConfig?.openai?.model
            });
        }
        // Gemini client
        const geminiKey = aiProvidersConfig?.gemini?.apiKey ||
            process.env[ENV_KEYS.GEMINI_API_KEY] ||
            process.env.GOOGLE_API_KEY;
        if (geminiKey) {
            this.availableProviders.push({
                provider: AI_PROVIDERS.GEMINI,
                apiKey: geminiKey,
                model: aiProvidersConfig?.gemini?.model
            });
        }
        // GitHub Copilot client
        const copilotKey = copilotConfig?.apiToken || githubConfig?.token;
        if (copilotKey) {
            this.availableProviders.push({
                provider: AI_PROVIDERS.COPILOT,
                apiKey: copilotKey
            });
        }
    }
    getConfigSafely(key) {
        try {
            return getConfig(key);
        }
        catch {
            return null;
        }
    }
    async selectProvider() {
        if (this.selectedProvider) {
            return this.selectedProvider;
        }
        if (this.availableProviders.length === 0) {
            throw new Error(`No AI providers configured. Please set ${ENV_KEYS.ANTHROPIC_API_KEY}, ${ENV_KEYS.OPENAI_API_KEY}, ${ENV_KEYS.GEMINI_API_KEY}, or configure GitHub Copilot.`);
        }
        // If only one provider available, use it
        if (this.availableProviders.length === 1) {
            this.selectedProvider = this.availableProviders[0].provider;
            return this.selectedProvider;
        }
        // Prompt user to select if multiple providers available
        const { selectedProvider } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedProvider',
                message: 'Multiple AI providers available. Please select one:',
                choices: this.availableProviders.map(config => ({
                    name: this.getProviderDisplayName(config.provider),
                    value: config.provider
                }))
            }
        ]);
        this.selectedProvider = selectedProvider;
        return this.selectedProvider;
    }
    async generateContent(prompt, provider) {
        const selectedProvider = provider || await this.selectProvider();
        // Find the provider config
        const providerConfig = this.availableProviders.find(p => p.provider === selectedProvider);
        if (!providerConfig) {
            throw new Error(`Provider ${selectedProvider} not available`);
        }
        // Lazy load the provider only when needed
        const aiProvider = await this.lazyLoader.loadProvider(providerConfig.provider, providerConfig.apiKey, providerConfig.model);
        const response = await aiProvider.generateContent(prompt);
        return response.content;
    }
    /**
     * Generate content with streaming support
     * @param prompt The prompt to send to the AI
     * @param provider Optional specific provider to use
     * @param onChunk Optional callback for streaming chunks
     * @returns Complete content when generation is done
     */
    async generateContentStream(prompt, provider, onChunk) {
        const selectedProvider = provider || await this.selectProvider();
        // Find the provider config
        const providerConfig = this.availableProviders.find(p => p.provider === selectedProvider);
        if (!providerConfig) {
            throw new Error(`Provider ${selectedProvider} not available`);
        }
        // Lazy load the provider only when needed
        const aiProvider = await this.lazyLoader.loadProvider(providerConfig.provider, providerConfig.apiKey, providerConfig.model);
        const response = await aiProvider.generateContentStream(prompt, onChunk);
        return response.content;
    }
    getAvailableProviders() {
        return this.availableProviders.map(config => config.provider);
    }
    hasProvider(provider) {
        return this.availableProviders.some(config => config.provider === provider);
    }
    getProviderDisplayName(provider) {
        const names = {
            [AI_PROVIDERS.CLAUDE]: AI_PROVIDER_NAMES.CLAUDE,
            [AI_PROVIDERS.OPENAI]: AI_PROVIDER_NAMES.OPENAI,
            [AI_PROVIDERS.GEMINI]: AI_PROVIDER_NAMES.GEMINI,
            [AI_PROVIDERS.COPILOT]: AI_PROVIDER_NAMES.COPILOT
        };
        return names[provider];
    }
}
//# sourceMappingURL=manager.js.map