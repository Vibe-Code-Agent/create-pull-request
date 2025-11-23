/**
 * Generic caching layer with TTL support
 */
export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}
export interface CacheOptions {
    ttl?: number;
    maxSize?: number;
}
export declare class Cache<T = any> {
    private cache;
    private defaultTTL;
    private maxSize;
    constructor(options?: CacheOptions);
    /**
     * Get value from cache
     */
    get(key: string): T | undefined;
    /**
     * Set value in cache
     */
    set(key: string, value: T, ttl?: number): void;
    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean;
    /**
     * Delete entry from cache
     */
    delete(key: string): boolean;
    /**
     * Clear all cache entries
     */
    clear(): void;
    /**
     * Get cache size
     */
    size(): number;
    /**
     * Get cache statistics
     */
    getStats(): {
        size: number;
        maxSize: number;
        defaultTTL: number;
        entries: Array<{
            key: string;
            age: number;
            ttl: number;
        }>;
    };
    /**
     * Clean up expired entries
     */
    cleanup(): number;
}
/**
 * Cache manager for different cache instances
 */
export declare class CacheManager {
    private static instance;
    private caches;
    private constructor();
    static getInstance(): CacheManager;
    /**
     * Get or create a cache instance
     */
    getCache<T = any>(name: string, options?: CacheOptions): Cache<T>;
    /**
     * Clear all caches
     */
    clearAll(): void;
    /**
     * Cleanup all caches (remove expired entries)
     */
    cleanupAll(): number;
    /**
     * Get statistics for all caches
     */
    getAllStats(): Record<string, ReturnType<Cache['getStats']>>;
}
/**
 * Decorator for caching method results
 */
export declare function Cached(cacheName: string, options?: {
    ttl?: number;
    keyGenerator?: (...args: any[]) => string;
}): (target: any, propertyName: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare const cacheManager: CacheManager;
//# sourceMappingURL=cache.d.ts.map