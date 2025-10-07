import { PromptBuilderOptions } from '../../interface/ai.js';
export type { PromptBuilderOptions };
export declare class PromptBuilder {
    buildPrompt(options: PromptBuilderOptions): string;
    private buildPromptHeader;
    private buildJiraTicketSection;
    private buildConfluencePagesSection;
    private buildGitChangesSection;
    private buildFileDetailsSection;
    private buildFileDetail;
    private buildFileLinks;
    private buildDiffContentSection;
    private buildTemplateSection;
    private buildInstructionsSection;
    private generateFileUrl;
    private generateLineUrl;
    private generateLineLinks;
    private getFileRelevanceDescription;
    private extractDiffSummary;
}
//# sourceMappingURL=prompt-builder.d.ts.map