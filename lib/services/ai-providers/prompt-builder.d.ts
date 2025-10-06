import { JiraTicket } from '../atlassian-facade.js';
import { GitChanges } from '../git.js';
import { PullRequestTemplate } from '../github.js';
export interface PromptBuilderOptions {
    jiraTicket: JiraTicket;
    gitChanges: GitChanges;
    template?: PullRequestTemplate;
    diffContent?: string;
    prTitle?: string;
    repoInfo?: {
        owner: string;
        repo: string;
        currentBranch: string;
    };
}
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