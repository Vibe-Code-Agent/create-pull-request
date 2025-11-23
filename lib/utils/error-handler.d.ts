export declare class AppError extends Error {
    readonly code?: string | undefined;
    readonly statusCode?: number | undefined;
    readonly isOperational: boolean;
    readonly originalError?: Error | undefined;
    constructor(message: string, code?: string | undefined, statusCode?: number | undefined, isOperational?: boolean, originalError?: Error | undefined);
}
/**
 * Jira API Error with ticket context
 */
export declare class JiraAPIError extends AppError {
    ticketId?: string | undefined;
    constructor(message: string, ticketId?: string | undefined, originalError?: Error);
}
/**
 * GitHub API Error with repository context
 */
export declare class GitHubAPIError extends AppError {
    repoInfo?: {
        owner: string;
        repo: string;
    } | undefined;
    constructor(message: string, repoInfo?: {
        owner: string;
        repo: string;
    } | undefined, originalError?: Error);
}
/**
 * AI Provider Error with provider context
 */
export declare class AIProviderError extends AppError {
    provider?: string | undefined;
    constructor(message: string, provider?: string | undefined, originalError?: Error);
}
/**
 * Configuration Error
 */
export declare class ConfigurationError extends AppError {
    missingKeys?: string[] | undefined;
    constructor(message: string, missingKeys?: string[] | undefined);
}
/**
 * Validation Error
 */
export declare class ValidationError extends AppError {
    field?: string | undefined;
    constructor(message: string, field?: string | undefined);
}
export declare function handleError(error: unknown): void;
export declare function createErrorHandler(context: string): (error: unknown) => never;
export declare const ERROR_CODES: {
    readonly INVALID_CONFIG: "INVALID_CONFIG";
    readonly JIRA_API_ERROR: "JIRA_API_ERROR";
    readonly GITHUB_API_ERROR: "GITHUB_API_ERROR";
    readonly GIT_ERROR: "GIT_ERROR";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly NETWORK_ERROR: "NETWORK_ERROR";
    readonly AUTH_ERROR: "AUTH_ERROR";
};
export declare function createJiraError(message: string, statusCode?: number): AppError;
export declare function createGitHubError(message: string, statusCode?: number): AppError;
export declare function createGitError(message: string): AppError;
export declare function createValidationError(message: string): AppError;
import { ErrorDetails, ExtendedError } from '../interface/common.js';
export declare function createError(message: string, code?: string, details?: any): ExtendedError;
export declare function isAxiosError(error: any): boolean;
export declare function extractErrorDetails(error: any): ErrorDetails;
export declare function formatErrorMessage(error: any): string;
export declare function handleErrorWithPrefix(error: unknown, prefix?: string): never;
//# sourceMappingURL=error-handler.d.ts.map