/**
 * Performance monitoring and metrics collection
 */
export interface PerformanceMetric {
    name: string;
    duration: number;
    timestamp: number;
    metadata?: Record<string, any>;
}
export declare class PerformanceMonitor {
    private static instance;
    private metrics;
    private enabled;
    private constructor();
    static getInstance(): PerformanceMonitor;
    /**
     * Measure execution time of a function
     */
    measure<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T>;
    /**
     * Record a performance metric
     */
    record(name: string, duration: number, metadata?: Record<string, any>): void;
    /**
     * Get all metrics
     */
    getMetrics(): PerformanceMetric[];
    /**
     * Get metrics by name
     */
    getMetricsByName(name: string): PerformanceMetric[];
    /**
     * Get summary statistics
     */
    getSummary(): Record<string, {
        count: number;
        avg: number;
        min: number;
        max: number;
        total: number;
    }>;
    /**
     * Print performance report
     */
    printReport(): void;
    /**
     * Clear all metrics
     */
    clear(): void;
    /**
     * Enable/disable monitoring
     */
    setEnabled(enabled: boolean): void;
}
/**
 * Decorator for measuring method execution time
 */
export declare function Measure(metricName?: string): (target: any, propertyName: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare const performanceMonitor: PerformanceMonitor;
//# sourceMappingURL=metrics.d.ts.map