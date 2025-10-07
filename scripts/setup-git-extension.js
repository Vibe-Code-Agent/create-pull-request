#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import constants from compiled JavaScript
const { CONFIG, SYSTEM } = await import('../lib/constants/index.js');

// Configuration constants
const CONFIG_DIRECTORY_NAME = CONFIG.DIRECTORY_NAME;
const EXECUTABLE_PERMISSIONS = SYSTEM.EXECUTABLE_PERMISSIONS;

/**
 * Set up git extension to enable 'git create-pr' command
 */
async function setupGitExtension() {
    console.log(chalk.blue('🔧 Setting up git extension for "git create-pr" command...'));

    try {
        // Get the directory where this project is located
        // Handle both direct execution and execution from compiled lib
        let projectDir;
        if (__dirname.includes('scripts')) {
            // Called directly from scripts directory
            projectDir = path.resolve(__dirname, '..');
        } else {
            // Called from compiled lib directory
            projectDir = path.resolve(__dirname, '..', '..');
        }
        const gitExtensionPath = path.join(projectDir, 'git-create-pr');

        // Create git extension script if it doesn't exist
        if (!fs.existsSync(gitExtensionPath)) {
            const gitExtensionContent = `#!/usr/bin/env node

// Git extension wrapper for create-pr
// This allows using 'git create-pr' instead of just 'create-pr'

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the directory where this script is located
const scriptDir = __dirname;
const createPrScript = path.join(scriptDir, 'bin', 'create-pr.js');

// Forward all arguments to the original create-pr script
const args = process.argv.slice(2);

// Spawn the create-pr command with all arguments
const child = spawn('node', [createPrScript, ...args], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

// Handle process events
child.on('close', (code) => {
  process.exit(code || 0);
});

child.on('error', (error) => {
  console.error('Error running create-pr:', error.message);
  process.exit(1);
});
`;

            fs.writeFileSync(gitExtensionPath, gitExtensionContent);
            console.log(chalk.green('✅ Created git-create-pr extension script'));
        } else {
            console.log(chalk.gray('ℹ️  git-create-pr extension script already exists'));
        }

        // Make the script executable on Unix-like systems
        if (process.platform !== 'win32') {
            fs.chmodSync(gitExtensionPath, EXECUTABLE_PERMISSIONS);
            console.log(chalk.green('✅ Made git extension script executable'));
        }

        // Check if git extension is already in PATH
        const isInPath = await checkGitExtensionInPath(projectDir);

        if (!isInPath) {
            console.log(chalk.yellow('⚠️  Git extension needs to be added to PATH'));
            await addGitExtensionToPath(projectDir);
        } else {
            console.log(chalk.green('✅ Git extension is accessible via PATH'));
        }

        // Test the git extension
        await testGitExtension();

        return true;

    } catch (error) {
        console.error(chalk.red('❌ Error setting up git extension:'), error.message);
        return false;
    }
}

/**
 * Check if git extension is accessible via PATH
 */
function checkGitExtensionInPath(projectDir) {
    return new Promise((resolve) => {
        const testCommand = process.platform === 'win32' ? 'where' : 'which';
        const child = spawn(testCommand, ['git-create-pr'], {
            stdio: 'pipe',
            shell: true
        });

        child.on('close', (code) => {
            resolve(code === 0);
        });

        child.on('error', () => {
            resolve(false);
        });
    });
}

/**
 * Add git extension to PATH with macOS-specific optimizations
 */
