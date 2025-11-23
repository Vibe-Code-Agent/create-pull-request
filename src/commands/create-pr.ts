import inquirer from 'inquirer';
import chalk from 'chalk';
import open from 'open';
import { createSpinner } from '../utils/spinner.js';
import { JiraService } from '../services/atlassian-facade.js';
import { GitHubService } from '../services/github.js';
import { GitService } from '../services/git.js';
import { AIDescriptionGeneratorService } from '../services/ai-description-generator.js';
import { validateJiraTicket, validateGitRepository, extractJiraTicketFromBranch } from '../utils/validation.js';
import { CONFIG } from '../constants/index.js';
import { CreatePROptions, GeneratePRDescriptionParams, GenerateOptions } from '../interface/pull-request.js';
import { container, ServiceKeys } from '../shared/di/container.js';

// Re-export interfaces for backward compatibility
export type { CreatePROptions, GeneratePRDescriptionParams, GenerateOptions } from '../interface/pull-request.js';

/**
 * Format error message from error object
 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

/**
 * Ask user if they want to retry after initial failure
 */
async function askForRetry(): Promise<boolean> {
  const { retry } = await inquirer.prompt([{
    type: 'confirm',
    name: 'retry',
    message: 'Would you like to retry generating the summary?',
    default: true
  }]);
  return retry;
}

/**
 * Ask user if they want to continue retrying after a failed attempt
 */
async function askToContinueRetry(attemptNumber: number, maxRetries: number): Promise<boolean> {
  const { continueRetry } = await inquirer.prompt([{
    type: 'confirm',
    name: 'continueRetry',
    message: `Retry attempt ${attemptNumber} of ${maxRetries} failed. Continue retrying?`,
    default: true
  }]);
  return continueRetry;
}

/**
 * Generate PR description using AI service
 */
async function generateDescription(
  aiDescriptionService: AIDescriptionGeneratorService,
  options: GenerateOptions
): Promise<any> {
  const result = await aiDescriptionService.generatePRDescription(options);

  if (!result) {
    throw new Error('Failed to generate PR description - AI service returned null or undefined');
  }

  return result;
}

/**
 * Perform retry attempts to generate PR description
 */
async function retryAIDescriptionGeneration(
  aiDescriptionService: AIDescriptionGeneratorService,
  spinner: ReturnType<typeof createSpinner>,
  options: GenerateOptions,
  maxRetries: number
): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      spinner.start(`Retrying pull request description generation (attempt ${attempt}/${maxRetries})...`);
      const content = await generateDescription(aiDescriptionService, options);
      spinner.succeed('Pull request description generated successfully');
      return content;
    } catch (retryError) {
      spinner.fail(`Retry attempt ${attempt} failed`);

      const isLastAttempt = attempt === maxRetries;
      if (isLastAttempt) {
        console.log(chalk.red(`❌ All retry attempts failed. Last error: ${getErrorMessage(retryError)}`));
        throw retryError;
      }

      console.log(chalk.yellow(`⚠️  Attempt ${attempt} failed: ${getErrorMessage(retryError)}`));
      const shouldContinue = await askToContinueRetry(attempt, maxRetries);

      if (!shouldContinue) {
        throw retryError;
      }
    }
  }

  throw new Error('Failed to generate PR description after retries');
}

/**
 * Generate PR description with automatic retry capability
 */
async function generatePRDescriptionWithRetry(params: GeneratePRDescriptionParams): Promise<any> {
  const { aiDescriptionService, spinner, jiraTicket, gitChanges, template, diffContent, prTitle, repoInfo } = params;
  const maxRetries = 3;

  const generateOptions: GenerateOptions = {
    jiraTicket,
    gitChanges,
    template,
    diffContent,
    prTitle,
    repoInfo
  };

  try {
    const content = await generateDescription(aiDescriptionService, generateOptions);
    spinner.succeed('Pull request description generated');
    return content;
  } catch (error) {
    spinner.fail('Failed to generate pull request description');
    console.log(chalk.red(`❌ Error: ${getErrorMessage(error)}`));

    const shouldRetry = await askForRetry();
    if (!shouldRetry) {
      throw error;
    }

    return await retryAIDescriptionGeneration(aiDescriptionService, spinner, generateOptions, maxRetries);
  }
}

