import { JiraTicket } from '../atlassian-facade.js';
import { GitChanges, FileChange } from '../git.js';
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

export class PromptBuilder {
  buildPrompt(options: PromptBuilderOptions): string {
    const { jiraTicket, gitChanges, template, diffContent, repoInfo } = options;

    let prompt = this.buildPromptHeader();
    prompt += this.buildJiraTicketSection(jiraTicket);
    prompt += this.buildConfluencePagesSection(jiraTicket);
    prompt += this.buildGitChangesSection(gitChanges);
    prompt += this.buildFileDetailsSection(gitChanges, jiraTicket, repoInfo);
    prompt += this.buildDiffContentSection(diffContent);
    prompt += this.buildTemplateSection(template);
    prompt += this.buildInstructionsSection(jiraTicket, template);

    return prompt;
  }

  private buildPromptHeader(): string {
    let prompt = `You are an expert software engineer helping to create a comprehensive pull request description. `;
    prompt += `Please analyze the following information and generate a well-structured pull request description.\n\n`;
    return prompt;
  }

  private buildJiraTicketSection(jiraTicket: JiraTicket): string {
    let prompt = `## Jira Ticket Information:\n`;
    prompt += `- **Jira Ticket**: [${jiraTicket.key}](${jiraTicket.url}) - ${jiraTicket.summary}\n`;
    prompt += `- **Type**: ${jiraTicket.issueType}\n`;
    prompt += `- **Status**: ${jiraTicket.status}\n`;
    prompt += `- **Assignee**: ${jiraTicket.assignee || 'Unassigned'}\n`;
    prompt += `- **Reporter**: ${jiraTicket.reporter}\n`;

    if (jiraTicket.description) {
      prompt += `- **Description**: ${jiraTicket.description}\n`;
    }

    if (jiraTicket.parentTicket) {
      prompt += `- **Parent Ticket**: [${jiraTicket.parentTicket.key}](${jiraTicket.parentTicket.url}) - ${jiraTicket.parentTicket.summary}\n`;
    }

    return prompt;
  }

  private buildConfluencePagesSection(jiraTicket: JiraTicket): string {
    if (!jiraTicket.confluencePages || jiraTicket.confluencePages.length === 0) {
      return '';
    }

    let prompt = `\n## Related Documentation:\n`;
    for (const page of jiraTicket.confluencePages) {
      prompt += `- **${page.title}**: ${page.content.substring(0, 200)}...\n`;
      prompt += `  Source: ${page.url}\n`;
    }
    return prompt;
  }

  private buildGitChangesSection(gitChanges: GitChanges): string {
    let prompt = `\n## Code Changes:\n`;
    prompt += `- **Total Files Changed**: ${gitChanges.totalFiles}\n`;
    prompt += `- **Total Insertions**: ${gitChanges.totalInsertions}\n`;
    prompt += `- **Total Deletions**: ${gitChanges.totalDeletions}\n`;

    if (gitChanges.commits && gitChanges.commits.length > 0) {
      prompt += `- **Commits**: ${gitChanges.commits.join(', ')}\n`;
    }

    return prompt;
  }

  private buildFileDetailsSection(gitChanges: GitChanges, jiraTicket: JiraTicket, repoInfo?: { owner: string; repo: string; currentBranch: string }): string {
    let prompt = `\n## Files Modified:\n`;
    for (const file of gitChanges.files) {
      prompt += this.buildFileDetail(file, jiraTicket, repoInfo);
    }
    return prompt;
  }

  private buildFileDetail(file: FileChange, jiraTicket: JiraTicket, repoInfo?: { owner: string; repo: string; currentBranch: string }): string {
    let prompt = `- **${file.file}** (${file.status})\n`;
    prompt += `  - Changes: ${file.changes} lines\n`;
    prompt += `  - Insertions: ${file.insertions}\n`;
    prompt += `  - Deletions: ${file.deletions}\n`;

    if (repoInfo && file.lineNumbers) {
      prompt += this.buildFileLinks(file, repoInfo);
    }

    const relevance = this.getFileRelevanceDescription(file, jiraTicket);
    if (relevance) {
      prompt += `  - Relevance: ${relevance}\n`;
    }

    return prompt;
  }

  private buildFileLinks(file: FileChange, repoInfo: { owner: string; repo: string; currentBranch: string }): string {
    const fileUrl = this.generateFileUrl(repoInfo, file.file);
    let prompt = `  - File: ${fileUrl}\n`;

    if (file.lineNumbers!.added.length > 0) {
      const addedLinks = this.generateLineLinks(repoInfo, file.file, file.lineNumbers!.added);
      prompt += `  - Added lines: ${addedLinks}\n`;
    }

    if (file.lineNumbers!.removed.length > 0) {
      const removedLinks = this.generateLineLinks(repoInfo, file.file, file.lineNumbers!.removed);
      prompt += `  - Removed lines: ${removedLinks}\n`;
    }

    return prompt;
  }

