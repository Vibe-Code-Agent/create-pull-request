/**
 * Retry utility with exponential backoff
 */

export interface RetryOptions {
    maxAttempts?: number;
    initialDelay?: number; // milliseconds
    maxDelay?: number; // milliseconds
    backoffMultiplier?: number;
    shouldRetry?: (error: Error, attempt: number) => boolean;
    onRetry?: (error: Error, attempt: number, delay: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    shouldRetry: () => true,
    onRetry: () => { }
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
    const exponentialDelay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1);
    // Add deterministic ±10% jitter based on attempt number
    const jitterFactor = 0.9 + ((attempt * 7) % 21) * 0.01; // Cycles through 0.9 to 1.1
    const delayWithJitter = exponentialDelay * jitterFactor;
    return Math.min(delayWithJitter, options.maxDelay);
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: Error;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            const isLastAttempt = attempt === opts.maxAttempts;
            if (isLastAttempt || !opts.shouldRetry(lastError, attempt)) {
                throw lastError;
            }

            const delay = calculateDelay(attempt, opts);
            opts.onRetry(lastError, attempt, delay);
            await sleep(delay);
        }
    }

    throw lastError!;
}

/**
 * Check if error is retryable (network errors, rate limits, timeouts)
 */
export function isRetryableError(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
        return true;
    }

    // HTTP status codes that should be retried
    if (error.response?.status) {
        const status = error.response.status;
        // 429 (Rate Limit), 500, 502, 503, 504
        return status === 429 || (status >= 500 && status < 600);
    }

    return false;
}

/**
 * Retry decorator for class methods
 */
export function Retry(options: RetryOptions = {}) {
    return function (
        target: any,
        propertyName: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            return retry(
                () => originalMethod.apply(this, args),
                {
                    ...options,
                    onRetry: (error, attempt, delay) => {
                        console.log(`Retrying ${propertyName} (attempt ${attempt}) after ${delay}ms due to: ${error.message}`);
                        options.onRetry?.(error, attempt, delay);
                    }
                }
            );
        };

        return descriptor;
    };
}
