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
export interface GeneratedPRContent {
    title: string;
    body: string;
    summary: string;
}
export interface PromptBuilderOptions {
    jiraTicket: any;
    gitChanges: any;
    template?: any;
    diffContent?: string;
    prTitle?: string;
    repoInfo?: {
        owner: string;
        repo: string;
        currentBranch: string;
    };
}
export interface GenerateDescriptionOptions {
    jiraTicket: any;
    gitChanges: any;
    template?: any;
    diffContent?: string;
    prTitle?: string;
    repoInfo?: {
        owner: string;
        repo: string;
        currentBranch: string;
    };
}
//# sourceMappingURL=ai.d.ts.map