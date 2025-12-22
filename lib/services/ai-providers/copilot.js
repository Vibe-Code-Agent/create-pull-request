import { BaseAIProvider } from './base.js';
import { AI_PROVIDERS, LIMITS, API_URLS } from '../../constants/index.js';
export class CopilotProvider extends BaseAIProvider {
    constructor(apiKey, model) {
        super(AI_PROVIDERS.COPILOT, apiKey, model);
    }
    getDefaultModel() {
        return 'gpt-4o';
    }
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };
    }
    getApiUrl() {
        return `${API_URLS.COPILOT_BASE_URL}/chat/completions`;
    }
    buildRequestBody(prompt) {
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
    extractContentFromResponse(response) {
        if (!response.choices?.[0]?.message?.content) {
            throw new Error('No content received from Copilot API');
        }
        return response.choices[0].message.content;
    }
}
//# sourceMappingURL=copilot.js.map