/**
 * Validate git repository and check for uncommitted changes
 */
async function validateRepositoryAndChanges(gitService: GitService): Promise<boolean> {
  validateGitRepository();
  await gitService.validateRepository();

  const hasUncommitted = await gitService.hasUncommittedChanges();
  if (hasUncommitted) {
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
  }
  return true;
}

/**
 * Get and validate Jira ticket ID
 */
async function getJiraTicketId(options: CreatePROptions, currentBranch: string): Promise<string> {
  let jiraTicket = options.jira;

  if (!jiraTicket) {
    const extractedTicket = extractJiraTicketFromBranch(currentBranch);
    if (extractedTicket) {
      jiraTicket = extractedTicket;
      console.log(chalk.green(`✅ Detected Jira ticket from branch name: ${jiraTicket}`));
    }
  }

  if (!jiraTicket) {
    const { ticket } = await inquirer.prompt([{
      type: 'input',
      name: 'ticket',
      message: 'Enter Jira ticket ID (e.g., PROJ-123):',
      validate: (input: string) => {
        if (!input.trim()) return 'Jira ticket ID is required';
        if (!validateJiraTicket(input.trim())) {
          return 'Invalid Jira ticket format. Expected format: PROJECT-123';
        }
        return true;
      }
    }]);
    jiraTicket = ticket.trim().toUpperCase();
  }

  if (!jiraTicket || !validateJiraTicket(jiraTicket)) {
    throw new Error(`Invalid Jira ticket format: ${jiraTicket}. Expected format: PROJECT-123`);
  }

  return jiraTicket;
}

/**
 * Handle Jira ticket information and Confluence pages
 */
async function handleJiraTicketInfo(jiraService: JiraService, jiraTicket: string): Promise<any> {
  let ticketInfo = await jiraService.getTicket(jiraTicket);

  console.log(chalk.green(`🎫 Using Jira ticket: ${ticketInfo.key} - ${ticketInfo.summary}`));

  const hasConfluence = await jiraService.hasConfluencePages(jiraTicket);

  if (hasConfluence) {
    console.log(chalk.blue('📄 Found linked Confluence pages'));
    const { includeConfluence } = await inquirer.prompt([{
      type: 'confirm',
      name: 'includeConfluence',
      message: 'Include Confluence page content in PR summary generation?',
      default: false
    }]);

    if (includeConfluence) {
      ticketInfo = await jiraService.getTicket(jiraTicket, true);

      if (ticketInfo.confluencePages && ticketInfo.confluencePages.length > 0) {
        console.log(chalk.blue(`📄 Loaded ${ticketInfo.confluencePages.length} Confluence page(s):`));
        for (const page of ticketInfo.confluencePages) {
          console.log(chalk.blue(`   • ${page.title}`));
        }
      }
    } else {
      console.log(chalk.yellow('⏭️  Skipping Confluence content'));
    }
  }

  return ticketInfo;
}

/**
 * Analyze repository changes and validate branches
 * Uses parallel processing for independent operations
 */
async function analyzeRepositoryChanges(
  gitService: GitService,
  githubService: GitHubService,
  baseBranch: string,
  currentBranch: string
): Promise<{ gitChanges: any; repo: any }> {
  // Parallel: Check branch existence and get current repo (independent operations)
  const [baseExists, repo] = await Promise.all([
    gitService.branchExists(baseBranch),
    githubService.getCurrentRepo()
  ]);

  if (!baseExists) {
    throw new Error(`Base branch '${baseBranch}' does not exist`);
  }

  const gitChanges = await gitService.getChanges(baseBranch, true);

  if (gitChanges.totalFiles === 0) {
    throw new Error(`No changes detected between '${baseBranch}' and '${currentBranch}'`);
  }

  console.log(chalk.blue(`\n📊 Repository: ${repo.owner}/${repo.repo}, Branch: ${currentBranch}`));
  console.log(chalk.blue(`📊 Changes Summary:`));
  console.log(`   Files changed: ${gitChanges.totalFiles}`);
  console.log(`   Insertions: +${gitChanges.totalInsertions}`);
  console.log(`   Deletions: -${gitChanges.totalDeletions}`);

  return { gitChanges, repo };
}

