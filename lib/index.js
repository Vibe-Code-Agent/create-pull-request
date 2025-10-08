#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { config } from 'dotenv';
import { createPullRequest } from './commands/create-pr.js';
import { validateEnvironment } from './utils/validation.js';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG, ENV_KEYS } from './constants/index.js';
// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config();
const program = new Command();
// Helper function to handle errors consistently
function handleError(error, context) {
    console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : 'Unknown error');
    if (context) {
        console.error(chalk.gray(`Context: ${context}`));
    }
    process.exit(1);
}
// Helper function to spawn setup scripts
async function runSetupScript(scriptName, successMessage, errorContext, customSuccessMessage) {
    try {
        // Handle both source and compiled paths
        const scriptsPath = path.join(__dirname, '..', 'scripts', scriptName);
        const setupProcess = spawn('node', [scriptsPath], {
            stdio: 'inherit',
            shell: true
        });
        setupProcess.on('close', (code) => {
            if (code === 0) {
                console.log(chalk.green(`\n✅ ${successMessage}`));
                const finalMessage = customSuccessMessage || 'You can now use "create-pr create" to generate pull requests.';
                console.log(chalk.gray(finalMessage));
            }
            else {
                console.error(chalk.red(`\n❌ ${errorContext} failed with exit code:`), code);
                process.exit(1);
            }
        });
        setupProcess.on('error', (error) => {
            console.error(chalk.red(`\n❌ Failed to run ${errorContext}:`), error.message);
            process.exit(1);
        });
    }
    catch (error) {
        handleError(error, errorContext);
    }
}
program
    .name(CONFIG.CLI_NAME)
    .description('CLI tool to automatically generate pull request descriptions based on Jira tickets and file changes')
    .version(CONFIG.CLI_VERSION);
program
    .command('create')
    .description('Create a pull request with auto-generated description')
    .option('-j, --jira <ticket>', 'Jira ticket ID (e.g., PROJ-123). If not provided, will attempt to extract from branch name')
    .option('-b, --base <branch>', 'Base branch for the pull request', CONFIG.DEFAULT_BRANCH)
    .option('-t, --title <title>', 'Pull request title (optional)')
    .option('-d, --draft', 'Create as draft pull request')
    .option('--dry-run', 'Generate description without creating PR')
    .action(async (options) => {
    try {
        console.log(chalk.blue('🚀 Starting pull request creation process...\n'));
        // Validate environment variables
        validateEnvironment();
        await createPullRequest(options);
    }
    catch (error) {
        handleError(error, 'Pull request creation');
    }
});
program
    .command('config')
    .description('Show current configuration and setup instructions')
    .action(() => {
    console.log(chalk.blue('📋 Configuration Setup:\n'));
    console.log('🎯 ' + chalk.bold('Recommended: Use the interactive setup wizard'));
    console.log(chalk.green('   Run: ') + chalk.yellow('create-pr setup') + chalk.gray(' (sets up global config automatically)\n'));
    console.log('⚙️  ' + chalk.bold('Alternative: Manual configuration'));
    console.log('1. Copy .env.example to .env');
    console.log('2. Fill in your credentials:\n');
    console.log(chalk.yellow(`   ${ENV_KEYS.JIRA_BASE_URL}`) + '=https://your-company.atlassian.net');
    console.log(chalk.yellow(`   ${ENV_KEYS.JIRA_USERNAME}`) + '=your-email@company.com');
    console.log(chalk.yellow(`   ${ENV_KEYS.JIRA_API_TOKEN}`) + '=your-jira-api-token');
    console.log(chalk.yellow(`   ${ENV_KEYS.GITHUB_TOKEN}`) + '=your-github-personal-access-token');
    console.log('\n🤖 ' + chalk.bold('AI Providers (Primary: Claude Code → OpenAI → Fallback: Gemini → Copilot):'));
    console.log(chalk.yellow(`   ${ENV_KEYS.OPENAI_API_KEY}`) + '=your-openai-api-key ' + chalk.gray('(fallback)'));
    console.log(chalk.yellow(`   ${ENV_KEYS.GEMINI_API_KEY}`) + '=your-gemini-api-key ' + chalk.gray('(fallback)'));
    console.log(chalk.yellow(`   ${ENV_KEYS.ANTHROPIC_API_KEY}`) + '=your-anthropic-api-key ' + chalk.gray('(recommended)'));
    console.log(chalk.yellow(`   ${ENV_KEYS.COPILOT_API_TOKEN}`) + '=your-copilot-api-token ' + chalk.gray('(fallback)\n'));
    console.log('📝 ' + chalk.bold('Important notes:'));
    console.log('• Make sure your GitHub token has repo permissions');
    console.log('• For Jira, generate an API token from your Atlassian account settings');
    console.log('• The tool will automatically prioritize OpenAI → Gemini → Copilot');
    console.log('• At least one AI provider is required for generating PR descriptions');
    console.log('• The setup wizard creates a global config file for easier management');
    console.log('• Jira ticket IDs will be auto-detected from branch names (e.g., ft/ET-123, feature-PROJ-456)');
});
program
    .command('setup')
    .description('Run interactive environment setup wizard')
    .action(async () => {
    console.log(chalk.blue('🛠️  Starting environment setup wizard...\n'));
    await runSetupScript('setup-env.js', 'Setup completed successfully!', 'Setup');
});
program
    .command('git-extension')
    .description('Set up git extension to enable "git create-pr" command')
    .action(async () => {
    console.log(chalk.blue('🔧 Setting up git extension...\n'));
    await runSetupScript('setup-git-extension.js', 'Git extension setup completed!', 'Git extension setup', 'You can now use "git create-pr" command after updating your PATH.');
});
if (process.argv.length === 2) {
    program.help();
}
program.parse(process.argv);
//# sourceMappingURL=index.js.map