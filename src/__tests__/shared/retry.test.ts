import { retry, isRetryableError, Retry } from '../../shared/utils/retry.js';

describe('retry', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('successful operations', () => {
        it('should return result on first try', async () => {
            const operation = jest.fn().mockResolvedValue('success');

            const result = await retry(operation);

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(1);
        });

        it('should return result after retry', async () => {
            const operation = jest.fn()
                .mockRejectedValueOnce(new Error('Fail 1'))
                .mockResolvedValue('success');

            const promise = retry(operation, { initialDelay: 10 });
            await jest.runAllTimersAsync();
            const result = await promise;

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(2);
        });
    });

    describe('failed operations', () => {
        it('should throw error after max attempts', async () => {
            const error = new Error('Persistent error');
            const operation = jest.fn().mockRejectedValue(error);

            const promise = retry(operation, { maxAttempts: 3, initialDelay: 10 });
            promise.catch(() => { }); // Prevent unhandled rejection
            await jest.runAllTimersAsync();
            await expect(promise).rejects.toThrow('Persistent error');

            expect(operation).toHaveBeenCalledTimes(3);
        });

        it('should use default max attempts', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Error'));

            const promise = retry(operation, { initialDelay: 10 });
            promise.catch(() => { }); // Prevent unhandled rejection
            await jest.runAllTimersAsync();
            await expect(promise).rejects.toThrow();

            expect(operation).toHaveBeenCalledTimes(3); // Default maxAttempts
        });
    });

    describe('exponential backoff', () => {
        it('should use exponential backoff delays', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Error'));
            const onRetry = jest.fn();

            const promise = retry(operation, {
                maxAttempts: 3,
                initialDelay: 10,
                backoffMultiplier: 2,
                onRetry
            });
            promise.catch(() => { }); // Prevent unhandled rejection
            await jest.runAllTimersAsync();
            await expect(promise).rejects.toThrow();

            expect(operation).toHaveBeenCalledTimes(3);
            expect(onRetry).toHaveBeenCalledTimes(2);

            // Check delays are approximately exponential (with ±10% jitter)
            const firstDelay = onRetry.mock.calls[0][2];
            const secondDelay = onRetry.mock.calls[1][2];

            expect(firstDelay).toBeGreaterThanOrEqual(9); // 10 * 0.9 (min jitter)
            expect(firstDelay).toBeLessThanOrEqual(11); // 10 * 1.1 (max jitter)
            expect(secondDelay).toBeGreaterThanOrEqual(18); // 20 * 0.9
            expect(secondDelay).toBeLessThanOrEqual(22); // 20 * 1.1
        });

        it('should respect max delay', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Error'));
            const onRetry = jest.fn();

            const promise = retry(operation, {
                maxAttempts: 5,
                initialDelay: 100,
                backoffMultiplier: 10,
                maxDelay: 200,
                onRetry
            });
            promise.catch(() => { }); // Prevent unhandled rejection
            await jest.runAllTimersAsync();
            await expect(promise).rejects.toThrow();

            // All delays should be capped at maxDelay
            onRetry.mock.calls.forEach(call => {
                const delay = call[2];
                expect(delay).toBeLessThanOrEqual(200);
            });
        });
    });

    describe('shouldRetry predicate', () => {
        it('should stop retrying when shouldRetry returns false', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Error'));
            const shouldRetry = jest.fn((error, attempt) => attempt < 2);

            const promise = retry(operation, { maxAttempts: 5, shouldRetry });
            promise.catch(() => { }); // Prevent unhandled rejection
            await jest.runAllTimersAsync();
            await expect(promise).rejects.toThrow();

            expect(operation).toHaveBeenCalledTimes(2);
            expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 1);
        });

        it('should continue retrying when shouldRetry returns true', async () => {
            const operation = jest.fn()
                .mockRejectedValueOnce(new Error('Error 1'))
                .mockRejectedValueOnce(new Error('Error 2'))
                .mockResolvedValue('success');

            const shouldRetry = jest.fn().mockReturnValue(true);

            const promise = retry(operation, { maxAttempts: 5, shouldRetry });
            await jest.runAllTimersAsync();
            const result = await promise;

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(3);
            expect(shouldRetry).toHaveBeenCalledTimes(2);
        });
    });

    describe('onRetry callback', () => {
        it('should call onRetry before each retry attempt', async () => {
            const operation = jest.fn()
                .mockRejectedValueOnce(new Error('Error 1'))
                .mockRejectedValueOnce(new Error('Error 2'))
                .mockResolvedValue('success');

            const onRetry = jest.fn();

            const promise = retry(operation, { onRetry });
            await jest.runAllTimersAsync();
            await promise;

            expect(onRetry).toHaveBeenCalledTimes(2);
            expect(onRetry).toHaveBeenNthCalledWith(1, expect.any(Error), 1, expect.any(Number));
            expect(onRetry).toHaveBeenNthCalledWith(2, expect.any(Error), 2, expect.any(Number));
        });
    });

    describe('error handling', () => {
        it('should handle non-Error throws', async () => {
            const operation = jest.fn().mockRejectedValue('string error');

            const promise = retry(operation, { initialDelay: 10 });
            promise.catch(() => { }); // Prevent unhandled rejection
            await jest.runAllTimersAsync();
            await expect(promise).rejects.toThrow('string error');
        });

        it('should preserve original error', async () => {
            const originalError = new Error('Original error');
            const operation = jest.fn().mockRejectedValue(originalError);

            try {
                const promise = retry(operation);
                promise.catch(() => { }); // Prevent unhandled rejection
                await jest.runAllTimersAsync();
                await promise;
            } catch (error) {
                expect(error).toBe(originalError);
            }
        });
    });
});

describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
        expect(isRetryableError({ code: 'ECONNRESET' })).toBe(true);
        expect(isRetryableError({ code: 'ETIMEDOUT' })).toBe(true);
        expect(isRetryableError({ code: 'ENOTFOUND' })).toBe(true);
    });

    it('should identify HTTP 429 as retryable', () => {
        expect(isRetryableError({ response: { status: 429 } })).toBe(true);
    });

    it('should identify 5xx errors as retryable', () => {
        expect(isRetryableError({ response: { status: 500 } })).toBe(true);
        expect(isRetryableError({ response: { status: 502 } })).toBe(true);
        expect(isRetryableError({ response: { status: 503 } })).toBe(true);
        expect(isRetryableError({ response: { status: 504 } })).toBe(true);
    });

    it('should not identify 4xx errors (except 429) as retryable', () => {
        expect(isRetryableError({ response: { status: 400 } })).toBe(false);
        expect(isRetryableError({ response: { status: 401 } })).toBe(false);
        expect(isRetryableError({ response: { status: 403 } })).toBe(false);
        expect(isRetryableError({ response: { status: 404 } })).toBe(false);
    });

    it('should not identify non-network/http errors as retryable', () => {
        expect(isRetryableError(new Error('Generic error'))).toBe(false);
        expect(isRetryableError({ code: 'UNKNOWN' })).toBe(false);
        expect(isRetryableError({ message: 'Error' })).toBe(false);
    });
});

describe('@Retry decorator', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
    });

    class TestService {
        callCount = 0;

        @Retry({ maxAttempts: 3, initialDelay: 10 })
        async operationWithRetry(shouldFail: boolean): Promise<string> {
            this.callCount++;
            if (shouldFail) {
                throw new Error('Operation failed');
            }
            return 'success';
        }

        @Retry({ maxAttempts: 2 })
        async unreliableOperation(): Promise<string> {
            this.callCount++;
            if (this.callCount < 2) {
                throw new Error('Temporary failure');
            }
            return 'success after retry';
        }
    }

    let service: TestService;

    beforeEach(() => {
        service = new TestService();
    });

    it('should retry failed operations', async () => {
        jest.useFakeTimers();
        const promise = service.unreliableOperation();
        await jest.runAllTimersAsync();
        const result = await promise;
        jest.useRealTimers();

        expect(result).toBe('success after retry');
        expect(service.callCount).toBe(2);
    });

    it('should throw after max attempts', async () => {
        jest.useFakeTimers();
        const promise = service.operationWithRetry(true);
        promise.catch(() => { }); // Prevent unhandled rejection
        await jest.runAllTimersAsync();
        await expect(promise).rejects.toThrow('Operation failed');
        jest.useRealTimers();

        expect(service.callCount).toBe(3);
    });

    it('should succeed on first try without retry', async () => {
        const result = await service.operationWithRetry(false);

        expect(result).toBe('success');
        expect(service.callCount).toBe(1);
    });

    it('should log retry attempts', async () => {
        jest.useFakeTimers();
        const promise = service.operationWithRetry(true);
        promise.catch(() => { }); // Prevent unhandled rejection
        await jest.runAllTimersAsync();
        await expect(promise).rejects.toThrow();
        jest.useRealTimers();

        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('Retrying operationWithRetry')
        );
        expect(consoleLogSpy).toHaveBeenCalledTimes(2); // 2 retries
    });

    it('should preserve original method context', async () => {
        class ServiceWithContext {
            value = 'test';

            @Retry({ maxAttempts: 2 })
            async getValue(): Promise<string> {
                return this.value;
            }
        }

        const serviceWithContext = new ServiceWithContext();
        const result = await serviceWithContext.getValue();

        expect(result).toBe('test');
    });
});

describe('custom retry options', () => {
    it('should use custom shouldRetry with decorator', async () => {
        jest.useFakeTimers();
        const shouldRetrySpy = jest.fn().mockReturnValue(false);

        class TestService {
            @Retry({ shouldRetry: shouldRetrySpy })
            async operation(): Promise<void> {
                throw new Error('Error');
            }
        }

        const service = new TestService();

        const promise = service.operation();
        promise.catch(() => { }); // Prevent unhandled rejection
        await jest.runAllTimersAsync();
        await expect(promise).rejects.toThrow();
        jest.useRealTimers();

        expect(shouldRetrySpy).toHaveBeenCalled();
    });

    it('should use custom onRetry with decorator', async () => {
        jest.useFakeTimers();
        const onRetrySpy = jest.fn();

        class TestService {
            callCount = 0;

            @Retry({ maxAttempts: 2, onRetry: onRetrySpy })
            async operation(): Promise<string> {
                this.callCount++;
                if (this.callCount < 2) {
                    throw new Error('Error');
                }
                return 'success';
            }
        }

        const service = new TestService();
        const promise = service.operation();
        await jest.runAllTimersAsync();
        await promise;
        jest.useRealTimers();

        expect(onRetrySpy).toHaveBeenCalledWith(
            expect.any(Error),
            expect.any(Number),
            expect.any(Number)
        );
    });
});
