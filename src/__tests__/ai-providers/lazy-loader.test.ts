import { AIProviderLazyLoader } from '../../services/ai-providers/lazy-loader.js';
import { AI_PROVIDERS } from '../../constants/index.js';

describe('AIProviderLazyLoader', () => {
    let loader: AIProviderLazyLoader;

    beforeEach(() => {
        loader = new AIProviderLazyLoader();
    });

    afterEach(() => {
        loader.clear();
    });

    describe('loadProvider', () => {
        it('should load Claude provider successfully', async () => {
            const provider = await loader.loadProvider(AI_PROVIDERS.CLAUDE, 'test-key', 'claude-3-sonnet');

            expect(provider).toBeDefined();
            expect(provider['provider']).toBe(AI_PROVIDERS.CLAUDE);
            expect(provider['apiKey']).toBe('test-key');
            expect(provider['model']).toBe('claude-3-sonnet');
        });

        it('should load OpenAI provider successfully', async () => {
            const provider = await loader.loadProvider(AI_PROVIDERS.OPENAI, 'test-key', 'gpt-4');

            expect(provider).toBeDefined();
            expect(provider['provider']).toBe(AI_PROVIDERS.OPENAI);
            expect(provider['apiKey']).toBe('test-key');
            expect(provider['model']).toBe('gpt-4');
        });

        it('should load Gemini provider successfully', async () => {
            const provider = await loader.loadProvider(AI_PROVIDERS.GEMINI, 'test-key', 'gemini-pro');

            expect(provider).toBeDefined();
            expect(provider['provider']).toBe(AI_PROVIDERS.GEMINI);
            expect(provider['apiKey']).toBe('test-key');
            expect(provider['model']).toBe('gemini-pro');
        });

        it('should load Copilot provider successfully', async () => {
            const provider = await loader.loadProvider(AI_PROVIDERS.COPILOT, 'test-key');

            expect(provider).toBeDefined();
            expect(provider['provider']).toBe(AI_PROVIDERS.COPILOT);
            expect(provider['apiKey']).toBe('test-key');
        });

        it('should throw error for unknown provider', async () => {
            await expect(
                loader.loadProvider('unknown' as any, 'test-key')
            ).rejects.toThrow('Unknown AI provider: unknown');
        });

        it('should cache loaded providers', async () => {
            const provider1 = await loader.loadProvider(AI_PROVIDERS.CLAUDE, 'test-key');
            const provider2 = await loader.loadProvider(AI_PROVIDERS.CLAUDE, 'test-key');

            expect(provider1).toBe(provider2);
            expect(loader.isLoaded(AI_PROVIDERS.CLAUDE)).toBe(true);
        });

        it('should handle concurrent loads of same provider', async () => {
            const promise1 = loader.loadProvider(AI_PROVIDERS.CLAUDE, 'test-key');
            const promise2 = loader.loadProvider(AI_PROVIDERS.CLAUDE, 'test-key');
            const promise3 = loader.loadProvider(AI_PROVIDERS.CLAUDE, 'test-key');

            const [provider1, provider2, provider3] = await Promise.all([promise1, promise2, promise3]);

            expect(provider1).toBe(provider2);
            expect(provider2).toBe(provider3);
            expect(loader.isLoaded(AI_PROVIDERS.CLAUDE)).toBe(true);
        });

        it('should load different providers independently', async () => {
            const claude = await loader.loadProvider(AI_PROVIDERS.CLAUDE, 'claude-key');
            const openai = await loader.loadProvider(AI_PROVIDERS.OPENAI, 'openai-key');
            const gemini = await loader.loadProvider(AI_PROVIDERS.GEMINI, 'gemini-key');

            expect(claude).not.toBe(openai);
            expect(openai).not.toBe(gemini);
            expect(loader.isLoaded(AI_PROVIDERS.CLAUDE)).toBe(true);
            expect(loader.isLoaded(AI_PROVIDERS.OPENAI)).toBe(true);
            expect(loader.isLoaded(AI_PROVIDERS.GEMINI)).toBe(true);
        });

        it('should create separate instances for same provider with different credentials', async () => {
            const provider1 = await loader.loadProvider(AI_PROVIDERS.CLAUDE, 'key1', 'model1');
            const provider2 = await loader.loadProvider(AI_PROVIDERS.CLAUDE, 'key2', 'model2');
            const provider3 = await loader.loadProvider(AI_PROVIDERS.CLAUDE, 'key1', 'model2');

            // Different instances for different credentials/models
            expect(provider1).not.toBe(provider2);
            expect(provider1).not.toBe(provider3);
            expect(provider2).not.toBe(provider3);

            // All are loaded and can be retrieved
            expect(loader.isLoaded(AI_PROVIDERS.CLAUDE, 'key1', 'model1')).toBe(true);
            expect(loader.isLoaded(AI_PROVIDERS.CLAUDE, 'key2', 'model2')).toBe(true);
            expect(loader.isLoaded(AI_PROVIDERS.CLAUDE, 'key1', 'model2')).toBe(true);

            expect(loader.getLoaded(AI_PROVIDERS.CLAUDE, 'key1', 'model1')).toBe(provider1);
            expect(loader.getLoaded(AI_PROVIDERS.CLAUDE, 'key2', 'model2')).toBe(provider2);
            expect(loader.getLoaded(AI_PROVIDERS.CLAUDE, 'key1', 'model2')).toBe(provider3);
        });

        it('should cache same provider with same credentials and model', async () => {
            const provider1 = await loader.loadProvider(AI_PROVIDERS.CLAUDE, 'test-key', 'test-model');
            const provider2 = await loader.loadProvider(AI_PROVIDERS.CLAUDE, 'test-key', 'test-model');

            // Same instance for same credentials and model
            expect(provider1).toBe(provider2);
            expect(loader.isLoaded(AI_PROVIDERS.CLAUDE, 'test-key', 'test-model')).toBe(true);
        });
    });

    describe('isLoaded', () => {
        it('should return false for unloaded provider', () => {
            expect(loader.isLoaded(AI_PROVIDERS.CLAUDE)).toBe(false);
        });

        it('should return true for loaded provider', async () => {
            await loader.loadProvider(AI_PROVIDERS.CLAUDE, 'test-key');

            expect(loader.isLoaded(AI_PROVIDERS.CLAUDE)).toBe(true);
        });

        it('should return false after clear', async () => {
            await loader.loadProvider(AI_PROVIDERS.CLAUDE, 'test-key');
            expect(loader.isLoaded(AI_PROVIDERS.CLAUDE)).toBe(true);

            loader.clear();

            expect(loader.isLoaded(AI_PROVIDERS.CLAUDE)).toBe(false);
        });
    });

    describe('getLoaded', () => {
        it('should return undefined for unloaded provider', () => {
            expect(loader.getLoaded(AI_PROVIDERS.CLAUDE)).toBeUndefined();
        });

        it('should return provider instance for loaded provider', async () => {
            const provider = await loader.loadProvider(AI_PROVIDERS.CLAUDE, 'test-key');
            const loaded = loader.getLoaded(AI_PROVIDERS.CLAUDE);

            expect(loaded).toBe(provider);
            expect(loaded).toBeDefined();
        });

        it('should not trigger loading', () => {
            const loaded = loader.getLoaded(AI_PROVIDERS.CLAUDE);

            expect(loaded).toBeUndefined();
            expect(loader.isLoaded(AI_PROVIDERS.CLAUDE)).toBe(false);
        });
    });

    describe('clear', () => {
        it('should clear all loaded providers', async () => {
            await loader.loadProvider(AI_PROVIDERS.CLAUDE, 'claude-key');
            await loader.loadProvider(AI_PROVIDERS.OPENAI, 'openai-key');

            expect(loader.isLoaded(AI_PROVIDERS.CLAUDE)).toBe(true);
            expect(loader.isLoaded(AI_PROVIDERS.OPENAI)).toBe(true);

            loader.clear();

            expect(loader.isLoaded(AI_PROVIDERS.CLAUDE)).toBe(false);
            expect(loader.isLoaded(AI_PROVIDERS.OPENAI)).toBe(false);
        });

        it('should allow reloading after clear', async () => {
            const provider1 = await loader.loadProvider(AI_PROVIDERS.CLAUDE, 'test-key');

            loader.clear();

            const provider2 = await loader.loadProvider(AI_PROVIDERS.CLAUDE, 'test-key');

            expect(provider1).not.toBe(provider2);
            expect(loader.isLoaded(AI_PROVIDERS.CLAUDE)).toBe(true);
        });
    });

    describe('error handling', () => {
        it('should clean up loading promises on error', async () => {
            await expect(
                loader.loadProvider('invalid' as any, 'test-key')
            ).rejects.toThrow();

            // Should not have a loading promise after error
            expect(loader['loadingPromises'].size).toBe(0);
        });

        it('should not cache provider instance on load error', async () => {
            await expect(
                loader.loadProvider('invalid' as any, 'test-key')
            ).rejects.toThrow();

            expect(loader.isLoaded('invalid' as any)).toBe(false);
            expect(loader.getLoaded('invalid' as any)).toBeUndefined();
        });
    });

    describe('memory management', () => {
        it('should not create multiple instances for sequential loads', async () => {
            const provider1 = await loader.loadProvider(AI_PROVIDERS.CLAUDE, 'test-key');
            const provider2 = await loader.loadProvider(AI_PROVIDERS.CLAUDE, 'test-key');
            const provider3 = await loader.loadProvider(AI_PROVIDERS.CLAUDE, 'test-key');

            expect(provider1).toBe(provider2);
            expect(provider2).toBe(provider3);
        });

        it('should handle mixed sequential and concurrent loads', async () => {
            const provider1 = await loader.loadProvider(AI_PROVIDERS.CLAUDE, 'test-key');

            const promise2 = loader.loadProvider(AI_PROVIDERS.CLAUDE, 'test-key');
            const promise3 = loader.loadProvider(AI_PROVIDERS.CLAUDE, 'test-key');

            const [provider2, provider3] = await Promise.all([promise2, promise3]);

            expect(provider1).toBe(provider2);
            expect(provider2).toBe(provider3);
        });
    });
});