  private buildDiffContentSection(diffContent?: string): string {
    if (!diffContent) {
      return '';
    }

    if (diffContent.length < 10000) {
      return `\n## Code Diff:\n\`\`\`diff\n${diffContent}\n\`\`\`\n`;
    } else {
      const diffSummary = this.extractDiffSummary(diffContent);
      return `\n## Code Diff Summary:\n${diffSummary.join('\n')}\n`;
    }
  }

  private buildTemplateSection(template?: PullRequestTemplate): string {
    let prompt = '';

    if (template) {
      prompt += `\n## Template Context:\n`;
      prompt += `Use this template as a guide for the structure:\n`;
      prompt += `\`\`\`\n${template.content}\n\`\`\`\n`;
    }

    return prompt;
  }

  private buildInstructionsSection(jiraTicket: JiraTicket, template?: PullRequestTemplate): string {
    let prompt = `\n## Instructions:\n`;
    prompt += `Please generate a comprehensive pull request description following these guidelines:\n\n`;
    
    // Template-specific instructions
    if (template) {
      prompt += `### 🎯 CRITICAL: Template Structure Requirements\n`;
      prompt += `**YOU MUST STRICTLY FOLLOW THE PULL REQUEST TEMPLATE PROVIDED ABOVE.**\n\n`;
      prompt += `Template Compliance Rules:\n`;
      prompt += `1. **Use the EXACT section headings** from the template (e.g., ## Summary, ## Changes, etc.)\n`;
      prompt += `2. **Follow the EXACT structure and order** of sections as defined in the template\n`;
      prompt += `3. **Fill in ALL sections** that are present in the template - do not skip any\n`;
      prompt += `4. **Preserve any markdown formatting** (headers, lists, emphasis) from the template\n`;
      prompt += `5. **If the template has placeholders or examples**, replace them with actual content\n`;
      prompt += `6. **Do not add extra sections** that are not in the template\n`;
      prompt += `7. **Do not remove or rename sections** from the template\n`;
      prompt += `8. The template structure is MANDATORY and takes precedence over any other formatting preferences\n\n`;
      prompt += `⚠️ **Template sections must appear in the description field with their exact headings and structure.**\n\n`;
    }
    
    prompt += `### Title Requirements:\n`;
    prompt += `- **MUST** start with the Jira ticket key: "${jiraTicket.key}"\n`;
    prompt += `- Format: "${jiraTicket.key}: [Clear, descriptive title summarizing the change]"\n`;
    prompt += `- Example: "${jiraTicket.key}: Implement user authentication with OAuth2"\n`;
    prompt += `- Keep it concise but descriptive (max 72 characters)\n\n`;
    
    prompt += `### Summary Requirements:\n`;
    prompt += `- Provide a concise overview of what was changed and why\n`;
    prompt += `- Focus on the key modifications and their purpose\n`;
    prompt += `- Reference the Jira ticket context\n`;
    prompt += `- Keep it brief (2-3 sentences)\n`;
    prompt += `- **DO NOT** include testing steps, verification steps, or proposed changes\n`;
    prompt += `- **DO NOT** include instructions on how to test or verify the changes\n`;
    prompt += `- Focus only on what was implemented, not on future steps\n\n`;
    
    prompt += `### Description Requirements:\n`;
    if (template) {
      prompt += `**IMPORTANT: The description MUST follow the template structure provided above.**\n`;
      prompt += `Use the template sections and fill them with the following information:\n\n`;
    }
    prompt += `1. **Overview**: Brief explanation of the changes and their purpose\n`;
    prompt += `2. **Jira Ticket Context**: Reference the ticket description and requirements\n`;
    prompt += `3. **File Changes Analysis**: For each modified file, provide:\n`;
    prompt += `   - **MUST include URLs to specific line changes** (use the provided line URLs from the context)\n`;
    prompt += `   - Link to the exact lines that were modified, not just the file\n`;
    prompt += `   - What was changed in the file\n`;
    prompt += `   - Why this change was necessary\n`;
    prompt += `   - How it relates to the Jira ticket description\n`;
    prompt += `   - **MUST explain how this change resolves the issue mentioned in the ticket**\n`;
    prompt += `   - Connect the code change to the problem/issue described in the Jira ticket\n`;
    prompt += `   - Any important implementation details\n`;
    prompt += `   - Format: Use markdown links like [filename:L123-L145](URL) for line-specific changes\n`;
    prompt += `   - Example: [src/utils/auth.ts:L45-L67](https://github.com/.../auth.ts#L45-L67)\n`;
    prompt += `4. **Technical Details**: Explain the implementation approach\n`;
    prompt += `5. **Breaking Changes**: List any breaking changes or migration steps (if applicable)\n`;
    prompt += `6. **Formatting**: **DO NOT** include any checklists (- [ ], - [x]) in the description\n`;
    if (template) {
      prompt += `7. **Template Sections**: Map the above information to the appropriate sections in the template\n`;
    }
    prompt += `\n`;
    
    prompt += `### Critical Requirements:\n`;
    if (template) {
      prompt += `- **HIGHEST PRIORITY: Follow the template structure exactly as provided**\n`;
      prompt += `- Use the exact section headings and order from the template\n`;
      prompt += `- Fill all template sections - do not skip any\n`;
    }
    prompt += `- Title MUST begin with "${jiraTicket.key}:"\n`;
    prompt += `- Summary MUST NOT include testing/verification steps or proposed changes\n`;
    prompt += `- **DO NOT include any checklists** (- [ ] or - [x]) anywhere in the description\n`;
    prompt += `- Use prose and paragraphs instead of checklists for all content\n`;
    prompt += `- File changes MUST include URLs to specific line changes (not just file URLs)\n`;
    prompt += `- Use line-specific URLs from the context (e.g., file.ts#L10-L20)\n`;
    prompt += `- File changes MUST be explained in detail, not just listed\n`;
    prompt += `- Changes MUST match and reference the Jira ticket description\n`;
    prompt += `- **MUST explain how each change resolves the issue mentioned in the ticket**\n`;
    prompt += `- Each file modification should explain the "what", "why", and "how"\n`;
    prompt += `- Explicitly connect each code change to the problem/issue described in the ticket\n`;
    prompt += `- Use markdown links [filename:L10-L20](URL) when referencing specific code changes\n`;
    prompt += `- Connect code changes to business requirements from the ticket\n\n`;
    
    prompt += `Format your response as JSON with the following structure:\n`;
    prompt += `\`\`\`json\n`;
    prompt += `{\n`;
    prompt += `  "title": "${jiraTicket.key}: [Your descriptive title here]",\n`;
    prompt += `  "summary": "Brief 2-3 sentence summary of what was implemented and why (no testing steps)",\n`;
    if (template) {
      prompt += `  "description": "MUST follow the template structure with exact section headings and order"\n`;
    } else {
      prompt += `  "description": "Comprehensive description with detailed file changes analysis"\n`;
    }
    prompt += `}\n`;
    prompt += `\`\`\`\n`;

    return prompt;
  }

