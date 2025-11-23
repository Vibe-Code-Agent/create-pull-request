import { ServiceContainer, ServiceKeys, ServiceLifetime } from '../../shared/di/container.js';

describe('ServiceContainer', () => {
    let container: ServiceContainer;

    beforeEach(() => {
        container = ServiceContainer.getInstance();
        container.clear();
    });

    describe('getInstance', () => {
        it('should return singleton instance', () => {
            const instance1 = ServiceContainer.getInstance();
            const instance2 = ServiceContainer.getInstance();

            expect(instance1).toBe(instance2);
        });
    });

    describe('registerSingleton', () => {
        it('should register singleton service', () => {
            const factory = jest.fn(() => ({ name: 'test' }));

            container.registerSingleton('test-service', factory);

            expect(container.has('test-service')).toBe(true);
        });

        it('should return same instance for multiple resolves', () => {
            const factory = jest.fn(() => ({ name: 'test', value: Math.random() }));

            container.registerSingleton('test-service', factory);

            const instance1 = container.resolve('test-service');
            const instance2 = container.resolve('test-service');

            expect(instance1).toBe(instance2);
            expect(factory).toHaveBeenCalledTimes(1);
        });
    });

    describe('registerTransient', () => {
        it('should register transient service', () => {
            const factory = jest.fn(() => ({ name: 'test' }));

            container.registerTransient('test-service', factory);

            expect(container.has('test-service')).toBe(true);
        });

        it('should return different instances for multiple resolves', () => {
            const factory = jest.fn(() => ({ name: 'test', value: Math.random() }));

            container.registerTransient('test-service', factory);

            const instance1 = container.resolve('test-service');
            const instance2 = container.resolve('test-service');

            expect(instance1).not.toBe(instance2);
            expect(factory).toHaveBeenCalledTimes(2);
        });
    });

    describe('registerClass', () => {
        class TestClass {
            name = 'test';
            value = Math.random();
        }

        it('should register class as singleton by default', () => {
            container.registerClass('test-service', TestClass);

            const instance1 = container.resolve<TestClass>('test-service');
            const instance2 = container.resolve<TestClass>('test-service');

            expect(instance1).toBeInstanceOf(TestClass);
            expect(instance1).toBe(instance2);
        });

        it('should register class as transient when specified', () => {
            container.registerClass('test-service', TestClass, ServiceLifetime.Transient);

            const instance1 = container.resolve<TestClass>('test-service');
            const instance2 = container.resolve<TestClass>('test-service');

            expect(instance1).toBeInstanceOf(TestClass);
            expect(instance1).not.toBe(instance2);
        });

        it('should use class constructor reference as key', () => {
            container.registerClass(TestClass, TestClass);

            const instance = container.resolve<TestClass>(TestClass);

            expect(instance).toBeInstanceOf(TestClass);
        });
    });

    describe('resolve', () => {
        it('should resolve registered service', () => {
            container.registerSingleton('test-service', () => ({ name: 'test' }));

            const instance = container.resolve('test-service');

            expect(instance).toEqual({ name: 'test' });
        });

        it('should throw error for unregistered service', () => {
            expect(() => container.resolve('nonexistent')).toThrow('Service not found: nonexistent');
        });

        it('should resolve service by class constructor', () => {
            class TestClass {
                name = 'test';
            }

            container.registerClass(TestClass, TestClass);

            const instance = container.resolve(TestClass);

            expect(instance).toBeInstanceOf(TestClass);
        });
    });

    describe('has', () => {
        it('should return true for registered service', () => {
            container.registerSingleton('test-service', () => ({ name: 'test' }));

            expect(container.has('test-service')).toBe(true);
        });

        it('should return false for unregistered service', () => {
            expect(container.has('nonexistent')).toBe(false);
        });
    });

    describe('clear', () => {
        it('should remove all registered services', () => {
            container.registerSingleton('service1', () => ({ name: 'test1' }));
            container.registerSingleton('service2', () => ({ name: 'test2' }));

            expect(container.has('service1')).toBe(true);
            expect(container.has('service2')).toBe(true);

            container.clear();

            expect(container.has('service1')).toBe(false);
            expect(container.has('service2')).toBe(false);
        });
    });

    describe('clearInstances', () => {
        it('should clear singleton instances but keep registrations', () => {
            const factory = jest.fn(() => ({ name: 'test', value: Math.random() }));

            container.registerSingleton('test-service', factory);

            const instance1 = container.resolve('test-service');

            container.clearInstances();

            const instance2 = container.resolve('test-service');

            expect(instance1).not.toBe(instance2);
            expect(container.has('test-service')).toBe(true);
            expect(factory).toHaveBeenCalledTimes(2);
        });

        it('should not affect transient services', () => {
            const factory = jest.fn(() => ({ name: 'test' }));

            container.registerTransient('test-service', factory);

            container.resolve('test-service');

            container.clearInstances();

            container.resolve('test-service');

            expect(factory).toHaveBeenCalledTimes(2);
        });
    });

    describe('complex scenarios', () => {
        it('should handle multiple service registrations', () => {
            container.registerSingleton('service1', () => ({ name: 'service1' }));
            container.registerSingleton('service2', () => ({ name: 'service2' }));
            container.registerTransient('service3', () => ({ name: 'service3' }));

            expect(container.resolve('service1')).toEqual({ name: 'service1' });
            expect(container.resolve('service2')).toEqual({ name: 'service2' });
            expect(container.resolve('service3')).toEqual({ name: 'service3' });
        });

        it('should handle service dependencies', () => {
            class ServiceA {
                name = 'A';
            }

            class ServiceB {
                constructor(public serviceA: ServiceA) { }
            }

            container.registerClass('ServiceA', ServiceA);
            container.registerSingleton('ServiceB', () => {
                const serviceA = container.resolve<ServiceA>('ServiceA');
                return new ServiceB(serviceA);
            });

            const serviceB = container.resolve<ServiceB>('ServiceB');

            expect(serviceB).toBeInstanceOf(ServiceB);
            expect(serviceB.serviceA).toBeInstanceOf(ServiceA);
        });
    });

    describe('ServiceKeys', () => {
        it('should provide type-safe service keys', () => {
            expect(ServiceKeys.JIRA_SERVICE).toBe('JiraService');
            expect(ServiceKeys.GITHUB_SERVICE).toBe('GitHubService');
            expect(ServiceKeys.GIT_SERVICE).toBe('GitService');
            expect(ServiceKeys.AI_DESCRIPTION_SERVICE).toBe('AIDescriptionGeneratorService');
            expect(ServiceKeys.AI_PROVIDER_MANAGER).toBe('AIProviderManager');
            expect(ServiceKeys.PROMPT_BUILDER).toBe('PromptBuilder');
            expect(ServiceKeys.RESPONSE_PARSER).toBe('ResponseParser');
        });
    });
});
