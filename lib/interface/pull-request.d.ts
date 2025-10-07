export interface CreatePROptions {
    jira?: string;
    base?: string;
    title?: string;
    dryRun?: boolean;
    draft?: boolean;
}
export interface GeneratePRDescriptionParams {
    aiDescriptionService: any;
    spinner: any;
    jiraTicket: any;
    gitChanges: any;
    template: any;
    diffContent: string;
    prTitle?: string;
    repoInfo: {
        owner: string;
        repo: string;
        currentBranch: string;
    };
}
export interface GenerateOptions {
    jiraTicket: any;
    gitChanges: any;
    template: any;
    diffContent: string;
    prTitle?: string;
    repoInfo: {
        owner: string;
        repo: string;
        currentBranch: string;
    };
}
//# sourceMappingURL=pull-request.d.ts.map