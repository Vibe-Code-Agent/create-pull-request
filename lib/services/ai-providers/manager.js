import inquirer from 'inquirer';
import { getConfig } from '../../utils/config.js';
import { AI_PROVIDERS, AI_PROVIDER_NAMES, ENV_KEYS, CONFIG_SECTIONS } from '../../constants/index.js';
import { ClaudeProvider } from './claude.js';
import { OpenAIProvider } from './openai.js';
import { GeminiProvider } from './gemini.js';
import { CopilotProvider } from './copilot.js';
export class AIProviderManager {
    constructor() {
        this.providers = new Map();
        this.selectedProvider = null;
        this.initializeProviders();
    }
    initializeProviders() {
        const githubConfig = this.getConfigSafely(CONFIG_SECTIONS.GITHUB);
        const copilotConfig = this.getConfigSafely(CONFIG_SECTIONS.COPILOT);
        const aiProvidersConfig = this.getConfigSafely(CONFIG_SECTIONS.AI_PROVIDERS);
        // Claude client (primary AI provider)
        const claudeKey = aiProvidersConfig?.claude?.apiKey ||
            process.env[ENV_KEYS.ANTHROPIC_API_KEY] ||
            process.env.CLAUDE_API_KEY;
        if (claudeKey) {
            this.providers.set(AI_PROVIDERS.CLAUDE, new ClaudeProvider(claudeKey, aiProvidersConfig?.claude?.model));
        }
        // OpenAI client
        const openaiKey = aiProvidersConfig?.openai?.apiKey ||
            process.env[ENV_KEYS.OPENAI_API_KEY];
        if (openaiKey) {
            this.providers.set(AI_PROVIDERS.OPENAI, new OpenAIProvider(openaiKey, aiProvidersConfig?.openai?.model));
        }
        // Gemini client
        const geminiKey = aiProvidersConfig?.gemini?.apiKey ||
            process.env[ENV_KEYS.GEMINI_API_KEY] ||
            process.env.GOOGLE_API_KEY;
        if (geminiKey) {
            this.providers.set(AI_PROVIDERS.GEMINI, new GeminiProvider(geminiKey, aiProvidersConfig?.gemini?.model));
        }
        // GitHub Copilot client
        const copilotKey = copilotConfig?.apiToken || githubConfig?.token;
        if (copilotKey) {
            this.providers.set(AI_PROVIDERS.COPILOT, new CopilotProvider(copilotKey));
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
        const availableProviders = Array.from(this.providers.keys());
        if (availableProviders.length === 0) {
            throw new Error(`No AI providers configured. Please set ${ENV_KEYS.ANTHROPIC_API_KEY}, ${ENV_KEYS.OPENAI_API_KEY}, ${ENV_KEYS.GEMINI_API_KEY}, or configure GitHub Copilot.`);
        }
        // If only one provider available, use it
        if (availableProviders.length === 1) {
            this.selectedProvider = availableProviders[0];
            return this.selectedProvider;
        }
        // Prompt user to select if multiple providers available
        const { selectedProvider } = await inquirer.prompt([
            {
                type: 'list',
                name: 'selectedProvider',
                message: 'Multiple AI providers available. Please select one:',
                choices: availableProviders.map(provider => ({
                    name: this.getProviderDisplayName(provider),
                    value: provider
                }))
            }
        ]);
        this.selectedProvider = selectedProvider;
        return this.selectedProvider;
    }
    async generateContent(prompt, provider) {
        const selectedProvider = provider || await this.selectProvider();
        const aiProvider = this.providers.get(selectedProvider);
        if (!aiProvider) {
            throw new Error(`Provider ${selectedProvider} not available`);
        }
        const response = await aiProvider.generateContent(prompt);
        return response.content;
    }
    getAvailableProviders() {
        return Array.from(this.providers.keys());
    }
    hasProvider(provider) {
        return this.providers.has(provider);
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