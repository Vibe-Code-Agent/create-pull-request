/**
 * Retry utility with exponential backoff
 */
export interface RetryOptions {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: Error, attempt: number) => boolean;
    onRetry?: (error: Error, attempt: number, delay: number) => void;
}
/**
 * Retry an async operation with exponential backoff
 */
export declare function retry<T>(operation: () => Promise<T>, options?: RetryOptions): Promise<T>;
/**
 * Check if error is retryable (network errors, rate limits, timeouts)
 */
export declare function isRetryableError(error: any): boolean;
/**
 * Retry decorator for class methods
 */
export declare function Retry(options?: RetryOptions): (target: any, propertyName: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
//# sourceMappingURL=retry.d.ts.map