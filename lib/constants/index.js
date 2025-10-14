// Load package.json to get dynamic version
import * as fs from 'node:fs';
import * as path from 'node:path';
// Function to get version from package.json
function getPackageVersion() {
    try {
        // Use process.cwd() as it works in both production and test environments
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
        if (!packageJsonContent) {
            throw new Error('package.json file is empty or could not be read');
        }
        const packageJson = JSON.parse(packageJsonContent);
        if (!packageJson.version) {
            throw new Error('version field not found in package.json');
        }
        return packageJson.version;
    }
    catch (_error) {
        return '1.0.0';
    }
}
// API Configuration
export const API_URLS = {
    CLAUDE_BASE_URL: 'https://api.anthropic.com',
    OPENAI_BASE_URL: 'https://api.openai.com/v1',
    GEMINI_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
    COPILOT_BASE_URL: 'https://api.githubcopilot.com',
    JIRA_API_VERSION: '/rest/api/3'
};
// Default Models
export const DEFAULT_MODELS = {
    CLAUDE: 'claude-sonnet-4-20250514',
    OPENAI: 'gpt-4o',
    GEMINI: 'gemini-1.5-pro',
    COPILOT: 'gpt-4o'
};
// Limits and Timeouts
export const LIMITS = {
    API_TIMEOUT_MS: 3000000,
    MAX_API_TOKENS: 4000,
    MAX_PR_TITLE_LENGTH: 256,
    DEFAULT_MAX_DIFF_LINES: 1000,
    MAX_DESCRIPTION_PREVIEW_LENGTH: 500,
    MAX_TEMPLATE_PREVIEW_LENGTH: 800,
    MAX_DIFF_CONTENT_LENGTH: 1000,
    MAX_OVERALL_DIFF_LENGTH: 3000,
    HUNK_HEADER_OFFSET: 10,
    MAX_CONFLUENCE_CONTENT_LENGTH: 2000,
    MAX_CONFLUENCE_PAGES_COUNT: 5
};
// HTTP Status Codes
export const HTTP_STATUS = {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500
};
// Configuration Constants
export const CONFIG = {
    DIRECTORY_NAME: '.create-pr',
    FILE_NAME: 'env-config.json',
    VERSION: getPackageVersion(),
    DEFAULT_BRANCH: 'main',
    DEFAULT_REMOTE: 'origin',
    CLI_NAME: 'create-pr',
    CLI_VERSION: getPackageVersion()
};
// File System
export const FILE_PATHS = {
    PR_TEMPLATE_PATHS: [
        '.github/PULL_REQUEST_TEMPLATE.md',
        'PULL_REQUEST_TEMPLATE.md',
        '.github/PULL_REQUEST_TEMPLATE/default.md',
        '.github/PULL_REQUEST_TEMPLATE',
        'PULL_REQUEST_TEMPLATE',
    ]
};
// Regular Expressions
export const REGEX_PATTERNS = {
    JIRA_TICKET: /^[A-Z][A-Z0-9]*-\d+$/,
    JIRA_TICKET_FROM_BRANCH: /(?:^|[/\-_])([A-Z][A-Z0-9]*-\d+)(?:[/\-_]|$)/i,
    GITHUB_URL: /github\.com[/:]([\w-]+)\/([\w-]+)(?:\.git)?/
};
// Content Types and Headers
export const HEADERS = {
    JSON_CONTENT_TYPE: 'application/json',
    USER_AGENT: 'create-pr-cli'
};
// JIRA Endpoints
export const JIRA_ENDPOINTS = {
    ISSUE: '/issue/',
    USER: '/myself',
    REMOTE_LINK: '/issue/{issueKey}/remotelink'
};
// Confluence Endpoints
export const CONFLUENCE_ENDPOINTS = {
    API_VERSION: '/rest/api',
    CONTENT: '/content',
    CONTENT_BY_ID: '/content/{id}',
    SEARCH: '/content/search'
};
// AI Provider Constants
export const AI_PROVIDERS = {
    CLAUDE: 'claude',
    OPENAI: 'openai',
    GEMINI: 'gemini',
    COPILOT: 'copilot'
};
// AI Provider Display Names
export const AI_PROVIDER_NAMES = {
    CLAUDE: 'Claude (Anthropic)',
    OPENAI: 'OpenAI (ChatGPT)',
    GEMINI: 'Gemini (Google)',
    COPILOT: 'GitHub Copilot'
};
// Configuration Section Keys
export const CONFIG_SECTIONS = {
    JIRA: 'jira',
    GITHUB: 'github',
    COPILOT: 'copilot',
    AI_PROVIDERS: 'aiProviders'
};
// Environment Variable Keys
export const ENV_KEYS = {
    // Jira Configuration
    JIRA_BASE_URL: 'JIRA_BASE_URL',
    JIRA_USERNAME: 'JIRA_USERNAME',
    JIRA_API_TOKEN: 'JIRA_API_TOKEN',
    JIRA_PROJECT_KEY: 'JIRA_PROJECT_KEY',
    // GitHub Configuration
    GITHUB_TOKEN: 'GITHUB_TOKEN',
    DEFAULT_BRANCH: 'DEFAULT_BRANCH',
    // AI Provider API Keys
    ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',
    OPENAI_API_KEY: 'OPENAI_API_KEY',
    GEMINI_API_KEY: 'GEMINI_API_KEY',
    COPILOT_API_TOKEN: 'COPILOT_API_TOKEN'
};
// System Constants
export const SYSTEM = {
    EXECUTABLE_PERMISSIONS: '755',
    MIN_NODE_VERSION: '>=18.0.0'
};
//# sourceMappingURL=index.js.map
