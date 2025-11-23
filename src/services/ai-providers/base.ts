import axios, { AxiosInstance } from 'axios';
import { LIMITS, HEADERS, HTTP_STATUS } from '../../constants/index.js';
import { AIResponse, AIProvider } from '../../interface/ai-provider.js';

// Re-export interfaces for backward compatibility
export type { AIResponse, AIProvider } from '../../interface/ai-provider.js';

export abstract class BaseAIProvider {
  protected readonly client: AxiosInstance;
  protected readonly provider: AIProvider;
  protected readonly apiKey: string;
  protected readonly model: string;

  constructor(provider: AIProvider, apiKey: string, model?: string) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.model = model || this.getDefaultModel();

    this.client = axios.create({
      timeout: LIMITS.API_TIMEOUT_MS,
      headers: {
        'Content-Type': HEADERS.JSON_CONTENT_TYPE,
        ...this.getHeaders()
      }
    });
  }

  abstract getDefaultModel(): string;
  abstract getHeaders(): Record<string, string>;
  abstract getApiUrl(): string;
  abstract buildRequestBody(prompt: string): any;
  abstract extractContentFromResponse(response: any): string;

  async generateContent(prompt: string): Promise<AIResponse> {
    try {
      const requestBody = this.buildRequestBody(prompt);
      const response = await this.client.post(this.getApiUrl(), requestBody);
      const content = this.extractContentFromResponse(response.data);
      return {
        content,
        provider: this.provider
      };
    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Generate content with streaming support
   * @param prompt The prompt to send to the AI
   * @param onChunk Callback function for each streamed chunk
   * @returns Complete AI response when streaming is done
   */
  async generateContentStream(
    prompt: string,
    onChunk?: (chunk: string) => void
  ): Promise<AIResponse> {
    // Default implementation: fall back to non-streaming
    // Providers can override this for true streaming support
    const response = await this.generateContent(prompt);

    if (onChunk) {
      // Immediately deliver the content in chunks without artificial delay
      // The content is already generated, so adding delays only degrades performance
      const words = response.content.split(' ');
      for (const word of words) {
        onChunk(word + ' ');
      }
    }

    return response;
  }

  protected handleApiError(error: any): never {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.message;

      if (status === HTTP_STATUS.UNAUTHORIZED) {
        throw new Error(`Authentication failed for ${this.provider}. Please check your API key.`);
      } else if (status === HTTP_STATUS.TOO_MANY_REQUESTS) {
        throw new Error(`Rate limit exceeded for ${this.provider}. Please try again later.`);
      } else if (status === HTTP_STATUS.INTERNAL_SERVER_ERROR) {
        throw new Error(`${this.provider} API server error. Please try again later.`);
      } else {
        throw new Error(`${this.provider} API error: ${message}`);
      }
    } else if (error.code === 'ECONNABORTED') {
      throw new Error(`${this.provider} API timeout. Please try again.`);
    } else {
      throw new Error(`${this.provider} API error: ${error.message}`);
    }
  }
}
