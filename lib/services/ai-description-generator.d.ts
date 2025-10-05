import { JiraTicket } from './atlassian-facade.js';
import { GitChanges } from './git.js';
import { PullRequestTemplate } from './github.js';
import { GeneratedPRContent } from './ai-providers/response-parser.js';
export { GeneratedPRContent } from './ai-providers/response-parser.js';
export interface GenerateDescriptionOptions {
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
export declare class AIDescriptionGeneratorService {
    private readonly providerManager;
    private readonly promptBuilder;
    private readonly responseParser;
    constructor();
    generatePRDescription(options: GenerateDescriptionOptions): Promise<GeneratedPRContent>;
    private generateSummary;
}
//# sourceMappingURL=ai-description-generator.d.ts.map