/**
 * Select PR template
 */
async function selectPRTemplate(githubService: GitHubService): Promise<any> {
  const templates = await githubService.getPullRequestTemplates();
  let selectedTemplate = templates.length > 0 ? templates[0] : undefined;

  if (templates.length > 1) {
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
  }

  if (selectedTemplate) {
    console.log(chalk.blue(`📝 Using PR template: ${selectedTemplate.name}`));
  } else {
    console.log(chalk.blue(`📝 No PR template found, using default format`));
  }

  return selectedTemplate;
}

/**
 * Handle content generation and editing loop
 */
async function handleContentGenerationAndEditing(params: {
  aiDescriptionService: AIDescriptionGeneratorService;
  spinner: ReturnType<typeof createSpinner>;
  ticketInfo: any;
  gitChanges: any;
  selectedTemplate: any;
  diffContent: string;
  options: CreatePROptions;
  repo: any;
  currentBranch: string;
}): Promise<{ finalTitle: string; finalBody: string; finalSummary?: string } | null> {
  const { aiDescriptionService, spinner, ticketInfo, gitChanges, selectedTemplate, diffContent, options, repo, currentBranch } = params;
  spinner.start('Generating pull request description with AI...');
  let generatedContent = await generatePRDescriptionWithRetry({
    aiDescriptionService,
    spinner,
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

  let action = '';
  let regenerationCount = 0;

  while (action !== 'create' && action !== 'edit' && action !== 'cancel') {
    if (regenerationCount > 0) {
      console.log(chalk.blue(`\n🔄 Regenerated Pull Request (Attempt ${regenerationCount + 1}):`));
    } else {
      console.log(chalk.blue('\n📝 Generated Pull Request:'));
    }

    if (generatedContent.summary) {
      console.log(chalk.bold('Summary:'));
      console.log(chalk.cyan(generatedContent.summary));
      console.log();
    }

    console.log(chalk.bold('Title:'));
    console.log(generatedContent.title);
    console.log(chalk.bold('\nDescription:'));
    console.log(generatedContent.body);

    const response = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: '✅ Create the pull request', value: 'create' },
        { name: '🔄 Regenerate with AI', value: 'regenerate' },
        { name: '✏️  Edit the description', value: 'edit' },
        { name: '❌ Cancel', value: 'cancel' }
      ]
    }]);

    action = response.action;

    if (action === 'cancel') {
      console.log(chalk.yellow('❌ Pull request creation cancelled.'));
      return null;
    }

    if (action === 'regenerate') {
      regenerationCount++;
      spinner.start(`Regenerating pull request description with AI (attempt ${regenerationCount + 1})...`);
      generatedContent = await generatePRDescriptionWithRetry({
        aiDescriptionService,
        spinner,
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
    }
  }

  if (!generatedContent) {
    throw new Error('Failed to generate PR content. Please try again.');
  }

  let finalTitle = generatedContent.title;
  let finalBody = generatedContent.body;
  let finalSummary = generatedContent.summary;

  console.log(chalk.gray('\n🔍 Debug - AI Generated Content:'));
  console.log(chalk.gray(`Title: "${generatedContent.title}"`));
  console.log(chalk.gray(`Summary: "${generatedContent.summary}"`));
  console.log(chalk.gray(`Body length: ${generatedContent.body?.length || 0} characters`));
  if (regenerationCount > 0) {
    console.log(chalk.gray(`Regenerations: ${regenerationCount}`));
  }

  if (action === 'edit') {
    const editPrompts: any[] = [
      {
        type: 'input',
        name: 'editedTitle',
        message: 'Enter pull request title:',
        default: finalTitle
      }
    ];

    if (generatedContent.summary) {
      editPrompts.push({
        type: 'input',
        name: 'editedSummary',
        message: 'Edit pull request summary:',
        default: finalSummary || ''
      });
    }

    editPrompts.push({
      type: 'editor',
      name: 'editedBody',
      message: 'Edit pull request description:',
      default: finalBody
    });

    const editedContent = await inquirer.prompt(editPrompts);

    finalTitle = editedContent.editedTitle;
    finalBody = editedContent.editedBody;
    finalSummary = editedContent.editedSummary ?? finalSummary;
  }

  return { finalTitle, finalBody, finalSummary };
}

