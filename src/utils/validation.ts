import { validateConfig, getConfigValue as getConfigValueFromConfig } from './config.js';
import { REGEX_PATTERNS, ENV_KEYS, CONFIG_SECTIONS } from '../constants/index.js';
import { execSync } from 'node:child_process';

export function validateEnvironment(): void {
  if (!validateConfig()) {
    throw new Error(
      'Missing required configuration. Please run "create-pr setup" to configure your credentials.\n' +
      'Run "create-pr config" for setup instructions.'
    );
  }
}

export function getConfigValue(key: string): string | undefined {
  // Map legacy environment variable names to new config structure
  switch (key) {
    case ENV_KEYS.JIRA_BASE_URL:
      return getConfigValueFromConfig(CONFIG_SECTIONS.JIRA, 'baseUrl') || undefined;
    case ENV_KEYS.JIRA_USERNAME:
      return getConfigValueFromConfig(CONFIG_SECTIONS.JIRA, 'username') || undefined;
    case ENV_KEYS.JIRA_API_TOKEN:
      return getConfigValueFromConfig(CONFIG_SECTIONS.JIRA, 'apiToken') || undefined;
    case ENV_KEYS.GITHUB_TOKEN:
      return getConfigValueFromConfig(CONFIG_SECTIONS.GITHUB, 'token') || undefined;
    case ENV_KEYS.COPILOT_API_TOKEN:
      return getConfigValueFromConfig(CONFIG_SECTIONS.COPILOT, 'apiToken') || undefined;
    case ENV_KEYS.DEFAULT_BRANCH:
      return getConfigValueFromConfig(CONFIG_SECTIONS.GITHUB, 'defaultBranch') || undefined;
    case ENV_KEYS.JIRA_PROJECT_KEY:
      return getConfigValueFromConfig(CONFIG_SECTIONS.JIRA, 'projectKey') || undefined;
    default:
      // For other environment variables, fall back to process.env
      return process.env[key];
  }
}

export function validateJiraTicket(ticket: string): boolean {
  // Basic Jira ticket format validation (PROJECT-123)
  return REGEX_PATTERNS.JIRA_TICKET.test(ticket);
}

export function extractJiraTicketFromBranch(branchName: string): string | null {
  // Extract Jira ticket ID from branch names like:
  // - ft/ET-123 -> ET-123
  // - ft-ET-123 -> ET-123
  // - feature_ET-123 -> ET-123
  // - ET-123-some-description -> ET-123
  // - bugfix/PROJ-456/fix-issue -> PROJ-456
  const match = REGEX_PATTERNS.JIRA_TICKET_FROM_BRANCH.exec(branchName);
  return match ? match[1].toUpperCase() : null;
}

export function validateGitRepository(): void {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
  } catch {
    throw new Error('Not in a git repository. Please run this command from within a git repository.');
  }
}

export function validateGitHubUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  return REGEX_PATTERNS.GITHUB_URL.test(url);
}

export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replaceAll('<', '') // Remove potential HTML tags
    .replaceAll('>', '') // Remove potential HTML tags
    .replaceAll('&', '') // Remove potentially dangerous characters
    .replaceAll('"', '') // Remove potentially dangerous characters
    .replaceAll("'", '') // Remove potentially dangerous characters
    .replaceAll('\r', ' ') // Replace carriage returns with spaces
    .replaceAll('\n', ' ') // Replace newlines with spaces
    .replaceAll('\t', ' ') // Replace tabs with spaces
    .trim(); // Remove leading/trailing whitespace
}
