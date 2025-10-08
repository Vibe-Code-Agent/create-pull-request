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
    buildRequestBody(prompt) {
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
    extractContentFromResponse(response) {
        if (!response.content?.[0]?.text) {
            throw new Error('No content received from Claude API');
        }
        return response.content[0].text;
    }
}
//# sourceMappingURL=claude.js.map