/**
 * Display dry run preview
 */
function displayDryRunPreview(
  repo: any,
  currentBranch: string,
  baseBranch: string,
  finalTitle: string,
  finalBody: string,
  finalSummary: string | undefined,
  options: CreatePROptions
): void {
  console.log(chalk.blue('\n🔍 Dry Run - Pull Request Preview:'));
  console.log(chalk.bold('Repository:'), `${repo.owner}/${repo.repo}`);
  console.log(chalk.bold('From:'), currentBranch);
  console.log(chalk.bold('To:'), baseBranch);
  console.log(chalk.bold('Title:'), finalTitle);
  if (finalSummary) {
    console.log(chalk.bold('Summary:'), finalSummary);
  }
  console.log(chalk.bold('Draft:'), options.draft ? 'Yes' : 'No');
  console.log(chalk.bold('Body:'), finalBody);
  console.log(chalk.green('\n✅ Dry run completed. No pull request was created.'));
}

/**
 * Validate and apply fallbacks for PR content
 */
function validateAndApplyFallbacks(
  finalTitle: string,
  finalBody: string,
  currentBranch: string,
  baseBranch: string,
  jiraTicket: string
): { finalTitle: string; finalBody: string } {
  let validatedTitle = finalTitle;
  let validatedBody = finalBody;

  if (!validatedTitle || validatedTitle.trim() === '') {
    validatedTitle = `${jiraTicket}: Auto-generated PR title`;
    console.log(chalk.yellow('⚠️  Warning: Using fallback title as AI did not generate a valid title'));
  }
  if (!validatedBody || validatedBody.trim() === '') {
    validatedBody = 'Auto-generated PR description';
    console.log(chalk.yellow('⚠️  Warning: Using fallback body as AI did not generate a valid description'));
  }
  if (!currentBranch || currentBranch.trim() === '') {
    throw new Error('Current branch cannot be empty');
  }
  if (!baseBranch || baseBranch.trim() === '') {
    throw new Error('Base branch cannot be empty');
  }

  return { finalTitle: validatedTitle, finalBody: validatedBody };
}

/**
 * Create or update pull request and display results
 */
