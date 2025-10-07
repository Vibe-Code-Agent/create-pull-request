import { BaseAtlassianService } from './base.js';
import { JiraTicket } from '../../interface/jira-confluence.js';
export declare class JiraService extends BaseAtlassianService {
    constructor();
    getTicket(ticketKey: string): Promise<JiraTicket>;
    /**
     * Fetch parent ticket information if it exists and is not an Epic
     */
    private fetchParentTicket;
    /**
     * Build the Jira ticket URL
     */
    private buildJiraTicketUrl;
    /**
     * Build the JiraTicket object from the fetched data
     */
    private buildJiraTicket;
    /**
     * Check if a Jira ticket has linked Confluence pages
     */
    hasConfluencePages(ticketKey: string): Promise<boolean>;
    /**
     * Get remote links from a Jira ticket
     */
    getRemoteLinks(ticketKey: string): Promise<any[]>;
}
//# sourceMappingURL=jira.d.ts.map