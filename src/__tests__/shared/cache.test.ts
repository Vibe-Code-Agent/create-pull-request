import { Cache, CacheManager, Cached } from '../../shared/cache/cache.js';

describe('Cache', () => {
    let cache: Cache<string>;

    beforeEach(() => {
        cache = new Cache<string>({ ttl: 1000, maxSize: 5 });
    });

    describe('get and set', () => {
        it('should store and retrieve values', () => {
            cache.set('key1', 'value1');

            expect(cache.get('key1')).toBe('value1');
        });

        it('should return undefined for non-existent keys', () => {
            expect(cache.get('nonexistent')).toBeUndefined();
        });

        it('should handle multiple values', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');

            expect(cache.get('key1')).toBe('value1');
            expect(cache.get('key2')).toBe('value2');
            expect(cache.get('key3')).toBe('value3');
        });

        it('should override existing values', () => {
            cache.set('key1', 'value1');
            cache.set('key1', 'value2');

            expect(cache.get('key1')).toBe('value2');
        });

        it('should use custom TTL when provided', () => {
            cache.set('key1', 'value1', 5000);

            const entry = cache['cache'].get('key1');
            expect(entry?.ttl).toBe(5000);
        });
    });

    describe('TTL expiration', () => {
        it('should expire values after TTL', async () => {
            cache.set('key1', 'value1', 100);

            expect(cache.get('key1')).toBe('value1');

            await new Promise(resolve => setTimeout(resolve, 150));

            expect(cache.get('key1')).toBeUndefined();
        });

        it('should not expire values before TTL', async () => {
            cache.set('key1', 'value1', 1000);

            await new Promise(resolve => setTimeout(resolve, 50));

            expect(cache.get('key1')).toBe('value1');
        });

        it('should clean up expired entries on get', async () => {
            cache.set('key1', 'value1', 50);

            await new Promise(resolve => setTimeout(resolve, 100));

            cache.get('key1');

            expect(cache.size()).toBe(0);
        });
    });

    describe('maxSize enforcement', () => {
        it('should enforce max size limit', () => {
            for (let i = 1; i <= 6; i++) {
                cache.set(`key${i}`, `value${i}`);
            }

            expect(cache.size()).toBe(5);
        });

        it('should remove oldest entry when max size reached', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');
            cache.set('key4', 'value4');
            cache.set('key5', 'value5');
            cache.set('key6', 'value6');

            expect(cache.get('key1')).toBeUndefined();
            expect(cache.get('key6')).toBe('value6');
        });
    });

    describe('has', () => {
        it('should return true for existing non-expired keys', () => {
            cache.set('key1', 'value1');

            expect(cache.has('key1')).toBe(true);
        });

        it('should return false for non-existent keys', () => {
            expect(cache.has('nonexistent')).toBe(false);
        });

        it('should return false for expired keys', async () => {
            cache.set('key1', 'value1', 50);

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(cache.has('key1')).toBe(false);
        });
    });

    describe('delete', () => {
        it('should delete existing entries', () => {
            cache.set('key1', 'value1');

            expect(cache.delete('key1')).toBe(true);
            expect(cache.get('key1')).toBeUndefined();
        });

        it('should return false for non-existent entries', () => {
            expect(cache.delete('nonexistent')).toBe(false);
        });
    });

    describe('clear', () => {
        it('should remove all entries', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');

            cache.clear();

            expect(cache.size()).toBe(0);
            expect(cache.get('key1')).toBeUndefined();
            expect(cache.get('key2')).toBeUndefined();
            expect(cache.get('key3')).toBeUndefined();
        });
    });

    describe('size', () => {
        it('should return current cache size', () => {
            expect(cache.size()).toBe(0);

            cache.set('key1', 'value1');
            expect(cache.size()).toBe(1);

            cache.set('key2', 'value2');
            expect(cache.size()).toBe(2);

            cache.delete('key1');
            expect(cache.size()).toBe(1);
        });
    });

    describe('getStats', () => {
        it('should return cache statistics', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2', 2000);

            const stats = cache.getStats();

            expect(stats.size).toBe(2);
            expect(stats.maxSize).toBe(5);
            expect(stats.defaultTTL).toBe(1000);
            expect(stats.entries).toHaveLength(2);
            expect(stats.entries[0].key).toBe('key1');
            expect(stats.entries[0].ttl).toBe(1000);
            expect(stats.entries[1].key).toBe('key2');
            expect(stats.entries[1].ttl).toBe(2000);
        });

        it('should include age information', async () => {
            cache.set('key1', 'value1');

            await new Promise(resolve => setTimeout(resolve, 100));

            const stats = cache.getStats();

            expect(stats.entries[0].age).toBeGreaterThanOrEqual(100);
        });
    });

    describe('cleanup', () => {
        it('should remove expired entries', async () => {
            cache.set('key1', 'value1', 50);
            cache.set('key2', 'value2', 1000);

            await new Promise(resolve => setTimeout(resolve, 100));

            const removed = cache.cleanup();

            expect(removed).toBe(1);
            expect(cache.size()).toBe(1);
            expect(cache.get('key1')).toBeUndefined();
            expect(cache.get('key2')).toBe('value2');
        });

        it('should return 0 when no entries expired', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');

            const removed = cache.cleanup();

            expect(removed).toBe(0);
            expect(cache.size()).toBe(2);
        });
    });

    describe('default options', () => {
        it('should use default TTL and maxSize', () => {
            const defaultCache = new Cache();

            defaultCache.set('key1', 'value1');

            const stats = defaultCache.getStats();

            expect(stats.defaultTTL).toBe(5 * 60 * 1000); // 5 minutes
            expect(stats.maxSize).toBe(100);
        });
    });
});

