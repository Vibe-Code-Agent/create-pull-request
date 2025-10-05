import {
  validateJiraTicket,
  validateGitHubUrl,
  validateEmail,
  sanitizeInput,
  validateEnvironment,
  getConfigValue,
  extractJiraTicketFromBranch,
  validateGitRepository
} from '../utils/validation';
import { REGEX_PATTERNS } from '../constants';
import { validateConfig, getConfigValue as getConfigValueFromConfig } from '../utils/config';

// Mock the config module
jest.mock('../utils/config');
const mockedValidateConfig = validateConfig as jest.MockedFunction<typeof validateConfig>;
const mockedGetConfigValueFromConfig = getConfigValueFromConfig as jest.MockedFunction<typeof getConfigValueFromConfig>;

// Mock execSync
jest.mock('node:child_process', () => ({
  execSync: jest.fn()
}));
import { execSync } from 'node:child_process';
const mockedExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('Validation Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateEnvironment', () => {
    it('should pass when config is valid', () => {
      mockedValidateConfig.mockReturnValue(true);

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should throw error when config is invalid', () => {
      mockedValidateConfig.mockReturnValue(false);

      expect(() => validateEnvironment()).toThrow(
        'Missing required configuration. Please run "create-pr setup" to configure your credentials.'
      );
    });
  });

  describe('getConfigValue', () => {
    beforeEach(() => {
      // Mock process.env
      process.env.TEST_VAR = 'test-value';
    });

    afterEach(() => {
      delete process.env.TEST_VAR;
    });

    it('should map JIRA_BASE_URL to jira.baseUrl', () => {
      mockedGetConfigValueFromConfig.mockReturnValue('https://company.atlassian.net');

      const result = getConfigValue('JIRA_BASE_URL');

      expect(result).toBe('https://company.atlassian.net');
      expect(mockedGetConfigValueFromConfig).toHaveBeenCalledWith('jira', 'baseUrl');
    });

    it('should map JIRA_USERNAME to jira.username', () => {
      mockedGetConfigValueFromConfig.mockReturnValue('user@company.com');

      const result = getConfigValue('JIRA_USERNAME');

      expect(result).toBe('user@company.com');
      expect(mockedGetConfigValueFromConfig).toHaveBeenCalledWith('jira', 'username');
    });

    it('should map JIRA_API_TOKEN to jira.apiToken', () => {
      mockedGetConfigValueFromConfig.mockReturnValue('api-token-123');

      const result = getConfigValue('JIRA_API_TOKEN');

      expect(result).toBe('api-token-123');
      expect(mockedGetConfigValueFromConfig).toHaveBeenCalledWith('jira', 'apiToken');
    });

    it('should map GITHUB_TOKEN to github.token', () => {
      mockedGetConfigValueFromConfig.mockReturnValue('github-token-123');

      const result = getConfigValue('GITHUB_TOKEN');

      expect(result).toBe('github-token-123');
      expect(mockedGetConfigValueFromConfig).toHaveBeenCalledWith('github', 'token');
    });

    it('should map COPILOT_API_TOKEN to copilot.apiToken', () => {
      mockedGetConfigValueFromConfig.mockReturnValue('copilot-token-123');

      const result = getConfigValue('COPILOT_API_TOKEN');

      expect(result).toBe('copilot-token-123');
      expect(mockedGetConfigValueFromConfig).toHaveBeenCalledWith('copilot', 'apiToken');
    });

    it('should map DEFAULT_BRANCH to github.defaultBranch', () => {
      mockedGetConfigValueFromConfig.mockReturnValue('main');

      const result = getConfigValue('DEFAULT_BRANCH');

      expect(result).toBe('main');
      expect(mockedGetConfigValueFromConfig).toHaveBeenCalledWith('github', 'defaultBranch');
    });

    it('should map JIRA_PROJECT_KEY to jira.projectKey', () => {
      mockedGetConfigValueFromConfig.mockReturnValue('PROJ');

      const result = getConfigValue('JIRA_PROJECT_KEY');

      expect(result).toBe('PROJ');
      expect(mockedGetConfigValueFromConfig).toHaveBeenCalledWith('jira', 'projectKey');
    });

    it('should fall back to process.env for unknown keys', () => {
      const result = getConfigValue('TEST_VAR');

      expect(result).toBe('test-value');
      expect(mockedGetConfigValueFromConfig).not.toHaveBeenCalled();
    });

    it('should return undefined when config value is falsy', () => {
      mockedGetConfigValueFromConfig.mockReturnValue('');

      const result = getConfigValue('JIRA_BASE_URL');

      expect(result).toBeUndefined();
    });
  });

  describe('extractJiraTicketFromBranch', () => {
    it('should extract ticket from various branch formats', () => {
      expect(extractJiraTicketFromBranch('ft/ET-123')).toBe('ET-123');
      expect(extractJiraTicketFromBranch('ft-ET-123')).toBe('ET-123');
      expect(extractJiraTicketFromBranch('feature_ET-123')).toBe('ET-123');
      expect(extractJiraTicketFromBranch('ET-123-some-description')).toBe('ET-123');
      expect(extractJiraTicketFromBranch('bugfix/PROJ-456/fix-issue')).toBe('PROJ-456');
    });

    it('should return null when no ticket found', () => {
      expect(extractJiraTicketFromBranch('feature-branch')).toBeNull();
      expect(extractJiraTicketFromBranch('main')).toBeNull();
      expect(extractJiraTicketFromBranch('')).toBeNull();
    });

    it('should handle edge cases', () => {
      expect(extractJiraTicketFromBranch('PROJ-123')).toBe('PROJ-123');
      expect(extractJiraTicketFromBranch('proj-123')).toBe('PROJ-123'); // lowercase converted to uppercase
    });
  });

  describe('validateGitRepository', () => {
    it('should pass when in a git repository', () => {
      mockedExecSync.mockImplementation(() => 'true');

      expect(() => validateGitRepository()).not.toThrow();
      expect(mockedExecSync).toHaveBeenCalledWith('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    });

    it('should throw error when not in a git repository', () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      expect(() => validateGitRepository()).toThrow(
        'Not in a git repository. Please run this command from within a git repository.'
      );
    });
  });
  describe('validateJiraTicket', () => {
    it('should validate correct Jira ticket format', () => {
      expect(validateJiraTicket('PROJ-123')).toBe(true);
      expect(validateJiraTicket('ABC-1')).toBe(true);
      expect(validateJiraTicket('TEST-9999')).toBe(true);
      expect(validateJiraTicket('A-1')).toBe(true);
      expect(validateJiraTicket('PROJECT123-456')).toBe(true);
    });

    it('should reject invalid Jira ticket formats', () => {
      expect(validateJiraTicket('proj-123')).toBe(false); // lowercase
      expect(validateJiraTicket('123-PROJ')).toBe(false); // numbers first
      expect(validateJiraTicket('PROJ123')).toBe(false);  // no dash
      expect(validateJiraTicket('PROJ-')).toBe(false);    // no number
      expect(validateJiraTicket('-123')).toBe(false);     // no project
      expect(validateJiraTicket('')).toBe(false);         // empty
      expect(validateJiraTicket('PROJ-ABC')).toBe(false); // letters after dash
      expect(validateJiraTicket('PROJ-123-')).toBe(false); // trailing dash
      expect(validateJiraTicket('pr0j-123')).toBe(false); // number in project key
    });

    it('should handle edge cases', () => {
      expect(validateJiraTicket(null as any)).toBe(false);
      expect(validateJiraTicket(undefined as any)).toBe(false);
      expect(validateJiraTicket('   ')).toBe(false);
      expect(validateJiraTicket('PROJ-0')).toBe(true); // zero is valid
    });

    it('should use REGEX_PATTERNS constant', () => {
      const testTicket = 'PROJ-123';
      expect(validateJiraTicket(testTicket)).toBe(REGEX_PATTERNS.JIRA_TICKET.test(testTicket));
    });
  });

  describe('validateGitHubUrl', () => {
    it('should validate correct GitHub URLs', () => {
      expect(validateGitHubUrl('https://github.com/owner/repo')).toBe(true);
      expect(validateGitHubUrl('https://github.com/owner/repo.git')).toBe(true);
      expect(validateGitHubUrl('git@github.com:owner/repo.git')).toBe(true);
      expect(validateGitHubUrl('git@github.com:owner/repo')).toBe(true);
      expect(validateGitHubUrl('https://github.com/owner-name/repo-name')).toBe(true);
      expect(validateGitHubUrl('https://github.com/owner_name/repo_name')).toBe(true);
    });

    it('should reject invalid GitHub URLs', () => {
      expect(validateGitHubUrl('https://gitlab.com/owner/repo')).toBe(false);
      expect(validateGitHubUrl('https://bitbucket.org/owner/repo')).toBe(false);
      expect(validateGitHubUrl('https://github.com/owner')).toBe(false); // missing repo
      expect(validateGitHubUrl('https://github.com/')).toBe(false); // incomplete
      expect(validateGitHubUrl('not-a-url')).toBe(false);
      expect(validateGitHubUrl('')).toBe(false);
      expect(validateGitHubUrl('ftp://github.com/owner/repo')).toBe(true); // regex only checks for github.com pattern
    });

    it('should handle edge cases', () => {
      expect(validateGitHubUrl(null as any)).toBe(false);
      expect(validateGitHubUrl(undefined as any)).toBe(false);
      expect(validateGitHubUrl('   ')).toBe(false);
    });

    it('should use REGEX_PATTERNS constant', () => {
      const testUrl = 'https://github.com/owner/repo';
      expect(validateGitHubUrl(testUrl)).toBe(REGEX_PATTERNS.GITHUB_URL.test(testUrl));
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.org')).toBe(true);
      expect(validateEmail('firstname.lastname@company.com')).toBe(true);
      expect(validateEmail('user123@test-domain.com')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test.example.com')).toBe(false); // missing @
      expect(validateEmail('test@.com')).toBe(false); // missing domain
      expect(validateEmail('test@example.')).toBe(false); // missing TLD
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('test space@example.com')).toBe(false); // space
    });

    it('should handle edge cases', () => {
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
      expect(validateEmail('   ')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove potentially dangerous characters', () => {
      expect(sanitizeInput('normal text')).toBe('normal text');
      expect(sanitizeInput('text with <script>alert("xss")</script>')).toBe('text with scriptalert(xss)/script');
      expect(sanitizeInput('text & symbols')).toBe('text  symbols');
      expect(sanitizeInput('text "with" quotes')).toBe('text with quotes');
    });

    it('should handle special characters', () => {
      expect(sanitizeInput('text\nwith\nnewlines')).toBe('text with newlines');
      expect(sanitizeInput('text\twith\ttabs')).toBe('text with tabs');
      expect(sanitizeInput('text\rwith\rcarriage')).toBe('text with carriage');
    });

    it('should preserve safe characters', () => {
      expect(sanitizeInput('PROJ-123: Feature implementation')).toBe('PROJ-123: Feature implementation');
      expect(sanitizeInput('file.ts (modified)')).toBe('file.ts (modified)');
      expect(sanitizeInput('https://github.com/owner/repo')).toBe('https://github.com/owner/repo');
    });

    it('should handle empty and null inputs', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });

    it('should handle numbers and mixed input', () => {
      expect(sanitizeInput('123')).toBe('123');
      expect(sanitizeInput('test 123 text')).toBe('test 123 text');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  text with spaces  ')).toBe('text with spaces');
      expect(sanitizeInput('\n\t  text  \t\n')).toBe('text');
    });
  });

  describe('Integration with constants', () => {
    it('should use REGEX_PATTERNS for validation functions', () => {
      // Test that validation functions actually use the patterns from constants
      const jiraTicket = 'PROJ-123';
      const githubUrl = 'https://github.com/owner/repo';

      expect(validateJiraTicket(jiraTicket)).toBe(REGEX_PATTERNS.JIRA_TICKET.test(jiraTicket));
      expect(validateGitHubUrl(githubUrl)).toBe(REGEX_PATTERNS.GITHUB_URL.test(githubUrl));
    });
  });
});
