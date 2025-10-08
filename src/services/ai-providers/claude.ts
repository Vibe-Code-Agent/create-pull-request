import { BaseAIProvider } from './base.js';
import { API_URLS, DEFAULT_MODELS, AI_PROVIDERS, LIMITS } from '../../constants/index.js';

export class ClaudeProvider extends BaseAIProvider {
  constructor(apiKey: string, model?: string) {
    super(AI_PROVIDERS.CLAUDE, apiKey, model);
  }

  getDefaultModel(): string {
    return DEFAULT_MODELS.CLAUDE;
  }

  getHeaders(): Record<string, string> {
    return {
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01'
    };
  }

  getApiUrl(): string {
    return `${API_URLS.CLAUDE_BASE_URL}/v1/messages`;
  }

  buildRequestBody(prompt: string): any {
    return {
      model: this.model,
      max_tokens: LIMITS.MAX_API_TOKENS,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    };
  }

  extractContentFromResponse(response: any): string {
    if (!response.content?.[0]?.text) {
      throw new Error('No content received from Claude API');
    }
    return response.content[0].text;
  }
}
