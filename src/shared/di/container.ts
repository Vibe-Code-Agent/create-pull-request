/**
 * Dependency Injection Container
 * Simple IoC container for managing service dependencies
 */

type Constructor<T = any> = new (...args: any[]) => T;
type Factory<T = any> = () => T;

export enum ServiceLifetime {
    Singleton = 'singleton',
    Transient = 'transient'
}

interface ServiceDescriptor<T = any> {
    lifetime: ServiceLifetime;
    factory: Factory<T>;
    instance?: T;
}

export class ServiceContainer {
    private static instance: ServiceContainer;
    private services = new Map<string | Constructor, ServiceDescriptor>();

    private constructor() { }

    static getInstance(): ServiceContainer {
        if (!ServiceContainer.instance) {
            ServiceContainer.instance = new ServiceContainer();
        }
        return ServiceContainer.instance;
    }

    /**
     * Register a singleton service
     */
    registerSingleton<T>(
        key: string | Constructor<T>,
        factory: Factory<T>
    ): void {
        this.services.set(key, {
            lifetime: ServiceLifetime.Singleton,
            factory
        });
    }

    /**
     * Register a transient service (new instance every time)
     */
    registerTransient<T>(
        key: string | Constructor<T>,
        factory: Factory<T>
    ): void {
        this.services.set(key, {
            lifetime: ServiceLifetime.Transient,
            factory
        });
    }

    /**
     * Register a class with automatic instantiation
     */
    registerClass<T>(
        key: string | Constructor<T>,
        classConstructor: Constructor<T>,
        lifetime: ServiceLifetime = ServiceLifetime.Singleton
    ): void {
        const factory = () => new classConstructor();

        if (lifetime === ServiceLifetime.Singleton) {
            this.registerSingleton(key, factory);
        } else {
            this.registerTransient(key, factory);
        }
    }

    /**
     * Resolve a service
     */
    resolve<T>(key: string | Constructor<T>): T {
        const descriptor = this.services.get(key);

        if (!descriptor) {
            throw new Error(`Service not found: ${this.getKeyName(key)}`);
        }

        // Return existing singleton instance
        if (descriptor.lifetime === ServiceLifetime.Singleton && descriptor.instance) {
            return descriptor.instance as T;
        }

        // Create new instance
        const instance = descriptor.factory();

        // Cache singleton instance
        if (descriptor.lifetime === ServiceLifetime.Singleton) {
            descriptor.instance = instance;
        }

        return instance as T;
    }

    /**
     * Check if service is registered
     */
    has(key: string | Constructor): boolean {
        return this.services.has(key);
    }

    /**
     * Clear all services
     */
    clear(): void {
        this.services.clear();
    }

    /**
     * Clear singleton instances (useful for testing)
     */
    clearInstances(): void {
        for (const descriptor of this.services.values()) {
            if (descriptor.lifetime === ServiceLifetime.Singleton) {
                delete descriptor.instance;
            }
        }
    }

    /**
     * Get service key name for error messages
     */
    private getKeyName(key: string | Constructor): string {
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
} as const;

// Export singleton instance
export const container = ServiceContainer.getInstance();
