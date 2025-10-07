import { ConfluencePage, JiraTicket } from '../interface/atlassian.js';
export declare class JiraService {
    private readonly jiraService;
    private readonly confluenceService;
    constructor();
    getTicket(ticketKey: string, fetchConfluence?: boolean): Promise<JiraTicket>;
    /**
     * Check if a Jira ticket has linked Confluence pages
     */
    hasConfluencePages(ticketKey: string): Promise<boolean>;
    /**
     * Get Confluence pages linked to a Jira ticket
     */
    getConfluencePages(ticketKey: string): Promise<ConfluencePage[]>;
    /**
     * Get content of a specific Confluence page
     */
    getConfluencePageContent(pageUrl: string): Promise<ConfluencePage | null>;
}
//# sourceMappingURL=atlassian-facade.d.ts.map