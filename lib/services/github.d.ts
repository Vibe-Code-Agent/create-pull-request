import { GitHubRepo, PullRequest, PullRequestTemplate } from '../interface/github.js';
export type { GitHubRepo, PullRequest, PullRequestTemplate };
export declare class GitHubService {
    private readonly octokit;
    private readonly git;
    constructor();
    getCurrentRepo(): Promise<GitHubRepo>;
    getPullRequestTemplates(): Promise<PullRequestTemplate[]>;
    private loadPredefinedTemplates;
    private loadDirectoryTemplates;
    private tryLoadTemplate;
    private extractTemplateNameFromPath;
    findExistingPullRequest(repo: GitHubRepo, branch: string): Promise<any | null>;
    updatePullRequest(repo: GitHubRepo, pullNumber: number, pullRequest: Partial<PullRequest>): Promise<any>;
    createOrUpdatePullRequest(repo: GitHubRepo, pullRequest: PullRequest): Promise<{
        data: any;
        isUpdate: boolean;
    }>;
    createPullRequest(repo: GitHubRepo, pullRequest: PullRequest): Promise<any>;
    private validatePullRequestData;
    getCurrentBranch(): Promise<string>;
}
//# sourceMappingURL=github.d.ts.map