async function addGitExtensionToPath(projectDir) {
    console.log(chalk.blue('🔧 Setting up PATH configuration for git extension...'));

    const homeDir = os.homedir();
    const createPrDir = path.join(homeDir, CONFIG_DIRECTORY_NAME);

    // Create .create-pr directory if it doesn't exist
    if (!fs.existsSync(createPrDir)) {
        fs.mkdirSync(createPrDir, { recursive: true });
    }

    // Create or update PATH configuration file
    const pathConfigFile = path.join(createPrDir, 'path-config.json');
    const pathConfig = {
        projectPath: projectDir,
        addedAt: new Date().toISOString(),
        platform: process.platform,
        shell: process.env.SHELL || '/bin/zsh',
        instructions: {
            manual: `Add this directory to your PATH: ${projectDir}`,
            shellConfig: getShellConfigInstructions(projectDir)
        }
    };

    fs.writeFileSync(pathConfigFile, JSON.stringify(pathConfig, null, 2));

    // Detect shell and provide specific instructions
    const shell = process.env.SHELL || '/bin/zsh';
    const shellName = path.basename(shell);

    console.log(chalk.yellow('\n📋 To use "git create-pr" command, add the project directory to your PATH:'));
    console.log(chalk.gray(`   Project directory: ${projectDir}\n`));

    if (process.platform === 'win32') {
        showWindowsInstructions(projectDir);
    } else {
        await showUnixInstructions(projectDir, shellName, homeDir);
    }

    console.log(chalk.blue('\n🚀 Alternative: Global Installation'));
    console.log('You can also install this tool globally using npm:');
    console.log(chalk.yellow('   npm install -g publish-pull-request'));
    console.log(chalk.gray('   # This will make both "create-pr" and "git create-pr" available globally\n'));
}

/**
 * Show Windows-specific instructions
 */
function showWindowsInstructions(projectDir) {
    console.log(chalk.blue('Windows Instructions:'));
    console.log('1. Open System Properties → Advanced → Environment Variables');
    console.log('2. Edit the PATH variable and add:');
    console.log(chalk.yellow(`   ${projectDir}`));
    console.log('3. Restart your terminal\n');
}

/**
 * Show Unix/macOS-specific instructions
 */
