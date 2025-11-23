import { AxiosInstance } from 'axios';
import { AIResponse, AIProvider } from '../../interface/ai-provider.js';
export type { AIResponse, AIProvider } from '../../interface/ai-provider.js';
export declare abstract class BaseAIProvider {
    protected readonly client: AxiosInstance;
    protected readonly provider: AIProvider;
    protected readonly apiKey: string;
    protected readonly model: string;
    constructor(provider: AIProvider, apiKey: string, model?: string);
    abstract getDefaultModel(): string;
    abstract getHeaders(): Record<string, string>;
    abstract getApiUrl(): string;
    abstract buildRequestBody(prompt: string): any;
    abstract extractContentFromResponse(response: any): string;
    generateContent(prompt: string): Promise<AIResponse>;
    /**
     * Generate content with streaming support
     * @param prompt The prompt to send to the AI
     * @param onChunk Callback function for each streamed chunk
     * @returns Complete AI response when streaming is done
     */
    generateContentStream(prompt: string, onChunk?: (chunk: string) => void): Promise<AIResponse>;
    protected handleApiError(error: any): never;
}
//# sourceMappingURL=base.d.ts.map