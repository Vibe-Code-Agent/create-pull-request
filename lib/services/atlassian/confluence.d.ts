import { BaseAtlassianService } from './base.js';
import { ConfluencePage } from '../../interface/atlassian.js';
export declare class ConfluenceService extends BaseAtlassianService {
    constructor();
    /**
     * Get Confluence pages linked to a Jira ticket
     */
    getConfluencePages(remoteLinks: any[]): Promise<ConfluencePage[]>;
    /**
     * Get content of a specific Confluence page
     */
    getConfluencePageContent(pageUrl: string): Promise<ConfluencePage | null>;
}
//# sourceMappingURL=confluence.d.ts.map