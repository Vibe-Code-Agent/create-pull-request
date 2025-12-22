import { BaseAIProvider } from './base.js';
import { AI_PROVIDERS, LIMITS, API_URLS } from '../../constants/index.js';

export class CopilotProvider extends BaseAIProvider {
  constructor(apiKey: string, model?: string) {
    super(AI_PROVIDERS.COPILOT, apiKey, model);
  }

  getDefaultModel(): string {
    return 'gpt-4o';
  }

  getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  getApiUrl(): string {
    return `${API_URLS.COPILOT_BASE_URL}/chat/completions`;
  }

  buildRequestBody(prompt: string): any {
    return {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: LIMITS.MAX_API_TOKENS,
      temperature: 0.7
    };
  }

  extractContentFromResponse(response: any): string {
    if (!response.choices?.[0]?.message?.content) {
      throw new Error('No content received from Copilot API');
    }
    return response.choices[0].message.content;
  }
}
