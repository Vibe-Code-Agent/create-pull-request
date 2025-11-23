import { PerformanceMonitor, Measure, performanceMonitor } from '../../shared/performance/metrics.js';

describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
        monitor = PerformanceMonitor.getInstance();
        monitor.clear();
        monitor.setEnabled(true);
    });

    describe('getInstance', () => {
        it('should return singleton instance', () => {
            const instance1 = PerformanceMonitor.getInstance();
            const instance2 = PerformanceMonitor.getInstance();

            expect(instance1).toBe(instance2);
        });
    });

    describe('measure', () => {
        it('should measure async function execution time', async () => {
            const result = await monitor.measure('test-operation', async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                return 'result';
            });

            expect(result).toBe('result');

            const metrics = monitor.getMetrics();

            expect(metrics).toHaveLength(1);
            expect(metrics[0].name).toBe('test-operation');
            expect(metrics[0].duration).toBeGreaterThanOrEqual(50);
        });

        it('should record metrics with metadata', async () => {
            await monitor.measure('test-operation', async () => 'result', { user: 'test', action: 'fetch' });

            const metrics = monitor.getMetrics();

            expect(metrics[0].metadata).toEqual({ user: 'test', action: 'fetch' });
        });

        it('should record metrics even if function throws', async () => {
            const error = new Error('Test error');

            await expect(
                monitor.measure('test-operation', async () => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    throw error;
                })
            ).rejects.toThrow(error);

            const metrics = monitor.getMetrics();

            expect(metrics).toHaveLength(1);
            expect(metrics[0].name).toBe('test-operation');
            expect(metrics[0].duration).toBeGreaterThanOrEqual(10);
        });
    });

    describe('record', () => {
        it('should record manual metrics', () => {
            monitor.record('manual-operation', 123.45);

            const metrics = monitor.getMetrics();

            expect(metrics).toHaveLength(1);
            expect(metrics[0].name).toBe('manual-operation');
            expect(metrics[0].duration).toBe(123.45);
        });

        it('should record metrics with metadata', () => {
            monitor.record('manual-operation', 100, { type: 'database' });

            const metrics = monitor.getMetrics();

            expect(metrics[0].metadata).toEqual({ type: 'database' });
        });

        it('should not record when disabled', () => {
            monitor.setEnabled(false);

            monitor.record('test-operation', 100);

            expect(monitor.getMetrics()).toHaveLength(0);
        });
    });

    describe('getMetrics', () => {
        it('should return all recorded metrics', () => {
            monitor.record('operation1', 100);
            monitor.record('operation2', 200);
            monitor.record('operation3', 300);

            const metrics = monitor.getMetrics();

            expect(metrics).toHaveLength(3);
            expect(metrics.map(m => m.name)).toEqual(['operation1', 'operation2', 'operation3']);
        });

        it('should return a copy of metrics array', () => {
            monitor.record('operation1', 100);

            const metrics1 = monitor.getMetrics();
            const metrics2 = monitor.getMetrics();

            expect(metrics1).not.toBe(metrics2);
            expect(metrics1).toEqual(metrics2);
        });
    });

    describe('getMetricsByName', () => {
        it('should filter metrics by name', () => {
            monitor.record('operation1', 100);
            monitor.record('operation2', 200);
            monitor.record('operation1', 150);

            const metrics = monitor.getMetricsByName('operation1');

            expect(metrics).toHaveLength(2);
            expect(metrics[0].duration).toBe(100);
            expect(metrics[1].duration).toBe(150);
        });

        it('should return empty array for non-existent name', () => {
            monitor.record('operation1', 100);

            const metrics = monitor.getMetricsByName('nonexistent');

            expect(metrics).toHaveLength(0);
        });
    });

    describe('getSummary', () => {
        it('should calculate summary statistics', () => {
            monitor.record('operation1', 100);
            monitor.record('operation1', 200);
            monitor.record('operation1', 150);
            monitor.record('operation2', 50);

            const summary = monitor.getSummary();

            expect(summary.operation1).toEqual({
                count: 3,
                avg: 150,
                min: 100,
                max: 200,
                total: 450
            });

            expect(summary.operation2).toEqual({
                count: 1,
                avg: 50,
                min: 50,
                max: 50,
                total: 50
            });
        });

        it('should return empty object when no metrics', () => {
            const summary = monitor.getSummary();

            expect(summary).toEqual({});
        });

        it('should handle single metric correctly', () => {
            monitor.record('operation1', 123);

            const summary = monitor.getSummary();

            expect(summary.operation1).toEqual({
                count: 1,
                avg: 123,
                min: 123,
                max: 123,
                total: 123
            });
        });
    });

    describe('printReport', () => {
        let consoleLogSpy: jest.SpyInstance;

        beforeEach(() => {
            consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        });

        afterEach(() => {
            consoleLogSpy.mockRestore();
        });

        it('should print performance report', () => {
            monitor.record('operation1', 100);
            monitor.record('operation1', 200);

            monitor.printReport();

            expect(consoleLogSpy).toHaveBeenCalled();
            expect(consoleLogSpy.mock.calls.some(call =>
                call[0].includes('Performance Report')
            )).toBe(true);
        });

        it('should not print when disabled', () => {
            monitor.setEnabled(false);
            monitor.record('operation1', 100);

            monitor.printReport();

            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        it('should not print when no metrics', () => {
            monitor.printReport();

            expect(consoleLogSpy).not.toHaveBeenCalled();
        });
    });

    describe('clear', () => {
        it('should remove all metrics', () => {
            monitor.record('operation1', 100);
            monitor.record('operation2', 200);

            expect(monitor.getMetrics()).toHaveLength(2);

            monitor.clear();

            expect(monitor.getMetrics()).toHaveLength(0);
        });
    });

    describe('setEnabled', () => {
        it('should enable/disable metric recording', () => {
            monitor.setEnabled(true);
            monitor.record('operation1', 100);

            monitor.setEnabled(false);
            monitor.record('operation2', 200);

            const metrics = monitor.getMetrics();

            expect(metrics).toHaveLength(1);
            expect(metrics[0].name).toBe('operation1');
        });
    });

    describe('timestamp tracking', () => {
        it('should record timestamp for each metric', () => {
            const before = Date.now();

            monitor.record('operation1', 100);

            const after = Date.now();
            const metrics = monitor.getMetrics();

            expect(metrics[0].timestamp).toBeGreaterThanOrEqual(before);
            expect(metrics[0].timestamp).toBeLessThanOrEqual(after);
        });
    });
});

