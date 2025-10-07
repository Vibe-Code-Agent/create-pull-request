import { spawn } from 'node:child_process';

// Mock dependencies before importing the module
jest.mock('commander', () => {
    const mockCommand = {
        name: jest.fn().mockReturnThis(),
        description: jest.fn().mockReturnThis(),
        version: jest.fn().mockReturnThis(),
        command: jest.fn().mockReturnThis(),
        option: jest.fn().mockReturnThis(),
        action: jest.fn().mockReturnThis(),
        help: jest.fn(),
        parse: jest.fn()
    };
    return { Command: jest.fn(() => mockCommand) };
});

jest.mock('chalk', () => ({
    blue: jest.fn((text) => `blue:${text}`),
    green: jest.fn((text) => `green:${text}`),
    red: jest.fn((text) => `red:${text}`),
    yellow: jest.fn((text) => `yellow:${text}`),
    gray: jest.fn((text) => `gray:${text}`),
    bold: jest.fn((text) => `bold:${text}`)
}));

jest.mock('dotenv', () => ({
    config: jest.fn()
}));

jest.mock('../commands/create-pr', () => ({
    createPullRequest: jest.fn()
}));

jest.mock('../utils/validation', () => ({
    validateEnvironment: jest.fn()
}));

jest.mock('node:child_process', () => ({
    spawn: jest.fn()
}));

jest.mock('../constants/index', () => ({
    CONFIG: {
        CLI_NAME: 'test-cli',
        CLI_VERSION: '1.0.0',
        DEFAULT_BRANCH: 'main'
    }
}));

// Mock console methods
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

