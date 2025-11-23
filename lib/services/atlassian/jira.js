var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { BaseAtlassianService } from './base.js';
import { API_URLS, JIRA_ENDPOINTS, CONFIG_SECTIONS } from '../../constants/index.js';
import { Cached } from '../../shared/cache/cache.js';
import { Measure } from '../../shared/performance/metrics.js';
export class JiraService extends BaseAtlassianService {
    constructor() {
        super(CONFIG_SECTIONS.JIRA);
        // Override base URL to include Jira API version
        this.client.defaults.baseURL = `${this.config.baseUrl}${API_URLS.JIRA_API_VERSION}`;
    }
    async getTicket(ticketKey) {
        const response = await this.client.get(`${JIRA_ENDPOINTS.ISSUE}${ticketKey}`, {
            params: {
                fields: 'summary,description,issuetype,status,assignee,reporter,created,updated,parent'
            }
        });
        const issue = response.data;
        const fields = issue.fields;
        const parentTicket = await this.fetchParentTicket(fields);
        return this.buildJiraTicket(issue, fields, parentTicket);
    }
    /**
     * Fetch parent ticket information if it exists and is not an Epic
     */
    async fetchParentTicket(fields) {
        if (!fields.parent || fields.issuetype?.name?.toLowerCase() === 'epic') {
            return null;
        }
        const parentResponse = await this.client.get(`${JIRA_ENDPOINTS.ISSUE}${fields.parent.key}`, {
            params: {
                fields: 'summary,issuetype'
            }
        });
        const parentFields = parentResponse.data.fields;
        if (parentFields.summary?.trim()) {
            const parentUrl = this.buildJiraTicketUrl(fields.parent.key);
            return {
                key: fields.parent.key,
                summary: parentFields.summary.trim(),
                issueType: parentFields.issuetype.name,
                url: parentUrl
            };
        }
        return null;
    }
    /**
     * Build the Jira ticket URL
     */
    buildJiraTicketUrl(ticketKey) {
        // Remove the API path from base URL to get the root domain
        let baseUrl = this.config.baseUrl.replace(/\/rest\/api\/\d+\/?$/, '');
        // Remove any trailing slashes
        baseUrl = baseUrl.replace(/\/+$/, '');
        return `${baseUrl}/browse/${ticketKey}`;
    }
    /**
     * Build the JiraTicket object from the fetched data
     */
    buildJiraTicket(issue, fields, parentTicket) {
        const ticketUrl = this.buildJiraTicketUrl(issue.key);
        // Extract description safely - handle both string and object formats
        let description = '';
        if (fields.description) {
            if (typeof fields.description === 'string') {
                description = fields.description;
            }
            else if (fields.description.content?.[0]?.content?.[0]?.text) {
                description = fields.description.content[0].content[0].text;
            }
            else if (typeof fields.description === 'object') {
                // If it's an object but not in the expected format, try to stringify it
                description = JSON.stringify(fields.description);
            }
        }
        return {
            key: issue.key,
            summary: fields.summary,
            description: description,
            issueType: fields.issuetype.name,
            status: fields.status.name,
            assignee: fields.assignee?.displayName || null,
            reporter: fields.reporter.displayName,
            created: fields.created,
            updated: fields.updated,
            url: ticketUrl,
            parentTicket
        };
    }
    /**
     * Check if a Jira ticket has linked Confluence pages
     */
    async hasConfluencePages(ticketKey) {
        const remoteLinksResponse = await this.client.get(JIRA_ENDPOINTS.REMOTE_LINK.replace('{issueKey}', ticketKey));
        const remoteLinks = remoteLinksResponse.data;
        if (!Array.isArray(remoteLinks)) {
            return false;
        }
        // Check if any links are Confluence pages
        return remoteLinks.some((link) => link.object?.url?.includes('confluence') || link.object?.url?.includes('wiki'));
    }
    /**
     * Get remote links from a Jira ticket
     */
    async getRemoteLinks(ticketKey) {
        const remoteLinksResponse = await this.client.get(JIRA_ENDPOINTS.REMOTE_LINK.replace('{issueKey}', ticketKey));
        const remoteLinks = remoteLinksResponse.data;
        return Array.isArray(remoteLinks) ? remoteLinks : [];
    }
}
__decorate([
    Measure('JiraService.getTicket'),
    Cached('jira-tickets', { ttl: 5 * 60 * 1000, keyGenerator: (ticketKey) => ticketKey }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], JiraService.prototype, "getTicket", null);
//# sourceMappingURL=jira.js.map