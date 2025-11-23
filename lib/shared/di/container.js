/**
 * Dependency Injection Container
 * Simple IoC container for managing service dependencies
 */
export var ServiceLifetime;
(function (ServiceLifetime) {
    ServiceLifetime["Singleton"] = "singleton";
    ServiceLifetime["Transient"] = "transient";
})(ServiceLifetime || (ServiceLifetime = {}));
export class ServiceContainer {
    constructor() {
        this.services = new Map();
    }
    static getInstance() {
        if (!ServiceContainer.instance) {
            ServiceContainer.instance = new ServiceContainer();
        }
        return ServiceContainer.instance;
    }
    /**
     * Register a singleton service
     */
    registerSingleton(key, factory) {
        this.services.set(key, {
            lifetime: ServiceLifetime.Singleton,
            factory
        });
    }
    /**
     * Register a transient service (new instance every time)
     */
    registerTransient(key, factory) {
        this.services.set(key, {
            lifetime: ServiceLifetime.Transient,
            factory
        });
    }
    /**
     * Register a class with automatic instantiation
     */
    registerClass(key, classConstructor, lifetime = ServiceLifetime.Singleton) {
        const factory = () => new classConstructor();
        if (lifetime === ServiceLifetime.Singleton) {
            this.registerSingleton(key, factory);
        }
        else {
            this.registerTransient(key, factory);
        }
    }
    /**
     * Resolve a service
     */
    resolve(key) {
        const descriptor = this.services.get(key);
        if (!descriptor) {
            throw new Error(`Service not found: ${this.getKeyName(key)}`);
        }
        // Return existing singleton instance
        if (descriptor.lifetime === ServiceLifetime.Singleton && descriptor.instance) {
            return descriptor.instance;
        }
        // Create new instance
        const instance = descriptor.factory();
        // Cache singleton instance
        if (descriptor.lifetime === ServiceLifetime.Singleton) {
            descriptor.instance = instance;
        }
        return instance;
    }
    /**
     * Check if service is registered
     */
    has(key) {
        return this.services.has(key);
    }
    /**
     * Clear all services
     */
    clear() {
        this.services.clear();
    }
    /**
     * Clear singleton instances (useful for testing)
     */
    clearInstances() {
        for (const descriptor of this.services.values()) {
            if (descriptor.lifetime === ServiceLifetime.Singleton) {
                delete descriptor.instance;
            }
        }
    }
    /**
     * Get service key name for error messages
     */
    getKeyName(key) {
        if (typeof key === 'string') {
            return key;
        }
        return key.name || 'Unknown';
    }
}
/**
 * Service keys for type-safe resolution
 */
export const ServiceKeys = {
    JIRA_SERVICE: 'JiraService',
    GITHUB_SERVICE: 'GitHubService',
    GIT_SERVICE: 'GitService',
    AI_DESCRIPTION_SERVICE: 'AIDescriptionGeneratorService',
    AI_PROVIDER_MANAGER: 'AIProviderManager',
    PROMPT_BUILDER: 'PromptBuilder',
    RESPONSE_PARSER: 'ResponseParser'
};
// Export singleton instance
export const container = ServiceContainer.getInstance();
//# sourceMappingURL=container.js.map