describe('@Measure decorator', () => {
    class TestService {
        @Measure('custom-name')
        async operation1(): Promise<string> {
            await new Promise(resolve => setTimeout(resolve, 50));
            return 'result1';
        }

        @Measure()
        async operation2(): Promise<string> {
            await new Promise(resolve => setTimeout(resolve, 30));
            return 'result2';
        }
    }

    let service: TestService;
    let monitor: PerformanceMonitor;

    beforeEach(() => {
        service = new TestService();
        monitor = PerformanceMonitor.getInstance();
        monitor.clear();
        monitor.setEnabled(true);
    });

    it('should measure method execution time with custom name', async () => {
        const result = await service.operation1();

        expect(result).toBe('result1');

        const metrics = monitor.getMetrics();

        expect(metrics).toHaveLength(1);
        expect(metrics[0].name).toBe('custom-name');
        // setTimeout can execute slightly earlier than specified (typically 0-5ms)
        expect(metrics[0].duration).toBeGreaterThanOrEqual(45);
    });

    it('should measure method execution time with default name', async () => {
        const result = await service.operation2();

        expect(result).toBe('result2');

        const metrics = monitor.getMetrics();

        expect(metrics).toHaveLength(1);
        expect(metrics[0].name).toBe('TestService.operation2');
        // setTimeout can execute slightly earlier than specified (typically 0-5ms)
        expect(metrics[0].duration).toBeGreaterThanOrEqual(25);
    });

    it('should track multiple method calls', async () => {
        await service.operation1();
        await service.operation2();
        await service.operation1();

        const metrics = monitor.getMetrics();

        expect(metrics).toHaveLength(3);
        expect(metrics.filter(m => m.name === 'custom-name')).toHaveLength(2);
        expect(metrics.filter(m => m.name === 'TestService.operation2')).toHaveLength(1);
    });

    it('should preserve method behavior when throwing errors', async () => {
        class ErrorService {
            @Measure()
            async failingOperation(): Promise<void> {
                throw new Error('Test error');
            }
        }

        const errorService = new ErrorService();

        await expect(errorService.failingOperation()).rejects.toThrow('Test error');

        // Metric should still be recorded
        const metrics = monitor.getMetrics();
        expect(metrics).toHaveLength(1);
    });
});

describe('performanceMonitor singleton', () => {
    it('should export singleton instance', () => {
        expect(performanceMonitor).toBe(PerformanceMonitor.getInstance());
    });
});
