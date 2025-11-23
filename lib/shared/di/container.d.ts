/**
 * Dependency Injection Container
 * Simple IoC container for managing service dependencies
 */
type Constructor<T = any> = new (...args: any[]) => T;
type Factory<T = any> = () => T;
export declare enum ServiceLifetime {
    Singleton = "singleton",
    Transient = "transient"
}
export declare class ServiceContainer {
    private static instance;
    private services;
    private constructor();
    static getInstance(): ServiceContainer;
    /**
     * Register a singleton service
     */
    registerSingleton<T>(key: string | Constructor<T>, factory: Factory<T>): void;
    /**
     * Register a transient service (new instance every time)
     */
    registerTransient<T>(key: string | Constructor<T>, factory: Factory<T>): void;
    /**
     * Register a class with automatic instantiation
     */
    registerClass<T>(key: string | Constructor<T>, classConstructor: Constructor<T>, lifetime?: ServiceLifetime): void;
    /**
     * Resolve a service
     */
    resolve<T>(key: string | Constructor<T>): T;
    /**
     * Check if service is registered
     */
    has(key: string | Constructor): boolean;
    /**
     * Clear all services
     */
    clear(): void;
    /**
     * Clear singleton instances (useful for testing)
     */
    clearInstances(): void;
    /**
     * Get service key name for error messages
     */
    private getKeyName;
}
/**
 * Service keys for type-safe resolution
 */
export declare const ServiceKeys: {
    readonly JIRA_SERVICE: "JiraService";
    readonly GITHUB_SERVICE: "GitHubService";
    readonly GIT_SERVICE: "GitService";
    readonly AI_DESCRIPTION_SERVICE: "AIDescriptionGeneratorService";
    readonly AI_PROVIDER_MANAGER: "AIProviderManager";
    readonly PROMPT_BUILDER: "PromptBuilder";
    readonly RESPONSE_PARSER: "ResponseParser";
};
export declare const container: ServiceContainer;
export {};
//# sourceMappingURL=container.d.ts.map