  private generateFileUrl(repoInfo: { owner: string; repo: string; currentBranch: string }, filePath: string): string {
    return `https://github.com/${repoInfo.owner}/${repoInfo.repo}/blob/${repoInfo.currentBranch}/${filePath}`;
  }

  private generateLineUrl(repoInfo: { owner: string; repo: string; currentBranch: string }, filePath: string, lineNumber: number): string {
    return `https://github.com/${repoInfo.owner}/${repoInfo.repo}/blob/${repoInfo.currentBranch}/${filePath}#L${lineNumber}`;
  }

  private generateLineLinks(repoInfo: { owner: string; repo: string; currentBranch: string }, filePath: string, lineNumbers: number[]): string {
    return lineNumbers
      .slice(0, 10) // Limit to first 10 line numbers to avoid overly long URLs
      .map(lineNumber => this.generateLineUrl(repoInfo, filePath, lineNumber))
      .join(', ');
  }

  private getFileRelevanceDescription(file: FileChange, jiraTicket: JiraTicket): string {
    const fileName = file.file.toLowerCase();
    const ticketSummary = jiraTicket.summary.toLowerCase();
    // Ensure description is a string before calling toLowerCase()
    const ticketDescription = (typeof jiraTicket.description === 'string' ? jiraTicket.description : '').toLowerCase();

    // Check for keyword matches
    const keywords = [
      'test', 'spec', 'specification',
      'config', 'configuration',
      'readme', 'documentation', 'docs',
      'migration', 'migrate',
      'api', 'endpoint', 'route',
      'component', 'module', 'service',
      'database', 'db', 'model', 'schema',
      'ui', 'frontend', 'backend',
      'security', 'auth', 'authentication',
      'performance', 'optimization', 'cache'
    ];

    for (const keyword of keywords) {
      if (fileName.includes(keyword) || ticketSummary.includes(keyword) || ticketDescription.includes(keyword)) {
        return `Contains ${keyword}-related changes`;
      }
    }

    // Check for test files
    if (fileName.includes('test') || fileName.includes('spec')) {
      return 'Test file modifications';
    }

    // Check for configuration files
    if (fileName.includes('config') || fileName.includes('.json') || fileName.includes('.yaml') || fileName.includes('.yml')) {
      return 'Configuration file changes';
    }

    return '';
  }

  private extractDiffSummary(diffContent: string): string[] {
    const lines = diffContent.split('\n');
    const summary: string[] = [];
    let currentFile = '';
    let addedLines = 0;
    let removedLines = 0;

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        if (currentFile && (addedLines > 0 || removedLines > 0)) {
          summary.push(`${currentFile}: +${addedLines} -${removedLines}`);
        }
        currentFile = line.split(' ')[3] || 'unknown';
        addedLines = 0;
        removedLines = 0;
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        addedLines++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        removedLines++;
      }
    }

    if (currentFile && (addedLines > 0 || removedLines > 0)) {
      summary.push(`${currentFile}: +${addedLines} -${removedLines}`);
    }

    return summary.slice(0, 20); // Limit to first 20 files
  }
}
