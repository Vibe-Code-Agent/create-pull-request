import { BaseAIProvider } from './base.js';
import { API_URLS, DEFAULT_MODELS, AI_PROVIDERS, LIMITS } from '../../constants/index.js';
export class OpenAIProvider extends BaseAIProvider {
    constructor(apiKey, model) {
        super(AI_PROVIDERS.OPENAI, apiKey, model);
    }
    getDefaultModel() {
        return DEFAULT_MODELS.OPENAI;
    }
    getHeaders() {
        return {
            'Authorization': `Bearer ${this.apiKey}`
        };
    }
    getApiUrl() {
        return `${API_URLS.OPENAI_BASE_URL}/chat/completions`;
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
            throw new Error('No content received from OpenAI API');
        }
        return response.choices[0].message.content;
    }
}
//# sourceMappingURL=openai.js.map