async function showUnixInstructions(projectDir, shellName, homeDir) {
    console.log(chalk.blue(`${shellName} Instructions:`));

    let configFile;
    let exportLine;
    let reloadCommand;

    switch (shellName) {
        case 'zsh':
            configFile = path.join(homeDir, '.zshrc');
            exportLine = `export PATH="${projectDir}:$PATH"`;
            reloadCommand = 'source ~/.zshrc';
            break;
        case 'bash':
            // Check for .bash_profile first (macOS default), then .bashrc
            const bashProfile = path.join(homeDir, '.bash_profile');
            const bashrc = path.join(homeDir, '.bashrc');
            configFile = fs.existsSync(bashProfile) ? bashProfile : bashrc;
            exportLine = `export PATH="${projectDir}:$PATH"`;
            reloadCommand = `source ${path.basename(configFile)}`;
            break;
        case 'fish':
            configFile = path.join(homeDir, '.config', 'fish', 'config.fish');
            exportLine = `set -gx PATH ${projectDir} $PATH`;
            reloadCommand = 'source ~/.config/fish/config.fish';
            break;
        default:
            configFile = 'your shell configuration file';
            exportLine = `export PATH="${projectDir}:$PATH"`;
            reloadCommand = 'reload your shell';
    }

    console.log('Add this line to your shell configuration file:');
    console.log(chalk.yellow(`   # Add to ${path.basename(configFile)}`));
    console.log(chalk.yellow(`   ${exportLine}`));

    // Try to automatically add to config file if it exists and is writable
    if (configFile !== 'your shell configuration file' && fs.existsSync(configFile)) {
        try {
            const configContent = fs.readFileSync(configFile, 'utf8');
            if (!configContent.includes(projectDir)) {
                const updatedContent = configContent + `\n# Added by create-pr setup\n${exportLine}\n`;
                fs.writeFileSync(configFile, updatedContent);
                console.log(chalk.green(`✅ Automatically added PATH to ${path.basename(configFile)}`));
            } else {
                console.log(chalk.gray(`ℹ️  PATH already exists in ${path.basename(configFile)}`));
            }
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Could not automatically update ${path.basename(configFile)}: ${error.message}`));
        }
    }

    console.log('\nThen reload your shell:');
    console.log(chalk.gray(`   ${reloadCommand}`));
    console.log(chalk.gray('   # OR restart your terminal\n'));
}

/**
 * Get shell-specific configuration instructions
 */
function getShellConfigInstructions(projectDir) {
    const instructions = {};

    instructions.bash = {
        file: '~/.bashrc or ~/.bash_profile',
        command: `export PATH="${projectDir}:$PATH"`
    };

    instructions.zsh = {
        file: '~/.zshrc',
        command: `export PATH="${projectDir}:$PATH"`
    };

    instructions.fish = {
        file: '~/.config/fish/config.fish',
        command: `set -gx PATH ${projectDir} $PATH`
    };

    return instructions;
}

/**
 * Test git extension functionality with better error handling
 */
async function testGitExtension() {
    console.log(chalk.blue('🧪 Testing git extension...'));

    return new Promise((resolve) => {
        const child = spawn('git', ['create-pr', '--help'], {
            stdio: 'pipe',
            shell: true,
            timeout: 10000 // 10 second timeout
        });

        let output = '';
        let errorOutput = '';

        child.stdout.on('data', (data) => {
            output += data.toString();
        });

        child.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        child.on('close', (code) => {
            const fullOutput = output + errorOutput;
            if (code === 0 && (fullOutput.includes('create-pr') || fullOutput.includes('CLI tool'))) {
                console.log(chalk.green('✅ Git extension is working correctly!'));
                resolve(true);
            } else {
                console.log(chalk.yellow('⚠️  Git extension test failed.'));
                console.log(chalk.gray('   This is normal if the PATH hasn\'t been updated yet.'));
                console.log(chalk.gray('   Please restart your terminal or run: source ~/.zshrc (or your shell config)'));
                resolve(false);
            }
        });

        child.on('error', (error) => {
            console.log(chalk.yellow('⚠️  Could not test git extension.'));
            console.log(chalk.gray(`   Error: ${error.message}`));
            console.log(chalk.gray('   This usually means the PATH needs to be updated manually.'));
            resolve(false);
        });

        child.on('timeout', () => {
            console.log(chalk.yellow('⚠️  Git extension test timed out.'));
            child.kill();
            resolve(false);
        });
    });
}

/**
 * Remove git extension setup
 */
function removeGitExtension() {
    console.log(chalk.blue('🗑️  Removing git extension setup...'));

    try {
        const projectDir = path.resolve(__dirname, '..');
        const gitExtensionPath = path.join(projectDir, 'git-create-pr');

        if (fs.existsSync(gitExtensionPath)) {
            fs.unlinkSync(gitExtensionPath);
            console.log(chalk.green('✅ Removed git-create-pr extension script'));
        }

        const homeDir = os.homedir();
        const createPrDir = path.join(homeDir, CONFIG_DIRECTORY_NAME);
        const pathConfigFile = path.join(createPrDir, 'path-config.json');

        if (fs.existsSync(pathConfigFile)) {
            fs.unlinkSync(pathConfigFile);
            console.log(chalk.green('✅ Removed PATH configuration file'));
        }

        console.log(chalk.yellow('⚠️  You may need to manually remove the project path from your shell configuration'));

        return true;
    } catch (error) {
        console.error(chalk.red('❌ Error removing git extension:'), error.message);
        return false;
    }
}

export {
    setupGitExtension,
    testGitExtension,
    removeGitExtension,
    checkGitExtensionInPath,
    addGitExtensionToPath
};

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    setupGitExtension().then(success => {
        if (success) {
            console.log(chalk.green('\n🎉 Git extension setup completed successfully!'));
            console.log(chalk.gray('You can now use "git create-pr" command after updating your PATH.'));
        } else {
            console.log(chalk.red('\n❌ Git extension setup failed.'));
            process.exit(1);
        }
    }).catch(error => {
        console.error(chalk.red('\n❌ Unexpected error:'), error.message);
        process.exit(1);
    });
}
