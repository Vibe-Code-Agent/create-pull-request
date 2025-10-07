export interface JiraTicket {
    key: string;
    summary: string;
    description: string;
    issueType: string;
    status: string;
    assignee: string | null;
    reporter: string;
    created: string;
    updated: string;
    url: string;
    parentTicket?: {
        key: string;
        summary: string;
        issueType: string;
        url: string;
    } | null;
    confluencePages?: ConfluencePage[];
}
export interface ConfluencePage {
    id: string;
    title: string;
    content: string;
    url: string;
}
export interface AtlassianConfig {
    baseUrl: string;
    username: string;
    apiToken: string;
}
//# sourceMappingURL=jira-confluence.d.ts.map