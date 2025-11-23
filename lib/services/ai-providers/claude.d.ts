import { BaseAIProvider } from './base.js';
export declare class ClaudeProvider extends BaseAIProvider {
    constructor(apiKey: string, model?: string);
    getDefaultModel(): string;
    getHeaders(): Record<string, string>;
    getApiUrl(): string;
    buildRequestBody(prompt: string, stream?: boolean): any;
    extractContentFromResponse(response: any): string;
    /**
     * Generate content with true streaming support for Claude
     */
    generateContentStream(prompt: string, onChunk?: (chunk: string) => void): Promise<any>;
}
//# sourceMappingURL=claude.d.ts.map