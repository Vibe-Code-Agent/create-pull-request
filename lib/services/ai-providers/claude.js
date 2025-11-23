import { BaseAIProvider } from './base.js';
import { API_URLS, DEFAULT_MODELS, AI_PROVIDERS, LIMITS } from '../../constants/index.js';
export class ClaudeProvider extends BaseAIProvider {
    constructor(apiKey, model) {
        super(AI_PROVIDERS.CLAUDE, apiKey, model);
    }
    getDefaultModel() {
        return DEFAULT_MODELS.CLAUDE;
    }
    getHeaders() {
        return {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
        };
    }
    getApiUrl() {
        return `${API_URLS.CLAUDE_BASE_URL}/v1/messages`;
    }
    buildRequestBody(prompt, stream = false) {
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
    extractContentFromResponse(response) {
        if (!response.content?.[0]?.text) {
            throw new Error('No content received from Claude API');
        }
        return response.content[0].text;
    }
    /**
     * Generate content with true streaming support for Claude
     */
    async generateContentStream(prompt, onChunk) {
        try {
            const requestBody = this.buildRequestBody(prompt, true);
            const response = await this.client.post(this.getApiUrl(), requestBody, {
                responseType: 'stream'
            });
            let fullContent = '';
            // Handle streaming response
            return new Promise((resolve, reject) => {
                response.data.on('data', (chunk) => {
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
                            }
                            catch (e) {
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
                response.data.on('error', (error) => {
                    reject(error);
                });
            });
        }
        catch (error) {
            this.handleApiError(error);
        }
    }
}
//# sourceMappingURL=claude.js.map