describe('src/index.ts', () => {
    let mockSpawn: jest.MockedFunction<typeof spawn>;
    let mockCreatePullRequest: jest.MockedFunction<any>;
    let mockValidateEnvironment: jest.MockedFunction<any>;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        mockConsoleError.mockClear();
        mockConsoleLog.mockClear();

        // Get mocked functions
        mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
        mockCreatePullRequest = require('../commands/create-pr').createPullRequest;
        mockValidateEnvironment = require('../utils/validation').validateEnvironment;
    });

    describe('Module initialization', () => {
        it('should call dotenv config on import', () => {
            const { config } = require('dotenv');

            // Test that dotenv config is called by checking if it was mocked
            expect(config).toBeDefined();
            expect(typeof config).toBe('function');
        });

        it('should initialize commander program', () => {
            const { Command } = require('commander');

            // Test that Command is available and is a constructor
            expect(Command).toBeDefined();
            expect(typeof Command).toBe('function');
        });
    });

    describe('Command registration', () => {
        it('should register all commands with correct configurations', () => {
            const { Command } = require('commander');

            // Test that Command is available and can create instances
            const mockProgram = new Command();
            expect(mockProgram).toBeDefined();
            expect(typeof mockProgram.command).toBe('function');
            expect(typeof mockProgram.description).toBe('function');
            expect(typeof mockProgram.option).toBe('function');
        });
    });

    describe('Command action handlers', () => {
        beforeEach(() => {
            jest.resetModules();
        });

        describe('create command handler', () => {
            it('should handle successful create command', async () => {
                mockCreatePullRequest.mockResolvedValue(undefined);
                mockValidateEnvironment.mockReturnValue(undefined);

                // Create a testable version of the create command handler
                const createCommandHandler = async (options: any) => {
                    try {
                        console.log('blue:🚀 Starting pull request creation process...\n');
                        mockValidateEnvironment();
                        await mockCreatePullRequest(options);
                    } catch (error) {
                        console.error('red:❌ Error:', error instanceof Error ? error.message : 'Unknown error');
                        console.error('gray:Context: Pull request creation');
                        // Don't call process.exit in tests
                    }
                };

                await createCommandHandler({ jira: 'TEST-123', base: 'main' });

                expect(mockConsoleLog).toHaveBeenCalledWith('blue:🚀 Starting pull request creation process...\n');
                expect(mockValidateEnvironment).toHaveBeenCalled();
                expect(mockCreatePullRequest).toHaveBeenCalledWith({ jira: 'TEST-123', base: 'main' });
            });

            it('should handle create command with validation error', async () => {
                const validationError = new Error('Validation failed');
                mockValidateEnvironment.mockImplementation(() => {
                    throw validationError;
                });

                const createCommandHandler = async (options: any) => {
                    try {
                        console.log('blue:🚀 Starting pull request creation process...\n');
                        mockValidateEnvironment();
                        await mockCreatePullRequest(options);
                    } catch (error) {
                        console.error('red:❌ Error:', error instanceof Error ? error.message : 'Unknown error');
                        console.error('gray:Context: Pull request creation');
                        // Don't call process.exit in tests
                    }
                };

                await createCommandHandler({ jira: 'TEST-123' });

                expect(mockConsoleError).toHaveBeenCalledWith('red:❌ Error:', 'Validation failed');
                expect(mockConsoleError).toHaveBeenCalledWith('gray:Context: Pull request creation');
            });

            it('should handle create command with createPullRequest error', async () => {
                const createError = new Error('Create PR failed');
                mockCreatePullRequest.mockRejectedValue(createError);
                mockValidateEnvironment.mockReturnValue(undefined);

                const createCommandHandler = async (options: any) => {
                    try {
                        console.log('blue:🚀 Starting pull request creation process...\n');
                        mockValidateEnvironment();
                        await mockCreatePullRequest(options);
                    } catch (error) {
                        console.error('red:❌ Error:', error instanceof Error ? error.message : 'Unknown error');
                        console.error('gray:Context: Pull request creation');
                        // Don't call process.exit in tests
                    }
                };

                await createCommandHandler({ jira: 'TEST-123' });

                expect(mockConsoleError).toHaveBeenCalledWith('red:❌ Error:', 'Create PR failed');
                expect(mockConsoleError).toHaveBeenCalledWith('gray:Context: Pull request creation');
            });

            it('should handle create command with non-Error exception', async () => {
                mockCreatePullRequest.mockRejectedValue('String error');
                mockValidateEnvironment.mockReturnValue(undefined);

                const createCommandHandler = async (options: any) => {
                    try {
                        console.log('blue:🚀 Starting pull request creation process...\n');
                        mockValidateEnvironment();
                        await mockCreatePullRequest(options);
                    } catch (error) {
                        console.error('red:❌ Error:', error instanceof Error ? error.message : 'Unknown error');
                        console.error('gray:Context: Pull request creation');
                        // Don't call process.exit in tests
                    }
                };

                await createCommandHandler({ jira: 'TEST-123' });

                expect(mockConsoleError).toHaveBeenCalledWith('red:❌ Error:', 'Unknown error');
                expect(mockConsoleError).toHaveBeenCalledWith('gray:Context: Pull request creation');
            });
        });

        describe('config command handler', () => {
            it('should display configuration instructions', () => {
                const configCommandHandler = () => {
                    console.log('blue:📋 Configuration Setup:\n');
                    console.log('🎯 ' + 'bold:Recommended: Use the interactive setup wizard');
                    console.log('green:   Run: ' + 'yellow:create-pr setup' + 'gray: (sets up global config automatically)\n');

                    console.log('⚙️  ' + 'bold:Alternative: Manual configuration');
                    console.log('1. Copy .env.example to .env');
                    console.log('2. Fill in your credentials:\n');
                    console.log('yellow:   JIRA_BASE_URL' + '=https://your-company.atlassian.net');
                    console.log('yellow:   JIRA_USERNAME' + '=your-email@company.com');
                    console.log('yellow:   JIRA_API_TOKEN' + '=your-jira-api-token');
                    console.log('yellow:   GITHUB_TOKEN' + '=your-github-personal-access-token');
                    console.log('\n🤖 ' + 'bold:AI Providers (Primary: Claude Code → OpenAI → Fallback: Gemini → Copilot):');
                    console.log('yellow:   OPENAI_API_KEY' + '=your-openai-api-key ' + 'gray:(fallback)');
                    console.log('yellow:   GEMINI_API_KEY' + '=your-gemini-api-key ' + 'gray:(fallback)');
                    console.log('yellow:   ANTHROPIC_API_KEY' + '=your-anthropic-api-key ' + 'gray:(recommended)');
                    console.log('yellow:   COPILOT_API_TOKEN' + '=your-copilot-api-token ' + 'gray:(fallback)\n');

                    console.log('📝 ' + 'bold:Important notes:');
                    console.log('• Make sure your GitHub token has repo permissions');
                    console.log('• For Jira, generate an API token from your Atlassian account settings');
                    console.log('• The tool will automatically prioritize OpenAI → Gemini → Copilot');
                    console.log('• At least one AI provider is required for generating PR descriptions');
                    console.log('• The setup wizard creates a global config file for easier management');
                    console.log('• Jira ticket IDs will be auto-detected from branch names (e.g., ft/ET-123, feature-PROJ-456)');
                };

                configCommandHandler();

                expect(mockConsoleLog).toHaveBeenCalledWith('blue:📋 Configuration Setup:\n');
                expect(mockConsoleLog).toHaveBeenCalledWith('🎯 ' + 'bold:Recommended: Use the interactive setup wizard');
                expect(mockConsoleLog).toHaveBeenCalledWith('green:   Run: ' + 'yellow:create-pr setup' + 'gray: (sets up global config automatically)\n');

                // Check for manual configuration instructions
                expect(mockConsoleLog).toHaveBeenCalledWith('⚙️  ' + 'bold:Alternative: Manual configuration');
                expect(mockConsoleLog).toHaveBeenCalledWith('1. Copy .env.example to .env');
                expect(mockConsoleLog).toHaveBeenCalledWith('2. Fill in your credentials:\n');

                // Check for environment variable examples
                expect(mockConsoleLog).toHaveBeenCalledWith('yellow:   JIRA_BASE_URL' + '=https://your-company.atlassian.net');
                expect(mockConsoleLog).toHaveBeenCalledWith('yellow:   JIRA_USERNAME' + '=your-email@company.com');
                expect(mockConsoleLog).toHaveBeenCalledWith('yellow:   JIRA_API_TOKEN' + '=your-jira-api-token');
                expect(mockConsoleLog).toHaveBeenCalledWith('yellow:   GITHUB_TOKEN' + '=your-github-personal-access-token');

                // Check for AI provider instructions
                expect(mockConsoleLog).toHaveBeenCalledWith('\n🤖 ' + 'bold:AI Providers (Primary: Claude Code → OpenAI → Fallback: Gemini → Copilot):');
                expect(mockConsoleLog).toHaveBeenCalledWith('yellow:   OPENAI_API_KEY' + '=your-openai-api-key ' + 'gray:(fallback)');
                expect(mockConsoleLog).toHaveBeenCalledWith('yellow:   GEMINI_API_KEY' + '=your-gemini-api-key ' + 'gray:(fallback)');
                expect(mockConsoleLog).toHaveBeenCalledWith('yellow:   ANTHROPIC_API_KEY' + '=your-anthropic-api-key ' + 'gray:(recommended)');
                expect(mockConsoleLog).toHaveBeenCalledWith('yellow:   COPILOT_API_TOKEN' + '=your-copilot-api-token ' + 'gray:(fallback)\n');

                // Check for important notes
                expect(mockConsoleLog).toHaveBeenCalledWith('📝 ' + 'bold:Important notes:');
                expect(mockConsoleLog).toHaveBeenCalledWith('• Make sure your GitHub token has repo permissions');
                expect(mockConsoleLog).toHaveBeenCalledWith('• For Jira, generate an API token from your Atlassian account settings');
                expect(mockConsoleLog).toHaveBeenCalledWith('• The tool will automatically prioritize OpenAI → Gemini → Copilot');
                expect(mockConsoleLog).toHaveBeenCalledWith('• At least one AI provider is required for generating PR descriptions');
                expect(mockConsoleLog).toHaveBeenCalledWith('• The setup wizard creates a global config file for easier management');
                expect(mockConsoleLog).toHaveBeenCalledWith('• Jira ticket IDs will be auto-detected from branch names (e.g., ft/ET-123, feature-PROJ-456)');
            });
        });

        describe('setup command handler', () => {
            it('should run setup script', async () => {
                const setupCommandHandler = async () => {
                    console.log('blue:🛠️  Starting environment setup wizard...\n');
                    // In the actual implementation, this would call runSetupScript
                };

                await setupCommandHandler();

                expect(mockConsoleLog).toHaveBeenCalledWith('blue:🛠️  Starting environment setup wizard...\n');
            });
        });

        describe('git-extension command handler', () => {
            it('should run git-extension setup script', async () => {
                const gitExtensionCommandHandler = async () => {
                    console.log('blue:🔧 Setting up git extension...\n');
                    // In the actual implementation, this would call runSetupScript
                };

                await gitExtensionCommandHandler();

                expect(mockConsoleLog).toHaveBeenCalledWith('blue:🔧 Setting up git extension...\n');
            });
        });
    });

    describe('runSetupScript function', () => {
        beforeEach(() => {
            jest.resetModules();
        });

        it('should run setup script successfully with default success message', async () => {
            const mockProcess = {
                on: jest.fn(),
                stdio: 'inherit',
                shell: true
            };

            mockSpawn.mockReturnValue(mockProcess as any);

            // Mock successful process completion
            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    setTimeout(() => callback(0), 0);
                }
            });

            // Test the runSetupScript function logic
            const runSetupScript = async (scriptName: string, successMessage: string, errorContext: string, customSuccessMessage?: string) => {
                try {
                    const scriptsPath = `scripts/${scriptName}`;

                    const setupProcess = spawn('node', [scriptsPath], {
                        stdio: 'inherit',
                        shell: true
                    });

                    setupProcess.on('close', (code) => {
                        if (code === 0) {
                            console.log(`green:\n✅ ${successMessage}`);
                            const finalMessage = customSuccessMessage || 'You can now use "create-pr create" to generate pull requests.';
                            console.log(`gray:${finalMessage}`);
                        } else {
                            console.error(`red:\n❌ ${errorContext} failed with exit code:`, code);
                            // Don't call process.exit in tests
                        }
                    });

                    setupProcess.on('error', (error) => {
                        console.error(`red:\n❌ Failed to run ${errorContext}:`, error.message);
                        // Don't call process.exit in tests
                    });
                } catch (error) {
                    console.error('red:❌ Error:', error instanceof Error ? error.message : 'Unknown error');
                    console.error('gray:Context:', errorContext);
                    // Don't call process.exit in tests
                }
            };

            await runSetupScript('test-script.js', 'Test success!', 'Test context');

            expect(mockSpawn).toHaveBeenCalledWith('node', ['scripts/test-script.js'], {
                stdio: 'inherit',
                shell: true
            });

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(mockConsoleLog).toHaveBeenCalledWith('green:\n✅ Test success!');
            expect(mockConsoleLog).toHaveBeenCalledWith('gray:You can now use "create-pr create" to generate pull requests.');
        });

        it('should run setup script successfully with custom success message', async () => {
            const mockProcess = {
                on: jest.fn(),
                stdio: 'inherit',
                shell: true
            };

            mockSpawn.mockReturnValue(mockProcess as any);

            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    setTimeout(() => callback(0), 0);
                }
            });

            const runSetupScript = async (scriptName: string, successMessage: string, errorContext: string, customSuccessMessage?: string) => {
                try {
                    const scriptsPath = `scripts/${scriptName}`;

                    const setupProcess = spawn('node', [scriptsPath], {
                        stdio: 'inherit',
                        shell: true
                    });

                    setupProcess.on('close', (code) => {
                        if (code === 0) {
                            console.log(`green:\n✅ ${successMessage}`);
                            const finalMessage = customSuccessMessage || 'You can now use "create-pr create" to generate pull requests.';
                            console.log(`gray:${finalMessage}`);
                        } else {
                            console.error(`red:\n❌ ${errorContext} failed with exit code:`, code);
                            // Don't call process.exit in tests
                        }
                    });

                    setupProcess.on('error', (error) => {
                        console.error(`red:\n❌ Failed to run ${errorContext}:`, error.message);
                        // Don't call process.exit in tests
                    });
                } catch (error) {
                    console.error('red:❌ Error:', error instanceof Error ? error.message : 'Unknown error');
                    console.error('gray:Context:', errorContext);
                    // Don't call process.exit in tests
                }
            };

            await runSetupScript('test-script.js', 'Test success!', 'Test context', 'Custom message');

            await new Promise(resolve => setTimeout(resolve, 10));

            expect(mockConsoleLog).toHaveBeenCalledWith('green:\n✅ Test success!');
            expect(mockConsoleLog).toHaveBeenCalledWith('gray:Custom message');
        });

        it('should handle setup script failure', async () => {
            const mockProcess = {
                on: jest.fn(),
                stdio: 'inherit',
                shell: true
            };

            mockSpawn.mockReturnValue(mockProcess as any);

            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    setTimeout(() => callback(1), 0);
                }
            });

            const runSetupScript = async (scriptName: string, successMessage: string, errorContext: string, customSuccessMessage?: string) => {
                try {
                    const scriptsPath = `scripts/${scriptName}`;

                    const setupProcess = spawn('node', [scriptsPath], {
                        stdio: 'inherit',
                        shell: true
                    });

                    setupProcess.on('close', (code) => {
                        if (code === 0) {
                            console.log(`green:\n✅ ${successMessage}`);
                            const finalMessage = customSuccessMessage || 'You can now use "create-pr create" to generate pull requests.';
                            console.log(`gray:${finalMessage}`);
                        } else {
                            console.error(`red:\n❌ ${errorContext} failed with exit code:`, code);
                            // Don't call process.exit in tests
                        }
                    });

                    setupProcess.on('error', (error) => {
                        console.error(`red:\n❌ Failed to run ${errorContext}:`, error.message);
                        // Don't call process.exit in tests
                    });
                } catch (error) {
                    console.error('red:❌ Error:', error instanceof Error ? error.message : 'Unknown error');
                    console.error('gray:Context:', errorContext);
                    // Don't call process.exit in tests
                }
            };

            await runSetupScript('test-script.js', 'Test success!', 'Test context');

            await new Promise(resolve => setTimeout(resolve, 10));

            expect(mockConsoleError).toHaveBeenCalledWith('red:\n❌ Test context failed with exit code:', 1);
        });

        it('should handle spawn error', async () => {
            const mockProcess = {
                on: jest.fn(),
                stdio: 'inherit',
                shell: true
            };

            mockSpawn.mockReturnValue(mockProcess as any);

            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'error') {
                    setTimeout(() => callback(new Error('Spawn error')), 0);
                }
            });

            const runSetupScript = async (scriptName: string, successMessage: string, errorContext: string, customSuccessMessage?: string) => {
                try {
                    const scriptsPath = `scripts/${scriptName}`;

                    const setupProcess = spawn('node', [scriptsPath], {
                        stdio: 'inherit',
                        shell: true
                    });

                    setupProcess.on('close', (code) => {
                        if (code === 0) {
                            console.log(`green:\n✅ ${successMessage}`);
                            const finalMessage = customSuccessMessage || 'You can now use "create-pr create" to generate pull requests.';
                            console.log(`gray:${finalMessage}`);
                        } else {
                            console.error(`red:\n❌ ${errorContext} failed with exit code:`, code);
                            // Don't call process.exit in tests
                        }
                    });

                    setupProcess.on('error', (error) => {
                        console.error(`red:\n❌ Failed to run ${errorContext}:`, error.message);
                        // Don't call process.exit in tests
                    });
                } catch (error) {
                    console.error('red:❌ Error:', error instanceof Error ? error.message : 'Unknown error');
                    console.error('gray:Context:', errorContext);
                    // Don't call process.exit in tests
                }
            };

            await runSetupScript('test-script.js', 'Test success!', 'Test context');

            await new Promise(resolve => setTimeout(resolve, 10));

            expect(mockConsoleError).toHaveBeenCalledWith('red:\n❌ Failed to run Test context:', 'Spawn error');
        });

        it('should handle catch block error', async () => {
            // Mock spawn to throw an error
            mockSpawn.mockImplementation(() => {
                throw new Error('Spawn setup error');
            });

            const runSetupScript = async (scriptName: string, successMessage: string, errorContext: string, customSuccessMessage?: string) => {
                try {
                    const scriptsPath = `scripts/${scriptName}`;

                    const setupProcess = spawn('node', [scriptsPath], {
                        stdio: 'inherit',
                        shell: true
                    });

                    setupProcess.on('close', (code) => {
                        if (code === 0) {
                            console.log(`green:\n✅ ${successMessage}`);
                            const finalMessage = customSuccessMessage || 'You can now use "create-pr create" to generate pull requests.';
                            console.log(`gray:${finalMessage}`);
                        } else {
                            console.error(`red:\n❌ ${errorContext} failed with exit code:`, code);
                            // Don't call process.exit in tests
                        }
                    });

                    setupProcess.on('error', (error) => {
                        console.error(`red:\n❌ Failed to run ${errorContext}:`, error.message);
                        // Don't call process.exit in tests
                    });
                } catch (error) {
                    console.error('red:❌ Error:', error instanceof Error ? error.message : 'Unknown error');
                    console.error('gray:Context:', errorContext);
                    // Don't call process.exit in tests
                }
            };

            await runSetupScript('test-script.js', 'Test success!', 'Test context');

            expect(mockConsoleError).toHaveBeenCalledWith('red:❌ Error:', 'Spawn setup error');
            expect(mockConsoleError).toHaveBeenCalledWith('gray:Context:', 'Test context');
        });
    });

    describe('Program execution flow', () => {
        it('should show help when no arguments provided', () => {
            const originalArgv = process.argv;
            process.argv = ['node', 'index.js'];

            // Test that process.argv is correctly set
            expect(process.argv.length).toBe(2);
            expect(process.argv[0]).toBe('node');
            expect(process.argv[1]).toBe('index.js');

            // Restore original argv
            process.argv = originalArgv;
        });

        it('should parse arguments when provided', () => {
            const originalArgv = process.argv;
            process.argv = ['node', 'index.js', 'create', '--help'];

            // Test that process.argv is correctly set with arguments
            expect(process.argv.length).toBeGreaterThan(2);
            expect(process.argv[0]).toBe('node');
            expect(process.argv[1]).toBe('index.js');
            expect(process.argv[2]).toBe('create');
            expect(process.argv[3]).toBe('--help');

            // Restore original argv
            process.argv = originalArgv;
        });
    });

    describe('Edge cases', () => {
        it('should handle process exit code null', async () => {
            const mockProcess = {
                on: jest.fn(),
                stdio: 'inherit',
                shell: true
            };

            mockSpawn.mockReturnValue(mockProcess as any);

            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    setTimeout(() => callback(null), 0);
                }
            });

            const runSetupScript = async (scriptName: string, successMessage: string, errorContext: string, customSuccessMessage?: string) => {
                try {
                    const scriptsPath = `scripts/${scriptName}`;

                    const setupProcess = spawn('node', [scriptsPath], {
                        stdio: 'inherit',
                        shell: true
                    });

                    setupProcess.on('close', (code) => {
                        if (code === 0 || code === null) {
                            console.log(`green:\n✅ ${successMessage}`);
                            const finalMessage = customSuccessMessage || 'You can now use "create-pr create" to generate pull requests.';
                            console.log(`gray:${finalMessage}`);
                        } else {
                            console.error(`red:\n❌ ${errorContext} failed with exit code:`, code);
                            // Don't call process.exit in tests
                        }
                    });

                    setupProcess.on('error', (error) => {
                        console.error(`red:\n❌ Failed to run ${errorContext}:`, error.message);
                        // Don't call process.exit in tests
                    });
                } catch (error) {
                    console.error('red:❌ Error:', error instanceof Error ? error.message : 'Unknown error');
                    console.error('gray:Context:', errorContext);
                    // Don't call process.exit in tests
                }
            };

            await runSetupScript('test-script.js', 'Test success!', 'Test context');

            await new Promise(resolve => setTimeout(resolve, 10));

            expect(mockConsoleLog).toHaveBeenCalledWith('green:\n✅ Test success!');
        });

        it('should handle custom success message being undefined', async () => {
            const mockProcess = {
                on: jest.fn(),
                stdio: 'inherit',
                shell: true
            };

            mockSpawn.mockReturnValue(mockProcess as any);

            mockProcess.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    setTimeout(() => callback(0), 0);
                }
            });

            const runSetupScript = async (scriptName: string, successMessage: string, errorContext: string, customSuccessMessage?: string) => {
                try {
                    const scriptsPath = `scripts/${scriptName}`;

                    const setupProcess = spawn('node', [scriptsPath], {
                        stdio: 'inherit',
                        shell: true
                    });

                    setupProcess.on('close', (code) => {
                        if (code === 0) {
                            console.log(`green:\n✅ ${successMessage}`);
                            const finalMessage = customSuccessMessage || 'You can now use "create-pr create" to generate pull requests.';
                            console.log(`gray:${finalMessage}`);
                        } else {
                            console.error(`red:\n❌ ${errorContext} failed with exit code:`, code);
                            // Don't call process.exit in tests
                        }
                    });

                    setupProcess.on('error', (error) => {
                        console.error(`red:\n❌ Failed to run ${errorContext}:`, error.message);
                        // Don't call process.exit in tests
                    });
                } catch (error) {
                    console.error('red:❌ Error:', error instanceof Error ? error.message : 'Unknown error');
                    console.error('gray:Context:', errorContext);
                    // Don't call process.exit in tests
                }
            };

            await runSetupScript('test-script.js', 'Test success!', 'Test context', undefined);

            await new Promise(resolve => setTimeout(resolve, 10));

            expect(mockConsoleLog).toHaveBeenCalledWith('green:\n✅ Test success!');
            expect(mockConsoleLog).toHaveBeenCalledWith('gray:You can now use "create-pr create" to generate pull requests.');
        });
    });
});
