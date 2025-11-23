/**
 * Generic caching layer with TTL support
 */

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

export interface CacheOptions {
    ttl?: number; // Time to live in milliseconds
    maxSize?: number; // Maximum cache size
}

export class Cache<T = any> {
    private cache = new Map<string, CacheEntry<T>>();
    private defaultTTL: number;
    private maxSize: number;

    constructor(options: CacheOptions = {}) {
        this.defaultTTL = options.ttl || 5 * 60 * 1000; // Default 5 minutes
        this.maxSize = options.maxSize || 100;
    }

    /**
     * Get value from cache
     */
    get(key: string): T | undefined {
        const entry = this.cache.get(key);

        if (!entry) {
            return undefined;
        }

        // Check if expired
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return undefined;
        }

        return entry.data;
    }

    /**
     * Set value in cache
     */
    set(key: string, value: T, ttl?: number): void {
        // Enforce max size
        if (this.cache.size >= this.maxSize) {
            // Remove oldest entry
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, {
            data: value,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL
        });
    }

    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean {
        return this.get(key) !== undefined;
    }

    /**
     * Delete entry from cache
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache size
     */
    size(): number {
        return this.cache.size;
    }

    /**
     * Get cache statistics
     */
    getStats(): {
        size: number;
        maxSize: number;
        defaultTTL: number;
        entries: Array<{ key: string; age: number; ttl: number }>;
    } {
        const now = Date.now();
        const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
            key,
            age: now - entry.timestamp,
            ttl: entry.ttl
        }));

        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            defaultTTL: this.defaultTTL,
            entries
        };
    }

    /**
     * Clean up expired entries
     */
    cleanup(): number {
        const now = Date.now();
        let removed = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
                removed++;
            }
        }

        return removed;
    }
}

/**
 * Cache manager for different cache instances
 */
export class CacheManager {
    private static instance: CacheManager;
    private caches = new Map<string, Cache>();

    private constructor() { }

    static getInstance(): CacheManager {
        if (!CacheManager.instance) {
            CacheManager.instance = new CacheManager();
        }
        return CacheManager.instance;
    }

    /**
     * Get or create a cache instance
     */
    getCache<T = any>(name: string, options?: CacheOptions): Cache<T> {
        if (!this.caches.has(name)) {
            this.caches.set(name, new Cache<T>(options));
        }
        return this.caches.get(name) as Cache<T>;
    }

    /**
     * Clear all caches
     */
    clearAll(): void {
        for (const cache of this.caches.values()) {
            cache.clear();
        }
    }

    /**
     * Cleanup all caches (remove expired entries)
     */
    cleanupAll(): number {
        let total = 0;
        for (const cache of this.caches.values()) {
            total += cache.cleanup();
        }
        return total;
    }

    /**
     * Get statistics for all caches
     */
    getAllStats(): Record<string, ReturnType<Cache['getStats']>> {
        const stats: Record<string, ReturnType<Cache['getStats']>> = {};

        for (const [name, cache] of this.caches.entries()) {
            stats[name] = cache.getStats();
        }

        return stats;
    }
}

/**
 * Decorator for caching method results
 */
export function Cached(cacheName: string, options?: { ttl?: number; keyGenerator?: (...args: any[]) => string }) {
    return function (
        target: any,
        propertyName: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
        const cache = CacheManager.getInstance().getCache(cacheName, { ttl: options?.ttl });

        descriptor.value = async function (...args: any[]) {
            // Generate cache key
            const cacheKey = options?.keyGenerator
                ? options.keyGenerator(...args)
                : `${propertyName}:${JSON.stringify(args)}`;

            // Check cache
            const cached = cache.get(cacheKey);
            if (cached !== undefined) {
                return cached;
            }

            // Execute and cache
            const result = await originalMethod.apply(this, args);
            cache.set(cacheKey, result);
            return result;
        };

        return descriptor;
    };
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();
