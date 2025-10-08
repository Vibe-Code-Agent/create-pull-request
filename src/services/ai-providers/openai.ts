import { BaseAIProvider } from './base.js';
import { API_URLS, DEFAULT_MODELS, AI_PROVIDERS, LIMITS } from '../../constants/index.js';

export class OpenAIProvider extends BaseAIProvider {
  constructor(apiKey: string, model?: string) {
    super(AI_PROVIDERS.OPENAI, apiKey, model);
  }

  getDefaultModel(): string {
    return DEFAULT_MODELS.OPENAI;
  }

  getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`
    };
  }

  getApiUrl(): string {
    return `${API_URLS.OPENAI_BASE_URL}/chat/completions`;
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
      throw new Error('No content received from OpenAI API');
    }
    return response.choices[0].message.content;
  }
}
