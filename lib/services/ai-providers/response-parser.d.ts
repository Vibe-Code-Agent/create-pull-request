import { AIProvider } from './base.js';
export interface GeneratedPRContent {
    title: string;
    body: string;
    summary: string;
}
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