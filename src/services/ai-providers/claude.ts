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

  buildRequestBody(prompt: string, stream = false): any {
    return {
      model: this.model,
      max_tokens: LIMITS.MAX_API_TOKENS,
      stream,
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

  /**
   * Generate content with true streaming support for Claude
   */
  async generateContentStream(
    prompt: string,
    onChunk?: (chunk: string) => void
  ): Promise<any> {
    try {
      const requestBody = this.buildRequestBody(prompt, true);

      const response = await this.client.post(this.getApiUrl(), requestBody, {
        responseType: 'stream'
      });

      let fullContent = '';

      // Handle streaming response
      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              if (data === '[DONE]') {
                continue;
              }

              try {
                const parsed = JSON.parse(data);

                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  const text = parsed.delta.text;
                  fullContent += text;

                  if (onChunk) {
                    onChunk(text);
                  }
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        });

        response.data.on('end', () => {
          resolve({
            content: fullContent,
            provider: this.provider
          });
        });

        response.data.on('error', (error: Error) => {
          reject(error);
        });
      });
    } catch (error) {
      this.handleApiError(error);
    }
  }
}
