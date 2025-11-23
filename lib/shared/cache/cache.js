/**
 * Generic caching layer with TTL support
 */
export class Cache {
    constructor(options = {}) {
        this.cache = new Map();
        this.defaultTTL = options.ttl || 5 * 60 * 1000; // Default 5 minutes
        this.maxSize = options.maxSize || 100;
    }
    /**
     * Get value from cache
     */
    get(key) {
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
    set(key, value, ttl) {
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
    has(key) {
        return this.get(key) !== undefined;
    }
    /**
     * Delete entry from cache
     */
    delete(key) {
        return this.cache.delete(key);
    }
    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Get cache size
     */
    size() {
        return this.cache.size;
    }
    /**
     * Get cache statistics
     */
    getStats() {
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
    cleanup() {
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
    constructor() {
        this.caches = new Map();
    }
    static getInstance() {
        if (!CacheManager.instance) {
            CacheManager.instance = new CacheManager();
        }
        return CacheManager.instance;
    }
    /**
     * Get or create a cache instance
     */
    getCache(name, options) {
        if (!this.caches.has(name)) {
            this.caches.set(name, new Cache(options));
        }
        return this.caches.get(name);
    }
    /**
     * Clear all caches
     */
    clearAll() {
        for (const cache of this.caches.values()) {
            cache.clear();
        }
    }
    /**
     * Cleanup all caches (remove expired entries)
     */
    cleanupAll() {
        let total = 0;
        for (const cache of this.caches.values()) {
            total += cache.cleanup();
        }
        return total;
    }
    /**
     * Get statistics for all caches
     */
    getAllStats() {
        const stats = {};
        for (const [name, cache] of this.caches.entries()) {
            stats[name] = cache.getStats();
        }
        return stats;
    }
}
/**
 * Decorator for caching method results
 */
export function Cached(cacheName, options) {
    return function (target, propertyName, descriptor) {
        const originalMethod = descriptor.value;
        const cache = CacheManager.getInstance().getCache(cacheName, { ttl: options?.ttl });
        descriptor.value = async function (...args) {
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
//# sourceMappingURL=cache.js.map