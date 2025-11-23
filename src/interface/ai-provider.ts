import { AI_PROVIDERS } from '../constants/index.js';

export type AIProvider = typeof AI_PROVIDERS[keyof typeof AI_PROVIDERS];

export interface AIConfig {
    provider: AIProvider;
    apiKey: string;
    model?: string;
}

export interface AIResponse {
    content: string;
    provider: AIProvider;
}

export interface AIStreamChunk {
    content: string;
    done: boolean;
    provider: AIProvider;
}

export interface GeneratedPRContent {
    title: string;
    body: string;
    summary: string;
}

export interface PromptBuilderOptions {
    jiraTicket: any; // Will be JiraTicket from atlassian.js
    gitChanges: any; // Will be GitChanges from git.js
    template?: any; // Will be PullRequestTemplate from github.js
    diffContent?: string;
    prTitle?: string;
    repoInfo?: {
        owner: string;
        repo: string;
        currentBranch: string;
    };
}

export interface GenerateDescriptionOptions {
    jiraTicket: any; // Will be JiraTicket from atlassian.js
    gitChanges: any; // Will be GitChanges from git.js
    template?: any; // Will be PullRequestTemplate from github.js
    diffContent?: string;
    prTitle?: string;
    repoInfo?: {
        owner: string;
        repo: string;
        currentBranch: string;
    };
}
