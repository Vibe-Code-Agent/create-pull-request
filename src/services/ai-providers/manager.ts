import inquirer from 'inquirer';
import { getConfig } from '../../utils/config.js';
import { BaseAIProvider, AIProvider } from './base.js';
import { AI_PROVIDERS, AI_PROVIDER_NAMES, ENV_KEYS, CONFIG_SECTIONS } from '../../constants/index.js';
import { AIProviderLazyLoader } from './lazy-loader.js';

interface ProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
}

export class AIProviderManager {
  private readonly lazyLoader: AIProviderLazyLoader = new AIProviderLazyLoader();
  private readonly availableProviders: ProviderConfig[] = [];
  private selectedProvider: AIProvider | null = null;

  constructor() {
    this.discoverAvailableProviders();
  }

  /**
   * Discover which providers are configured without loading them
   */
  private discoverAvailableProviders(): void {
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

  private getConfigSafely(key: string): any {
    try {
      return getConfig(key as keyof import('../../utils/config.js').EnvironmentConfig);
    } catch {
      return null;
    }
  }

  async selectProvider(): Promise<AIProvider> {
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

    this.selectedProvider = selectedProvider as AIProvider;
    return this.selectedProvider;
  }

  async generateContent(prompt: string, provider?: AIProvider): Promise<string> {
    const selectedProvider = provider || await this.selectProvider();

    // Find the provider config
    const providerConfig = this.availableProviders.find(p => p.provider === selectedProvider);
    if (!providerConfig) {
      throw new Error(`Provider ${selectedProvider} not available`);
    }

    // Lazy load the provider only when needed
    const aiProvider = await this.lazyLoader.loadProvider(
      providerConfig.provider,
      providerConfig.apiKey,
      providerConfig.model
    );

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
  async generateContentStream(
    prompt: string,
    provider?: AIProvider,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const selectedProvider = provider || await this.selectProvider();

    // Find the provider config
    const providerConfig = this.availableProviders.find(p => p.provider === selectedProvider);
    if (!providerConfig) {
      throw new Error(`Provider ${selectedProvider} not available`);
    }

    // Lazy load the provider only when needed
    const aiProvider = await this.lazyLoader.loadProvider(
      providerConfig.provider,
      providerConfig.apiKey,
      providerConfig.model
    );

    const response = await aiProvider.generateContentStream(prompt, onChunk);
    return response.content;
  }

  getAvailableProviders(): AIProvider[] {
    return this.availableProviders.map(config => config.provider);
  }

  hasProvider(provider: AIProvider): boolean {
    return this.availableProviders.some(config => config.provider === provider);
  }

  private getProviderDisplayName(provider: AIProvider): string {
    const names: Record<AIProvider, string> = {
      [AI_PROVIDERS.CLAUDE]: AI_PROVIDER_NAMES.CLAUDE,
      [AI_PROVIDERS.OPENAI]: AI_PROVIDER_NAMES.OPENAI,
      [AI_PROVIDERS.GEMINI]: AI_PROVIDER_NAMES.GEMINI,
      [AI_PROVIDERS.COPILOT]: AI_PROVIDER_NAMES.COPILOT
    };
    return names[provider];
  }
}
