#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { config } from 'dotenv';
import { createPullRequest } from './commands/create-pr';
import { validateEnvironment } from './utils/validation';
import { spawn } from 'child_process';
import path from 'path';

config();

const program = new Command();

program
  .name('create-pr')
  .description('CLI tool to automatically generate pull request descriptions based on Jira tickets and file changes')
  .version('1.0.0');

program
  .command('create')
  .description('Create a pull request with auto-generated description')
  .option('-j, --jira <ticket>', 'Jira ticket ID (e.g., PROJ-123)')
  .option('-b, --base <branch>', 'Base branch for the pull request', 'main')
  .option('-t, --title <title>', 'Pull request title (optional)')
  .option('-d, --draft', 'Create as draft pull request')
  .option('--dry-run', 'Generate description without creating PR')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 Starting pull request creation process...\n'));
      
      // Validate environment variables
      validateEnvironment();
      
      await createPullRequest(options);
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
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
    console.log(chalk.yellow('   JIRA_BASE_URL') + '=https://your-company.atlassian.net');
    console.log(chalk.yellow('   JIRA_USERNAME') + '=your-email@company.com');
    console.log(chalk.yellow('   JIRA_API_TOKEN') + '=your-jira-api-token');
    console.log(chalk.yellow('   GITHUB_TOKEN') + '=your-github-personal-access-token');
    console.log('\n🤖 ' + chalk.bold('AI Providers (Primary: ChatGPT → Fallback: Gemini → Copilot):'));
    console.log(chalk.yellow('   OPENAI_API_KEY') + '=your-openai-api-key ' + chalk.gray('(recommended)'));
    console.log(chalk.yellow('   GEMINI_API_KEY') + '=your-gemini-api-key ' + chalk.gray('(fallback)'));
    console.log(chalk.yellow('   COPILOT_API_TOKEN') + '=your-copilot-api-token ' + chalk.gray('(legacy)\n'));
    
    console.log('📝 ' + chalk.bold('Important notes:'));
    console.log('• Make sure your GitHub token has repo permissions');
    console.log('• For Jira, generate an API token from your Atlassian account settings');
    console.log('• The tool will automatically prioritize ChatGPT → Gemini → Copilot');
    console.log('• At least one AI provider is required for generating PR descriptions');
    console.log('• The setup wizard creates a global config file for easier management');
  });

program
  .command('setup')
  .description('Run interactive environment setup wizard')
  .action(async () => {
    try {
      console.log(chalk.blue('🛠️  Starting environment setup wizard...\n'));
      
      const setupScript = path.join(__dirname, '..', 'scripts', 'setup-env.js');
      
      const setupProcess = spawn('node', [setupScript], {
        stdio: 'inherit',
        shell: true
      });
      
      setupProcess.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green('\n✅ Setup completed successfully!'));
          console.log(chalk.gray('You can now use "create-pr create" to generate pull requests.'));
        } else {
          console.error(chalk.red('\n❌ Setup failed with exit code:'), code);
          process.exit(1);
        }
      });
      
      setupProcess.on('error', (error) => {
        console.error(chalk.red('\n❌ Failed to run setup:'), error.message);
        process.exit(1);
      });
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

if (process.argv.length === 2) {
  program.help();
}

program.parse(process.argv);