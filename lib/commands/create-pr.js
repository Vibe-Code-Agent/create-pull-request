import inquirer from 'inquirer';
import chalk from 'chalk';
import { createSpinner } from '../utils/spinner.js';
import { JiraService } from '../services/atlassian-facade.js';
import { GitHubService } from '../services/github.js';
import { GitService } from '../services/git.js';
import { AIDescriptionGeneratorService } from '../services/ai-description-generator.js';
import { validateJiraTicket, validateGitRepository, extractJiraTicketFromBranch } from '../utils/validation.js';
import { CONFIG } from '../constants/index.js';
// Helper functions for validation
async function validateRepositoryAndBranch(gitService, baseBranch) {
    await gitService.validateRepository();
    const baseExists = await gitService.branchExists(baseBranch);
    if (!baseExists) {
        throw new Error(`Base branch '${baseBranch}' does not exist`);
    }
}
async function checkUncommittedChanges(gitService) {
    const hasUncommitted = await gitService.hasUncommittedChanges();
    if (!hasUncommitted) {
        return true;
    }
    const { proceed } = await inquirer.prompt([{
            type: 'confirm',
            name: 'proceed',
            message: 'You have uncommitted changes. Do you want to proceed anyway?',
            default: false
        }]);
    if (!proceed) {
        console.log(chalk.yellow('❌ Aborting. Please commit or stash your changes first.'));
        return false;
    }
    return true;
}
function validateJiraTicketFormat(ticket) {
    if (!validateJiraTicket(ticket)) {
        throw new Error(`Invalid Jira ticket format: ${ticket}. Expected format: PROJECT-123`);
    }
}
// Helper functions for Jira ticket handling
async function getJiraTicketFromUser() {
    const { ticket } = await inquirer.prompt([{
            type: 'input',
            name: 'ticket',
            message: 'Enter Jira ticket ID (e.g., PROJ-123):',
            validate: (input) => {
                if (!input.trim())
                    return 'Jira ticket ID is required';
                if (!validateJiraTicket(input.trim())) {
                    return 'Invalid Jira ticket format. Expected format: PROJECT-123';
                }
                return true;
            }
        }]);
    return ticket.trim().toUpperCase();
}
async function resolveJiraTicket(options, currentBranch, spinner) {
    let jiraTicket = options.jira;
    if (!jiraTicket) {
        const extractedTicket = extractJiraTicketFromBranch(currentBranch);
        if (extractedTicket) {
            jiraTicket = extractedTicket;
            console.log(chalk.green(`✅ Detected Jira ticket from branch name: ${jiraTicket}`));
        }
    }
    if (!jiraTicket) {
        spinner.stop();
        jiraTicket = await getJiraTicketFromUser();
        spinner.start('Analyzing repository and changes...');
    }
    validateJiraTicketFormat(jiraTicket);
    return jiraTicket;
}
async function fetchJiraTicketWithConfluence(jiraService, jiraTicket, spinner) {
    spinner.text = 'Fetching Jira ticket information...';
    let ticketInfo = await jiraService.getTicket(jiraTicket);
    spinner.succeed('Jira ticket information fetched');
    console.log(chalk.green(`🎫 Using Jira ticket: ${ticketInfo.key} - ${ticketInfo.summary}`));
    spinner.start('Checking for linked Confluence pages...');
    const hasConfluence = await jiraService.hasConfluencePages(jiraTicket);
    if (hasConfluence) {
        spinner.succeed('Found linked Confluence pages');
        const { includeConfluence } = await inquirer.prompt([{
                type: 'confirm',
                name: 'includeConfluence',
                message: 'Include Confluence page content in PR summary generation?',
                default: false
            }]);
        if (includeConfluence) {
            spinner.start('Fetching Confluence pages content...');
            ticketInfo = await jiraService.getTicket(jiraTicket, true);
            spinner.succeed(`Loaded ${ticketInfo.confluencePages?.length || 0} Confluence page(s)`);
            if (ticketInfo.confluencePages && ticketInfo.confluencePages.length > 0) {
                console.log(chalk.blue('📄 Confluence pages found:'));
                for (const page of ticketInfo.confluencePages) {
                    console.log(chalk.blue(`   • ${page.title}`));
                }
            }
        }
        else {
            console.log(chalk.yellow('⏭️  Skipping Confluence content'));
        }
    }
    else {
        spinner.succeed('No Confluence pages linked to this ticket');
    }
    return ticketInfo;
}
// Helper functions for PR template handling
async function selectPRTemplate(githubService, spinner) {
    spinner.start('Looking for pull request templates...');
    const templates = await githubService.getPullRequestTemplates();
    let selectedTemplate = templates.length > 0 ? templates[0] : undefined;
    if (templates.length > 1) {
        spinner.stop();
        const { template } = await inquirer.prompt([{
                type: 'list',
                name: 'template',
                message: 'Select a pull request template:',
                choices: [
                    { name: 'No template', value: null },
                    ...templates.map(t => ({ name: t.name, value: t }))
                ]
            }]);
        selectedTemplate = template;
        spinner.start();
    }
    if (selectedTemplate) {
        spinner.succeed(`Using PR template: ${selectedTemplate.name}`);
    }
    else {
        spinner.succeed('No PR template found, using default format');
    }
    return selectedTemplate;
}
// Helper functions for AI description generation
async function generatePRDescriptionWithRetry(aiDescriptionService, ticketInfo, gitChanges, selectedTemplate, diffContent, options, repo, currentBranch, spinner) {
    spinner.start('Generating pull request description with AI...');
    try {
        const generatedContent = await aiDescriptionService.generatePRDescription({
            jiraTicket: ticketInfo,
            gitChanges,
            template: selectedTemplate,
            diffContent,
            prTitle: options.title,
            repoInfo: {
                owner: repo.owner,
                repo: repo.repo,
                currentBranch: currentBranch
            }
        });
        spinner.succeed('Pull request description generated');
        return generatedContent;
    }
    catch (error) {
        spinner.fail('Failed to generate pull request description');
        console.log(chalk.red(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
        const { retry } = await inquirer.prompt([{
                type: 'confirm',
                name: 'retry',
                message: 'Would you like to retry generating the summary?',
                default: true
            }]);
        if (!retry) {
            throw error;
        }
        return await retryAIDescriptionGeneration(aiDescriptionService, ticketInfo, gitChanges, selectedTemplate, diffContent, options, repo, currentBranch, spinner);
    }
}
async function retryAIDescriptionGeneration(aiDescriptionService, ticketInfo, gitChanges, selectedTemplate, diffContent, options, repo, currentBranch, spinner) {
    let retryAttempt = 1;
    const maxRetries = 3;
    while (retryAttempt <= maxRetries) {
        try {
            spinner.start(`Retrying pull request description generation (attempt ${retryAttempt}/${maxRetries})...`);
            const generatedContent = await aiDescriptionService.generatePRDescription({
                jiraTicket: ticketInfo,
                gitChanges,
                template: selectedTemplate,
                diffContent,
                prTitle: options.title,
                repoInfo: {
                    owner: repo.owner,
                    repo: repo.repo,
                    currentBranch: currentBranch
                }
            });
            spinner.succeed('Pull request description generated successfully');
            return generatedContent;
        }
        catch (retryError) {
            retryAttempt++;
            spinner.fail(`Retry attempt ${retryAttempt - 1} failed`);
            if (retryAttempt <= maxRetries) {
                console.log(chalk.yellow(`⚠️  Attempt ${retryAttempt - 1} failed: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`));
                const { continueRetry } = await inquirer.prompt([{
                        type: 'confirm',
                        name: 'continueRetry',
                        message: `Retry attempt ${retryAttempt - 1} of ${maxRetries} failed. Continue retrying?`,
                        default: true
                    }]);
                if (!continueRetry) {
                    throw retryError;
                }
            }
            else {
                console.log(chalk.red(`❌ All retry attempts failed. Last error: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`));
                throw retryError;
            }
        }
    }
    throw new Error('Failed to generate PR description after retries');
}
// Helper functions for user interaction
function displayGeneratedContent(generatedContent) {
    if (!generatedContent) {
        throw new Error('Failed to generate PR description after retries');
    }
    console.log(chalk.blue('\n📝 Generated Pull Request:'));
    if (generatedContent.summary) {
        console.log(chalk.bold('Summary:'));
        console.log(chalk.cyan(generatedContent.summary));
        console.log();
    }
    console.log(chalk.bold('Title:'));
    console.log(generatedContent.title);
    console.log(chalk.bold('\nDescription:'));
    console.log(generatedContent.body);
}
async function getUserAction() {
    const { action } = await inquirer.prompt([{
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
                { name: '✅ Create the pull request', value: 'create' },
                { name: '✏️  Edit the description', value: 'edit' },
                { name: '❌ Cancel', value: 'cancel' }
            ]
        }]);
    return action;
}
async function editPRContent(generatedContent) {
    const editPrompts = [
        {
            type: 'input',
            name: 'editedTitle',
            message: 'Enter pull request title:',
            default: generatedContent.title
        }
    ];
    if (generatedContent.summary) {
        editPrompts.push({
            type: 'input',
            name: 'editedSummary',
            message: 'Edit pull request summary:',
            default: generatedContent.summary || ''
        });
    }
    editPrompts.push({
        type: 'editor',
        name: 'editedBody',
        message: 'Edit pull request description:',
        default: generatedContent.body
    });
    const editedContent = await inquirer.prompt(editPrompts);
    return {
        title: editedContent.editedTitle,
        body: editedContent.editedBody,
        summary: editedContent.editedSummary !== undefined ? editedContent.editedSummary : generatedContent.summary
    };
}
// Helper functions for PR creation
function applyFallbacks(data) {
    const result = { ...data };
    if (!result.title || result.title.trim() === '') {
        result.title = `${data.jiraTicket}: Auto-generated PR title`;
        console.log(chalk.yellow('⚠️  Warning: Using fallback title as AI did not generate a valid title'));
    }
    if (!result.body || result.body.trim() === '') {
        result.body = 'Auto-generated PR description';
        console.log(chalk.yellow('⚠️  Warning: Using fallback body as AI did not generate a valid description'));
    }
    return result;
}
function displayDryRun(data, options) {
    console.log(chalk.blue('\n🔍 Dry Run - Pull Request Preview:'));
    console.log(chalk.bold('Repository:'), `${data.repo.owner}/${data.repo.repo}`);
    console.log(chalk.bold('From:'), data.currentBranch);
    console.log(chalk.bold('To:'), data.baseBranch);
    console.log(chalk.bold('Title:'), data.title);
    if (data.summary) {
        console.log(chalk.bold('Summary:'), data.summary);
    }
    console.log(chalk.bold('Draft:'), options.draft ? 'Yes' : 'No');
    console.log(chalk.bold('Body:'), data.body);
    console.log(chalk.green('\n✅ Dry run completed. No pull request was created.'));
}
async function createOrUpdatePR(githubService, gitService, data, options, spinner) {
    spinner.start('Ensuring branch is pushed to remote...');
    await gitService.pushCurrentBranch();
    spinner.start('Creating or updating pull request on GitHub...');
    const result = await githubService.createOrUpdatePullRequest(data.repo, {
        title: data.title.trim(),
        body: data.body.trim(),
        head: data.currentBranch.trim(),
        base: data.baseBranch.trim(),
        draft: options.draft
    });
    const pullRequest = result.data;
    const isUpdate = result.isUpdate;
    const draftText = options.draft ? ' draft' : '';
    const actionText = isUpdate ? 'updated' : 'created';
    spinner.succeed(`Pull request${draftText} ${actionText} successfully!`);
    console.log(chalk.green(`\n🎉${options.draft ? ' Draft' : ''} Pull Request ${isUpdate ? 'Updated' : 'Created'}:`));
    console.log(chalk.bold('URL:'), pullRequest.html_url);
    console.log(chalk.bold('Number:'), `#${pullRequest.number}`);
    console.log(chalk.bold('Title:'), pullRequest.title);
    if (isUpdate) {
        console.log(chalk.blue('🔄 Note: Updated existing pull request for this branch'));
    }
    if (options.draft) {
        console.log(chalk.yellow('📝 Note: This is a draft pull request'));
    }
}
export async function createPullRequest(options) {
    const spinner = createSpinner();
    try {
        // Initialize services
        const jiraService = new JiraService();
        const githubService = new GitHubService();
        const gitService = new GitService();
        const aiDescriptionService = new AIDescriptionGeneratorService();
        // Validate repository and check for uncommitted changes
        validateGitRepository();
        const canProceed = await checkUncommittedChanges(gitService);
        if (!canProceed)
            return;
        // Get current branch and resolve Jira ticket
        spinner.start('Analyzing repository and changes...');
        const currentBranch = await gitService.getCurrentBranch();
        const jiraTicket = await resolveJiraTicket(options, currentBranch, spinner);
        // Fetch Jira ticket information with Confluence handling
        const ticketInfo = await fetchJiraTicketWithConfluence(jiraService, jiraTicket, spinner);
        // Validate repository and branch
        const baseBranch = options.base || CONFIG.DEFAULT_BRANCH;
        await validateRepositoryAndBranch(gitService, baseBranch);
        // Get git changes and repository info
        const gitChanges = await gitService.getChanges(baseBranch, true);
        const repo = await githubService.getCurrentRepo();
        spinner.succeed(`Repository: ${repo.owner}/${repo.repo}, Branch: ${currentBranch}`);
        if (gitChanges.totalFiles === 0) {
            throw new Error(`No changes detected between '${baseBranch}' and '${currentBranch}'`);
        }
        console.log(chalk.blue(`\n📊 Changes Summary:`));
        console.log(`   Files changed: ${gitChanges.totalFiles}`);
        console.log(`   Insertions: +${gitChanges.totalInsertions}`);
        console.log(`   Deletions: -${gitChanges.totalDeletions}`);
        // Select PR template
        const selectedTemplate = await selectPRTemplate(githubService, spinner);
        // Get diff content and generate PR description
        spinner.start('Analyzing code changes...');
        const diffContent = await gitService.getDiffContent(baseBranch, 500);
        spinner.succeed('Code analysis complete');
        const generatedContent = await generatePRDescriptionWithRetry(aiDescriptionService, ticketInfo, gitChanges, selectedTemplate, diffContent, options, repo, currentBranch, spinner);
        // Display generated content and get user action
        displayGeneratedContent(generatedContent);
        const action = await getUserAction();
        if (action === 'cancel') {
            console.log(chalk.yellow('❌ Pull request creation cancelled.'));
            return;
        }
        // Handle editing if requested
        let finalContent = generatedContent;
        if (action === 'edit') {
            finalContent = await editPRContent(generatedContent);
        }
        // Debug logging
        console.log(chalk.gray('\n🔍 Debug - AI Generated Content:'));
        console.log(chalk.gray(`Title: "${finalContent.title}"`));
        console.log(chalk.gray(`Summary: "${finalContent.summary}"`));
        console.log(chalk.gray(`Body length: ${finalContent.body?.length || 0} characters`));
        // Validate branches are not empty
        if (!currentBranch || currentBranch.trim() === '') {
            throw new Error('Current branch cannot be empty');
        }
        if (!baseBranch || baseBranch.trim() === '') {
            throw new Error('Base branch cannot be empty');
        }
        // Prepare PR creation data
        const prData = {
            title: finalContent.title,
            body: finalContent.body,
            summary: finalContent.summary,
            currentBranch,
            baseBranch,
            repo,
            jiraTicket
        };
        // Handle dry run or actual PR creation
        if (options.dryRun) {
            displayDryRun(prData, options);
        }
        else {
            const validatedData = applyFallbacks(prData);
            await createOrUpdatePR(githubService, gitService, validatedData, options, spinner);
        }
    }
    catch (error) {
        if (spinner.isSpinning) {
            spinner.fail('Operation failed');
        }
        throw error;
    }
}
//# sourceMappingURL=create-pr.js.map