async function createOrUpdatePR(params: {
  repo: any;
  finalTitle: string;
  finalBody: string;
  currentBranch: string;
  baseBranch: string;
  options: CreatePROptions;
  githubService: GitHubService;
  spinner: ReturnType<typeof createSpinner>;
}): Promise<any> {
  const { repo, finalTitle, finalBody, currentBranch, baseBranch, options, githubService, spinner } = params;

  spinner.start('Creating or updating pull request on GitHub...');

  const result = await githubService.createOrUpdatePullRequest(repo, {
    title: finalTitle.trim(),
    body: finalBody.trim(),
    head: currentBranch.trim(),
    base: baseBranch.trim(),
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

  return pullRequest;
}

/**
 * Handle browser opening for pull request
 */
async function handleBrowserOpening(pullRequest: any): Promise<void> {
  const { openInBrowser } = await inquirer.prompt([{
    type: 'confirm',
    name: 'openInBrowser',
    message: 'Would you like to open the pull request in your browser?',
    default: true
  }]);

  if (openInBrowser) {
    try {
      await open(pullRequest.html_url);
      console.log(chalk.green('✨ Opening pull request in your browser...'));
    } catch (_error) {
      console.log(chalk.yellow(`⚠️  Could not open browser automatically. Please visit: ${pullRequest.html_url}`));
    }
  }
}

/**
 * Handle PR creation or dry run
 */
async function handlePRCreation(params: {
  options: CreatePROptions;
  repo: any;
  currentBranch: string;
  baseBranch: string;
  finalTitle: string;
  finalBody: string;
  finalSummary: string | undefined;
  jiraTicket: string;
  gitService: GitService;
  githubService: GitHubService;
  spinner: ReturnType<typeof createSpinner>;
}): Promise<void> {
  const { options, repo, currentBranch, baseBranch, finalSummary, jiraTicket, gitService, githubService, spinner } = params;
  let { finalTitle, finalBody } = params;

  if (options.dryRun) {
    displayDryRunPreview(repo, currentBranch, baseBranch, finalTitle, finalBody, finalSummary, options);
    return;
  }

  const validatedContent = validateAndApplyFallbacks(finalTitle, finalBody, currentBranch, baseBranch, jiraTicket);
  finalTitle = validatedContent.finalTitle;
  finalBody = validatedContent.finalBody;

  spinner.start('Ensuring branch is pushed to remote...');
  await gitService.pushCurrentBranch();

  const pullRequest = await createOrUpdatePR({
    repo,
    finalTitle,
    finalBody,
    currentBranch,
    baseBranch,
    options,
    githubService,
    spinner
  });

  await handleBrowserOpening(pullRequest);
}

export async function createPullRequest(options: CreatePROptions): Promise<void> {
  const spinner = createSpinner();

  try {
    // Initialize services from DI container
    const jiraService = container.resolve<JiraService>(ServiceKeys.JIRA_SERVICE);
    const githubService = container.resolve<GitHubService>(ServiceKeys.GITHUB_SERVICE);
    const gitService = container.resolve<GitService>(ServiceKeys.GIT_SERVICE);
    const aiDescriptionService = container.resolve<AIDescriptionGeneratorService>(ServiceKeys.AI_DESCRIPTION_SERVICE);

    // Validate repository and check for uncommitted changes
    const shouldProceed = await validateRepositoryAndChanges(gitService);
    if (!shouldProceed) {
      return;
    }

    // Get current branch and Jira ticket
    spinner.start('Analyzing repository and changes...');
    const currentBranch = await gitService.getCurrentBranch();
    const jiraTicket = await getJiraTicketId(options, currentBranch);
    const baseBranch = options.base || CONFIG.DEFAULT_BRANCH;
    spinner.stop();

    // Sequential: Handle operations that may prompt user (avoid inquirer race conditions)
    // First, analyze repository (no user prompts)
    console.log(chalk.blue('\n🔄 Analyzing repository...'));
    const { gitChanges, repo } = await analyzeRepositoryChanges(gitService, githubService, baseBranch, currentBranch);

    // Second, handle Jira ticket info (may prompt for Confluence)
    const ticketInfo = await handleJiraTicketInfo(jiraService, jiraTicket);

    // Third, select PR template (may prompt for template selection)
    const selectedTemplate = await selectPRTemplate(githubService);

    console.log(chalk.green('✅ All information fetched successfully'));

    // Get diff content for better context
    spinner.start('Analyzing code changes...');
    const diffContent = await gitService.getDiffContent(baseBranch, 500);
    spinner.succeed('Code analysis complete');

    // Handle content generation and editing
    const contentResult = await handleContentGenerationAndEditing({
      aiDescriptionService,
      spinner,
      ticketInfo,
      gitChanges,
      selectedTemplate,
      diffContent,
      options,
      repo,
      currentBranch
    });

    if (!contentResult) {
      return; // User cancelled
    }

    const { finalTitle, finalBody, finalSummary } = contentResult;

    // Handle PR creation or dry run
    await handlePRCreation({
      options,
      repo,
      currentBranch,
      baseBranch,
      finalTitle,
      finalBody,
      finalSummary,
      jiraTicket,
      gitService,
      githubService,
      spinner
    });

  } catch (error) {
    if (spinner.isSpinning) {
      spinner.fail('Operation failed');
    }
    throw error;
  }
}
