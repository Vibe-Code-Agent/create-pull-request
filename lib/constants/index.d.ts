export declare const API_URLS: {
    readonly CLAUDE_BASE_URL: "https://api.anthropic.com";
    readonly OPENAI_BASE_URL: "https://api.openai.com/v1";
    readonly GEMINI_BASE_URL: "https://generativelanguage.googleapis.com/v1beta";
    readonly COPILOT_BASE_URL: "https://api.githubcopilot.com";
    readonly JIRA_API_VERSION: "/rest/api/3";
};
export declare const DEFAULT_MODELS: {
    readonly CLAUDE: "claude-sonnet-4-20250514";
    readonly OPENAI: "gpt-4o";
    readonly GEMINI: "gemini-1.5-pro";
    readonly COPILOT: "gpt-4o";
};
export declare const LIMITS: {
    readonly API_TIMEOUT_MS: 3000000;
    readonly MAX_API_TOKENS: 4000;
    readonly MAX_PR_TITLE_LENGTH: 256;
    readonly DEFAULT_MAX_DIFF_LINES: 1000;
    readonly MAX_DESCRIPTION_PREVIEW_LENGTH: 500;
    readonly MAX_TEMPLATE_PREVIEW_LENGTH: 800;
    readonly MAX_DIFF_CONTENT_LENGTH: 1000;
    readonly MAX_OVERALL_DIFF_LENGTH: 3000;
    readonly HUNK_HEADER_OFFSET: 10;
    readonly MAX_CONFLUENCE_CONTENT_LENGTH: 2000;
    readonly MAX_CONFLUENCE_PAGES_COUNT: 5;
};
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
};
export declare const CONFIG: {
    readonly DIRECTORY_NAME: ".create-pr";
    readonly FILE_NAME: "env-config.json";
    readonly VERSION: string;
    readonly DEFAULT_BRANCH: "main";
    readonly DEFAULT_REMOTE: "origin";
    readonly CLI_NAME: "create-pr";
    readonly CLI_VERSION: string;
};
export declare const FILE_PATHS: {
    readonly PR_TEMPLATE_PATHS: readonly [".github/PULL_REQUEST_TEMPLATE.md", "PULL_REQUEST_TEMPLATE.md", ".github/PULL_REQUEST_TEMPLATE/default.md"];
};
export declare const REGEX_PATTERNS: {
    readonly JIRA_TICKET: RegExp;
    readonly JIRA_TICKET_FROM_BRANCH: RegExp;
    readonly GITHUB_URL: RegExp;
};
export declare const HEADERS: {
    readonly JSON_CONTENT_TYPE: "application/json";
    readonly USER_AGENT: "create-pr-cli";
};
export declare const JIRA_ENDPOINTS: {
    readonly ISSUE: "/issue/";
    readonly USER: "/myself";
    readonly REMOTE_LINK: "/issue/{issueKey}/remotelink";
};
export declare const CONFLUENCE_ENDPOINTS: {
    readonly API_VERSION: "/rest/api";
    readonly CONTENT: "/content";
    readonly CONTENT_BY_ID: "/content/{id}";
    readonly SEARCH: "/content/search";
};
export declare const AI_PROVIDERS: {
    readonly CLAUDE: "claude";
    readonly OPENAI: "openai";
    readonly GEMINI: "gemini";
    readonly COPILOT: "copilot";
};
export declare const AI_PROVIDER_NAMES: {
    readonly CLAUDE: "Claude (Anthropic)";
    readonly OPENAI: "OpenAI (ChatGPT)";
    readonly GEMINI: "Gemini (Google)";
    readonly COPILOT: "GitHub Copilot";
};
export declare const CONFIG_SECTIONS: {
    readonly JIRA: "jira";
    readonly GITHUB: "github";
    readonly COPILOT: "copilot";
    readonly AI_PROVIDERS: "aiProviders";
};
export declare const ENV_KEYS: {
    readonly JIRA_BASE_URL: "JIRA_BASE_URL";
    readonly JIRA_USERNAME: "JIRA_USERNAME";
    readonly JIRA_API_TOKEN: "JIRA_API_TOKEN";
    readonly JIRA_PROJECT_KEY: "JIRA_PROJECT_KEY";
    readonly GITHUB_TOKEN: "GITHUB_TOKEN";
    readonly DEFAULT_BRANCH: "DEFAULT_BRANCH";
    readonly ANTHROPIC_API_KEY: "ANTHROPIC_API_KEY";
    readonly OPENAI_API_KEY: "OPENAI_API_KEY";
    readonly GEMINI_API_KEY: "GEMINI_API_KEY";
    readonly COPILOT_API_TOKEN: "COPILOT_API_TOKEN";
};
export declare const SYSTEM: {
    readonly EXECUTABLE_PERMISSIONS: "755";
    readonly MIN_NODE_VERSION: ">=18.0.0";
};
//# sourceMappingURL=index.d.ts.map