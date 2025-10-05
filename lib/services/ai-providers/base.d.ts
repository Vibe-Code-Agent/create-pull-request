import { AxiosInstance } from 'axios';
import { AI_PROVIDERS } from '../../constants/index.js';
export type AIProvider = typeof AI_PROVIDERS[keyof typeof AI_PROVIDERS];
export interface AIConfig {
    provider: AIProvider;
    apiKey: string;
    model?: string;
}
export interface AIResponse {
    content: string;
    provider: AIProvider;
}
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
    protected handleApiError(error: any): never;
}
//# sourceMappingURL=base.d.ts.map