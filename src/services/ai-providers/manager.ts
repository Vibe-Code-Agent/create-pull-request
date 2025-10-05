import inquirer from 'inquirer';
import { getConfig } from '../../utils/config.js';
import { BaseAIProvider, AIProvider } from './base.js';
import { AI_PROVIDERS, AI_PROVIDER_NAMES } from '../../constants/index.js';
import { ClaudeProvider } from './claude.js';
import { ChatGPTProvider } from './chatgpt.js';
import { GeminiProvider } from './gemini.js';
import { CopilotProvider } from './copilot.js';

export class AIProviderManager {
  private readonly providers: Map<AIProvider, BaseAIProvider> = new Map();
  private selectedProvider: AIProvider | null = null;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    const githubConfig = this.getConfigSafely('github');
    const copilotConfig = this.getConfigSafely('copilot');
    const aiProvidersConfig = this.getConfigSafely('aiProviders');

    // Claude client (primary AI provider)
    const claudeKey = aiProvidersConfig?.claude?.apiKey ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.CLAUDE_API_KEY;

    if (claudeKey) {
      this.providers.set(AI_PROVIDERS.CLAUDE, new ClaudeProvider(
        claudeKey,
        aiProvidersConfig?.claude?.model
      ));
    }

    // ChatGPT client
    const chatgptKey = aiProvidersConfig?.openai?.apiKey ||
      process.env.OPENAI_API_KEY ||
      process.env.CHATGPT_API_KEY;

    if (chatgptKey) {
      this.providers.set(AI_PROVIDERS.CHATGPT, new ChatGPTProvider(
        chatgptKey,
        aiProvidersConfig?.openai?.model
      ));
    }

    // Gemini client
    const geminiKey = aiProvidersConfig?.gemini?.apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (geminiKey) {
      this.providers.set(AI_PROVIDERS.GEMINI, new GeminiProvider(
        geminiKey,
        aiProvidersConfig?.gemini?.model
      ));
    }

    // GitHub Copilot client
    const copilotKey = copilotConfig?.apiToken || githubConfig?.token;

    if (copilotKey) {
      this.providers.set(AI_PROVIDERS.COPILOT, new CopilotProvider(copilotKey));
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

    const availableProviders = Array.from(this.providers.keys());

    if (availableProviders.length === 0) {
      throw new Error('No AI providers configured. Please set ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or configure GitHub Copilot.');
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
    return this.selectedProvider!;
  }

  async generateContent(prompt: string, provider?: AIProvider): Promise<string> {
    const selectedProvider = provider || await this.selectProvider();
    const aiProvider = this.providers.get(selectedProvider);

    if (!aiProvider) {
      throw new Error(`Provider ${selectedProvider} not available`);
    }

    const response = await aiProvider.generateContent(prompt);
    return response.content;
  }

  getAvailableProviders(): AIProvider[] {
    return Array.from(this.providers.keys());
  }

  hasProvider(provider: AIProvider): boolean {
    return this.providers.has(provider);
  }

  private getProviderDisplayName(provider: AIProvider): string {
    const names: Record<AIProvider, string> = {
      [AI_PROVIDERS.CLAUDE]: AI_PROVIDER_NAMES.CLAUDE,
      [AI_PROVIDERS.CHATGPT]: AI_PROVIDER_NAMES.CHATGPT,
      [AI_PROVIDERS.GEMINI]: AI_PROVIDER_NAMES.GEMINI,
      [AI_PROVIDERS.COPILOT]: AI_PROVIDER_NAMES.COPILOT
    };
    return names[provider];
  }
}
