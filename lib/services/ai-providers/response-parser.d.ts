import { AIProvider } from './base.js';
import { GeneratedPRContent } from '../../interface/ai-provider.js';
export declare class ResponseParser {
    parseAIResponse(response: any, _provider?: AIProvider): GeneratedPRContent;
    private extractContentFromResponse;
    private parseResponseContent;
    private cleanJSONResponse;
    private extractTitle;
    private extractSummary;
    private generateFallbackSummary;
}
//# sourceMappingURL=response-parser.d.ts.map