describe('CacheManager', () => {
    let manager: CacheManager;

    beforeEach(() => {
        manager = CacheManager.getInstance();
        manager.clearAll();
    });

    describe('getInstance', () => {
        it('should return singleton instance', () => {
            const instance1 = CacheManager.getInstance();
            const instance2 = CacheManager.getInstance();

            expect(instance1).toBe(instance2);
        });
    });

    describe('getCache', () => {
        it('should create new cache if not exists', () => {
            const cache = manager.getCache('test');

            expect(cache).toBeDefined();
            expect(cache).toBeInstanceOf(Cache);
        });

        it('should return existing cache', () => {
            const cache1 = manager.getCache('test');
            const cache2 = manager.getCache('test');

            expect(cache1).toBe(cache2);
        });

        it('should create caches with custom options', () => {
            // Clear any existing cache first
            const existingManager = CacheManager.getInstance();
            (existingManager as any).caches.delete('custom-test');

            const cache = manager.getCache('custom-test', { ttl: 10000, maxSize: 50 });

            const stats = cache.getStats();

            expect(stats.defaultTTL).toBe(10000);
            expect(stats.maxSize).toBe(50);
        });

        it('should manage multiple independent caches', () => {
            const cache1 = manager.getCache('cache1');
            const cache2 = manager.getCache('cache2');

            cache1.set('key', 'value1');
            cache2.set('key', 'value2');

            expect(cache1.get('key')).toBe('value1');
            expect(cache2.get('key')).toBe('value2');
        });
    });

    describe('clearAll', () => {
        it('should clear all managed caches', () => {
            const cache1 = manager.getCache('cache1');
            const cache2 = manager.getCache('cache2');

            cache1.set('key1', 'value1');
            cache2.set('key2', 'value2');

            manager.clearAll();

            expect(cache1.size()).toBe(0);
            expect(cache2.size()).toBe(0);
        });
    });

    describe('cleanupAll', () => {
        it('should cleanup all managed caches', async () => {
            // Create fresh caches
            (manager as any).caches.clear();
            const cache1 = manager.getCache('cleanup1', { ttl: 50 });
            const cache2 = manager.getCache('cleanup2', { ttl: 50 });

            cache1.set('key1', 'value1');
            cache2.set('key2', 'value2');

            await new Promise(resolve => setTimeout(resolve, 100));

            const removed = manager.cleanupAll();

            expect(removed).toBe(2);
        });
    });

    describe('getAllStats', () => {
        it('should return stats for all caches', () => {
            const cache1 = manager.getCache('cache1');
            const cache2 = manager.getCache('cache2');

            cache1.set('key1', 'value1');
            cache2.set('key2', 'value2');

            const stats = manager.getAllStats();

            expect(stats.cache1).toBeDefined();
            expect(stats.cache2).toBeDefined();
            expect(stats.cache1.size).toBe(1);
            expect(stats.cache2.size).toBe(1);
        });
    });
});

describe('@Cached decorator', () => {
    // Test service needs fresh instance per test
    const createService = () => {
        class TestService {
            callCount = 0;

            @Cached('test-cache', { ttl: 1000 })
            async expensiveOperation(arg: string): Promise<string> {
                this.callCount++;
                return `result-${arg}`;
            }

            @Cached('test-cache', {
                ttl: 1000,
                keyGenerator: (arg: string) => `custom-${arg}`
            })
            async customKeyOperation(arg: string): Promise<string> {
                this.callCount++;
                return `custom-${arg}`;
            }
        }
        return new TestService();
    };

    let service: ReturnType<typeof createService>;

    beforeEach(() => {
        CacheManager.getInstance().clearAll();
        service = createService();
    });

    it('should cache method results', async () => {
        const result1 = await service.expensiveOperation('test');
        const result2 = await service.expensiveOperation('test');

        expect(result1).toBe('result-test');
        expect(result2).toBe('result-test');
        expect(service.callCount).toBe(1);
    });

    it('should cache different arguments separately', async () => {
        await service.expensiveOperation('arg1');
        await service.expensiveOperation('arg2');

        expect(service.callCount).toBe(2);
    });

    it('should use custom key generator', async () => {
        await service.customKeyOperation('test');
        await service.customKeyOperation('test');

        expect(service.callCount).toBe(1);
    });

    it('should respect TTL', async () => {
        await service.expensiveOperation('test');
        expect(service.callCount).toBe(1);

        await new Promise(resolve => setTimeout(resolve, 1500));

        await service.expensiveOperation('test');

        expect(service.callCount).toBe(2);
    }, 3000);
});
