/**
 * Performance monitoring and metrics collection
 */

export interface PerformanceMetric {
    name: string;
    duration: number;
    timestamp: number;
    metadata?: Record<string, any>;
}

export class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private metrics: PerformanceMetric[] = [];
    private enabled: boolean = process.env.NODE_ENV !== 'production';

    private constructor() { }

    static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    /**
     * Measure execution time of a function
     */
    async measure<T>(
        name: string,
        fn: () => Promise<T>,
        metadata?: Record<string, any>
    ): Promise<T> {
        const start = performance.now();
        try {
            return await fn();
        } finally {
            const duration = performance.now() - start;
            this.record(name, duration, metadata);
        }
    }

    /**
     * Record a performance metric
     */
    record(name: string, duration: number, metadata?: Record<string, any>): void {
        if (!this.enabled) return;

        this.metrics.push({
            name,
            duration,
            timestamp: Date.now(),
            metadata
        });
    }

    /**
     * Get all metrics
     */
    getMetrics(): PerformanceMetric[] {
        return [...this.metrics];
    }

    /**
     * Get metrics by name
     */
    getMetricsByName(name: string): PerformanceMetric[] {
        return this.metrics.filter(m => m.name === name);
    }

    /**
     * Get summary statistics
     */
    getSummary(): Record<string, { count: number; avg: number; min: number; max: number; total: number }> {
        const summary: Record<string, { count: number; avg: number; min: number; max: number; total: number }> = {};

        this.metrics.forEach(metric => {
            if (!summary[metric.name]) {
                summary[metric.name] = {
                    count: 0,
                    avg: 0,
                    min: Infinity,
                    max: -Infinity,
                    total: 0
                };
            }

            const stat = summary[metric.name];
            stat.count++;
            stat.total += metric.duration;
            stat.min = Math.min(stat.min, metric.duration);
            stat.max = Math.max(stat.max, metric.duration);
        });

        // Calculate averages
        Object.values(summary).forEach(stat => {
            stat.avg = stat.total / stat.count;
        });

        return summary;
    }

    /**
     * Print performance report
     */
    printReport(): void {
        if (!this.enabled || this.metrics.length === 0) return;

        console.log('\n📊 Performance Report:');
        console.log('━'.repeat(80));

        const summary = this.getSummary();

        Object.entries(summary).forEach(([name, stats]) => {
            console.log(`\n${name}:`);
            console.log(`  Count: ${stats.count}`);
            console.log(`  Avg:   ${stats.avg.toFixed(2)}ms`);
            console.log(`  Min:   ${stats.min.toFixed(2)}ms`);
            console.log(`  Max:   ${stats.max.toFixed(2)}ms`);
            console.log(`  Total: ${stats.total.toFixed(2)}ms`);
        });

        console.log('\n━'.repeat(80));
    }

    /**
     * Clear all metrics
     */
    clear(): void {
        this.metrics = [];
    }

    /**
     * Enable/disable monitoring
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }
}

/**
 * Decorator for measuring method execution time
 */
export function Measure(metricName?: string) {
    return function (
        target: any,
        propertyName: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
        const name = metricName || `${target.constructor.name}.${propertyName}`;

        descriptor.value = async function (...args: any[]) {
            const monitor = PerformanceMonitor.getInstance();
            return monitor.measure(name, () => originalMethod.apply(this, args));
        };

        return descriptor;
    };
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();
