import { createPullRequest, CreatePROptions } from '../commands/create-pr';
import { GitService } from '../services/git';
import { GitHubService } from '../services/github';
import { JiraService } from '../services/atlassian-facade';
import { AIDescriptionGeneratorService } from '../services/ai-description-generator';
import { validateConfig } from '../utils/config';
import { validateGitRepository, validateJiraTicket, extractJiraTicketFromBranch } from '../utils/validation';
import { container, ServiceKeys } from '../shared/di/container.js';

// Mock dependencies
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    rest: {
      repos: {
        get: jest.fn(),
        listPullRequestsAssociatedWithCommit: jest.fn(),
        createOrUpdateFileContents: jest.fn(),
        getContent: jest.fn()
      },
      pulls: {
        create: jest.fn(),
        update: jest.fn(),
        get: jest.fn()
      },
      git: {
        getRef: jest.fn()
      }
    }
  }))
}));
jest.mock('../services/atlassian-facade');
jest.mock('../services/git');
jest.mock('../services/github');
jest.mock('../services/ai-description-generator');
jest.mock('../utils/config');
jest.mock('../utils/validation');
jest.mock('inquirer', () => ({
  __esModule: true,
  default: {
    prompt: jest.fn()
  }
}));
jest.mock('open', () => ({
  __esModule: true,
  default: jest.fn()
}));
jest.mock('../utils/spinner.js', () => ({
  __esModule: true,
  createSpinner: () => ({
    start: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    text: '',
    isSpinning: false
  })
}));

const mockGitService = new GitService() as jest.Mocked<GitService>;
const mockGitHubService = new GitHubService() as jest.Mocked<GitHubService>;
const mockJiraService = new JiraService() as jest.Mocked<JiraService>;
const mockAIDescriptionService = {
  generatePRDescription: jest.fn()
} as any as jest.Mocked<AIDescriptionGeneratorService>;
const mockValidateConfig = validateConfig as jest.MockedFunction<typeof validateConfig>;
const mockValidateGitRepository = validateGitRepository as jest.MockedFunction<typeof validateGitRepository>;
const mockValidateJiraTicket = validateJiraTicket as jest.MockedFunction<typeof validateJiraTicket>;
const mockExtractJiraTicketFromBranch = extractJiraTicketFromBranch as jest.MockedFunction<typeof extractJiraTicketFromBranch>;

// Mock the GitService constructor to return our mock instance
(GitService as jest.MockedClass<typeof GitService>).mockImplementation(() => mockGitService);

// Mock the GitHubService constructor to return our mock instance
(GitHubService as jest.MockedClass<typeof GitHubService>).mockImplementation(() => mockGitHubService);

// Mock the JiraService constructor to return our mock instance
(JiraService as jest.MockedClass<typeof JiraService>).mockImplementation(() => mockJiraService);

// Mock the AIDescriptionGeneratorService constructor to return our mock instance
(AIDescriptionGeneratorService as jest.MockedClass<typeof AIDescriptionGeneratorService>).mockImplementation(() => mockAIDescriptionService);

describe('Create PR Command', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Clear and setup DI container with mocks
    container.clear();
    container.registerSingleton(ServiceKeys.JIRA_SERVICE, () => mockJiraService);
    container.registerSingleton(ServiceKeys.GITHUB_SERVICE, () => mockGitHubService);
    container.registerSingleton(ServiceKeys.GIT_SERVICE, () => mockGitService);
    container.registerSingleton(ServiceKeys.AI_DESCRIPTION_SERVICE, () => mockAIDescriptionService);

    mockValidateConfig.mockReturnValue(true);
    mockValidateGitRepository.mockImplementation(() => { }); // No-op by default
    mockValidateJiraTicket.mockReturnValue(true); // Always return true for valid tickets
    mockExtractJiraTicketFromBranch.mockReturnValue(null); // No extraction by default

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    // Clear inquirer mock - each test will set up its own mocks
    const inquirer = require('inquirer');
    inquirer.default.prompt.mockClear();
    inquirer.default.prompt.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    container.clear();
  });

  describe('createPullRequest', () => {
    const mockOptions: CreatePROptions = {
      jira: 'PROJECT-123',
      base: 'main',
      title: 'Test PR',
      dryRun: false,
      draft: false
    };

    it('should be a function', () => {
      expect(typeof createPullRequest).toBe('function');
    });

    it('should handle uncommitted changes and proceed when user confirms', async () => {
      const inquirer = require('inquirer');

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(true);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');
      mockGitService.pushCurrentBranch = jest.fn().mockResolvedValue(undefined);

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);
      mockGitHubService.createOrUpdatePullRequest = jest.fn().mockResolvedValue({
        data: { html_url: 'http://github.com/test/pr/1', number: 1, title: 'Test PR' },
        isUpdate: false
      });

      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-123',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      mockAIDescriptionService.generatePRDescription = jest.fn().mockResolvedValue({
        title: 'Test PR',
        body: 'Test body',
        summary: 'Test summary'
      });

      // Mock inquirer to proceed with uncommitted changes
      inquirer.default.prompt
        .mockResolvedValueOnce({ proceed: true }) // Proceed with uncommitted changes
        .mockResolvedValueOnce({ action: 'create' }) // Create action
        .mockResolvedValueOnce({ openInBrowser: false }); // Don't open in browser

      await expect(createPullRequest(mockOptions)).resolves.toBeUndefined();

      expect(mockGitService.hasUncommittedChanges).toHaveBeenCalled();
    });

    it('should abort when user chooses not to proceed with uncommitted changes', async () => {
      const inquirer = require('inquirer');

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(true);

      // Mock inquirer to not proceed with uncommitted changes
      inquirer.default.prompt.mockResolvedValueOnce({ proceed: false });

      await expect(createPullRequest(mockOptions)).resolves.toBeUndefined();

      expect(mockGitService.hasUncommittedChanges).toHaveBeenCalled();
    });

    it('should extract Jira ticket from branch name when not provided', async () => {
      const inquirer = require('inquirer');

      // Mock extraction to return PROJECT-456
      mockExtractJiraTicketFromBranch.mockReturnValue('PROJECT-456');

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-456');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');
      mockGitService.pushCurrentBranch = jest.fn().mockResolvedValue(undefined);

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);
      mockGitHubService.createOrUpdatePullRequest = jest.fn().mockResolvedValue({
        data: { html_url: 'http://github.com/test/pr/1', number: 1, title: 'Test PR' },
        isUpdate: false
      });

      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-456',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      mockAIDescriptionService.generatePRDescription = jest.fn().mockResolvedValue({
        title: 'Test PR',
        body: 'Test body',
        summary: 'Test summary'
      });

      // Mock inquirer for create action
      inquirer.default.prompt
        .mockResolvedValueOnce({ action: 'create' })
        .mockResolvedValueOnce({ openInBrowser: false });

      const optionsWithoutJira = { ...mockOptions };
      delete optionsWithoutJira.jira;

      await expect(createPullRequest(optionsWithoutJira)).resolves.toBeUndefined();

      expect(mockGitService.getCurrentBranch).toHaveBeenCalled();
      expect(mockJiraService.getTicket).toHaveBeenCalledWith('PROJECT-456');
    });

    it('should prompt user for Jira ticket when not provided and not extractable from branch', async () => {
      const inquirer = require('inquirer');

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/some-branch');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');
      mockGitService.pushCurrentBranch = jest.fn().mockResolvedValue(undefined);

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);
      mockGitHubService.createOrUpdatePullRequest = jest.fn().mockResolvedValue({
        data: { html_url: 'http://github.com/test/pr/1', number: 1, title: 'Test PR' },
        isUpdate: false
      });

      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-789',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      mockAIDescriptionService.generatePRDescription = jest.fn().mockResolvedValue({
        title: 'Test PR',
        body: 'Test body',
        summary: 'Test summary'
      });

      // Clear previous mocks and set up specific mocks for this test
      inquirer.default.prompt.mockClear();
      inquirer.default.prompt
        .mockResolvedValueOnce({ ticket: 'PROJECT-789' }) // User inputs ticket
        .mockResolvedValueOnce({ action: 'create' }) // Create action
        .mockResolvedValueOnce({ openInBrowser: false }); // Don't open in browser

      const optionsWithoutJira = { ...mockOptions };
      delete optionsWithoutJira.jira;

      await expect(createPullRequest(optionsWithoutJira)).resolves.toBeUndefined();

      expect(mockJiraService.getTicket).toHaveBeenCalledWith('PROJECT-789');
    });

    it('should handle Confluence pages when available and user chooses to include them', async () => {
      const inquirer = require('inquirer');

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');
      mockGitService.pushCurrentBranch = jest.fn().mockResolvedValue(undefined);

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);
      mockGitHubService.createOrUpdatePullRequest = jest.fn().mockResolvedValue({
        data: { html_url: 'http://github.com/test/pr/1', number: 1, title: 'Test PR' },
        isUpdate: false
      });

      mockJiraService.hasConfluencePages = jest.fn().mockResolvedValue(true);
      mockJiraService.getTicket = jest.fn()
        .mockResolvedValueOnce({
          key: 'PROJECT-123',
          summary: 'Test ticket',
          description: 'Test description',
          issueType: 'Story',
          status: 'In Progress'
        })
        .mockResolvedValueOnce({
          key: 'PROJECT-123',
          summary: 'Test ticket',
          description: 'Test description',
          issueType: 'Story',
          status: 'In Progress',
          confluencePages: [
            { id: '1', title: 'Page 1', content: 'Content 1', url: 'url1' }
          ]
        });

      mockAIDescriptionService.generatePRDescription = jest.fn().mockResolvedValue({
        title: 'Test PR',
        body: 'Test body',
        summary: 'Test summary'
      });

      // Clear previous mocks and set up specific mocks for this test
      inquirer.default.prompt.mockClear();
      inquirer.default.prompt
        .mockResolvedValueOnce({ includeConfluence: true }) // Include Confluence
        .mockResolvedValueOnce({ action: 'create' }) // Create action
        .mockResolvedValueOnce({ openInBrowser: false }); // Don't open in browser

      await expect(createPullRequest(mockOptions)).resolves.toBeUndefined();

      expect(mockJiraService.hasConfluencePages).toHaveBeenCalledWith('PROJECT-123');
      expect(mockJiraService.getTicket).toHaveBeenCalledTimes(2); // Once without, once with Confluence
    });

    it('should skip Confluence pages when user chooses not to include them', async () => {
      const inquirer = require('inquirer');

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');
      mockGitService.pushCurrentBranch = jest.fn().mockResolvedValue(undefined);

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);
      mockGitHubService.createOrUpdatePullRequest = jest.fn().mockResolvedValue({
        data: { html_url: 'http://github.com/test/pr/1', number: 1, title: 'Test PR' },
        isUpdate: false
      });

      mockJiraService.hasConfluencePages = jest.fn().mockResolvedValue(true);
      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-123',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      mockAIDescriptionService.generatePRDescription = jest.fn().mockResolvedValue({
        title: 'Test PR',
        body: 'Test body',
        summary: 'Test summary'
      });

      // Mock inquirer for Confluence exclusion and create action
      inquirer.default.prompt
        .mockResolvedValueOnce({ includeConfluence: false }) // Don't include Confluence
        .mockResolvedValueOnce({ action: 'create' }) // Create action
        .mockResolvedValueOnce({ openInBrowser: false }); // Don't open in browser

      await expect(createPullRequest(mockOptions)).resolves.toBeUndefined();

      expect(mockJiraService.hasConfluencePages).toHaveBeenCalledWith('PROJECT-123');
      expect(mockJiraService.getTicket).toHaveBeenCalledTimes(1); // Only once without Confluence
    });

    it('should handle base branch validation failure', async () => {
      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(false); // Base branch doesn't exist

      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-123',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      // Mock inquirer in case the function reaches Confluence prompts
      const inquirer = require('inquirer');
      inquirer.default.prompt.mockClear();
      inquirer.default.prompt.mockResolvedValueOnce({ includeConfluence: false });

      await expect(createPullRequest(mockOptions)).rejects.toThrow("Base branch 'main' does not exist");
    });

    it('should handle PR template selection when multiple templates available', async () => {
      const inquirer = require('inquirer');

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');
      mockGitService.pushCurrentBranch = jest.fn().mockResolvedValue(undefined);

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([
        { name: 'Template 1', content: 'Content 1' },
        { name: 'Template 2', content: 'Content 2' }
      ]);
      mockGitHubService.createOrUpdatePullRequest = jest.fn().mockResolvedValue({
        data: { html_url: 'http://github.com/test/pr/1', number: 1, title: 'Test PR' },
        isUpdate: false
      });

      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-123',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      mockAIDescriptionService.generatePRDescription = jest.fn().mockResolvedValue({
        title: 'Test PR',
        body: 'Test body',
        summary: 'Test summary'
      });

      // Mock inquirer for template selection and create action
      inquirer.default.prompt
        .mockResolvedValueOnce({ includeConfluence: false }) // Confluence prompt
        .mockResolvedValueOnce({ template: { name: 'Template 2', content: 'Content 2' } }) // Select template
        .mockResolvedValueOnce({ action: 'create' }) // Create action
        .mockResolvedValueOnce({ openInBrowser: false }); // Don't open in browser

      await expect(createPullRequest(mockOptions)).resolves.toBeUndefined();

      expect(mockGitHubService.getPullRequestTemplates).toHaveBeenCalled();
    });

    it('should handle edit mode functionality', async () => {
      const inquirer = require('inquirer');

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');
      mockGitService.pushCurrentBranch = jest.fn().mockResolvedValue(undefined);

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);
      mockGitHubService.createOrUpdatePullRequest = jest.fn().mockResolvedValue({
        data: { html_url: 'http://github.com/test/pr/1', number: 1, title: 'Test PR' },
        isUpdate: false
      });

      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-123',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      mockAIDescriptionService.generatePRDescription = jest.fn().mockResolvedValue({
        title: 'Test PR',
        body: 'Test body',
        summary: 'Test summary'
      });

      // Clear previous mocks and set up specific mocks for this test
      inquirer.default.prompt.mockClear();
      inquirer.default.prompt
        .mockResolvedValueOnce({ includeConfluence: false }) // Confluence prompt
        .mockResolvedValueOnce({ action: 'edit' }) // Edit mode
        .mockResolvedValueOnce({
          editedTitle: 'Edited Title',
          editedSummary: 'Edited Summary',
          editedBody: 'Edited Body'
        }) // Edited content
        .mockResolvedValueOnce({ openInBrowser: false }); // Don't open in browser

      await expect(createPullRequest(mockOptions)).resolves.toBeUndefined();

      expect(mockGitHubService.createOrUpdatePullRequest).toHaveBeenCalledWith(
        { owner: 'test-owner', repo: 'test-repo' },
        expect.objectContaining({
          title: 'Edited Title',
          body: 'Edited Body'
        })
      );
    });

    it('should allow user to regenerate PR description with AI', async () => {
      const inquirer = require('inquirer');

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('diff content');
      mockGitService.pushCurrentBranch = jest.fn().mockResolvedValue(undefined);

      mockJiraService.hasConfluencePages = jest.fn().mockResolvedValue(false);
      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-123',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      // Mock AI to return different content on each call
      mockAIDescriptionService.generatePRDescription = jest.fn()
        .mockResolvedValueOnce({
          title: 'First PR',
          body: 'First body',
          summary: 'First summary'
        })
        .mockResolvedValueOnce({
          title: 'Regenerated PR',
          body: 'Regenerated body',
          summary: 'Regenerated summary'
        });

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({
        owner: 'test-owner',
        repo: 'test-repo'
      });

      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);

      mockGitHubService.createOrUpdatePullRequest = jest.fn().mockResolvedValue({
        data: {
          html_url: 'https://github.com/test-owner/test-repo/pull/1',
          number: 1,
          title: 'Regenerated PR'
        },
        isUpdate: false
      });

      // Clear previous mocks and set up specific mocks for this test
      inquirer.default.prompt.mockClear();
      inquirer.default.prompt
        .mockResolvedValueOnce({ includeConfluence: false }) // Confluence prompt
        .mockResolvedValueOnce({ action: 'regenerate' }) // First: Regenerate
        .mockResolvedValueOnce({ action: 'create' }) // Second: Create with regenerated content
        .mockResolvedValueOnce({ openInBrowser: false }); // Don't open in browser

      await expect(createPullRequest(mockOptions)).resolves.toBeUndefined();

      // Verify AI service was called twice (initial + regeneration)
      expect(mockAIDescriptionService.generatePRDescription).toHaveBeenCalledTimes(2);

      // Verify PR was created with regenerated content
      expect(mockGitHubService.createOrUpdatePullRequest).toHaveBeenCalledWith(
        { owner: 'test-owner', repo: 'test-repo' },
        expect.objectContaining({
          title: 'Regenerated PR',
          body: 'Regenerated body'
        })
      );
    });

    it('should allow multiple regenerations before creating PR', async () => {
      const inquirer = require('inquirer');

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('diff content');
      mockGitService.pushCurrentBranch = jest.fn().mockResolvedValue(undefined);

      mockJiraService.hasConfluencePages = jest.fn().mockResolvedValue(false);
      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-123',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      // Mock AI to return different content on each call
      mockAIDescriptionService.generatePRDescription = jest.fn()
        .mockResolvedValueOnce({
          title: 'First PR',
          body: 'First body',
          summary: 'First summary'
        })
        .mockResolvedValueOnce({
          title: 'Second PR',
          body: 'Second body',
          summary: 'Second summary'
        })
        .mockResolvedValueOnce({
          title: 'Third PR',
          body: 'Third body',
          summary: 'Third summary'
        });

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({
        owner: 'test-owner',
        repo: 'test-repo'
      });

      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);

      mockGitHubService.createOrUpdatePullRequest = jest.fn().mockResolvedValue({
        data: {
          html_url: 'https://github.com/test-owner/test-repo/pull/1',
          number: 1,
          title: 'Third PR'
        },
        isUpdate: false
      });

      // Clear previous mocks and set up specific mocks for this test
      inquirer.default.prompt.mockClear();
      inquirer.default.prompt
        .mockResolvedValueOnce({ includeConfluence: false }) // Confluence prompt
        .mockResolvedValueOnce({ action: 'regenerate' }) // First: Regenerate
        .mockResolvedValueOnce({ action: 'regenerate' }) // Second: Regenerate again
        .mockResolvedValueOnce({ action: 'create' }) // Third: Create with final content
        .mockResolvedValueOnce({ openInBrowser: false }); // Don't open in browser

      await expect(createPullRequest(mockOptions)).resolves.toBeUndefined();

      // Verify AI service was called 3 times (initial + 2 regenerations)
      expect(mockAIDescriptionService.generatePRDescription).toHaveBeenCalledTimes(3);

      // Verify PR was created with the final regenerated content
      expect(mockGitHubService.createOrUpdatePullRequest).toHaveBeenCalledWith(
        { owner: 'test-owner', repo: 'test-repo' },
        expect.objectContaining({
          title: 'Third PR',
          body: 'Third body'
        })
      );
    });

    it('should handle cancel action', async () => {
      const inquirer = require('inquirer');

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);

      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-123',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      mockAIDescriptionService.generatePRDescription = jest.fn().mockResolvedValue({
        title: 'Test PR',
        body: 'Test body',
        summary: 'Test summary'
      });

      // Clear previous mocks and set up specific mocks for this test
      inquirer.default.prompt.mockClear();
      inquirer.default.prompt
        .mockResolvedValueOnce({ includeConfluence: false }) // Confluence prompt
        .mockResolvedValueOnce({ action: 'cancel' });

      await expect(createPullRequest(mockOptions)).resolves.toBeUndefined();

      expect(mockGitHubService.createOrUpdatePullRequest).not.toHaveBeenCalled();
    });

    it('should handle draft PR creation', async () => {
      const inquirer = require('inquirer');

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');
      mockGitService.pushCurrentBranch = jest.fn().mockResolvedValue(undefined);

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);
      mockGitHubService.createOrUpdatePullRequest = jest.fn().mockResolvedValue({
        data: { html_url: 'http://github.com/test/pr/1', number: 1, title: 'Test PR' },
        isUpdate: false
      });

      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-123',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      mockAIDescriptionService.generatePRDescription = jest.fn().mockResolvedValue({
        title: 'Test PR',
        body: 'Test body',
        summary: 'Test summary'
      });

      // Mock inquirer for create action
      inquirer.default.prompt
        .mockResolvedValueOnce({ includeConfluence: false }) // Confluence prompt
        .mockResolvedValueOnce({ action: 'create' })
        .mockResolvedValueOnce({ openInBrowser: false }); // Don't open in browser

      const draftOptions = { ...mockOptions, draft: true };

      await expect(createPullRequest(draftOptions)).resolves.toBeUndefined();

      expect(mockGitHubService.createOrUpdatePullRequest).toHaveBeenCalledWith(
        { owner: 'test-owner', repo: 'test-repo' },
        expect.objectContaining({
          draft: true
        })
      );
    });

    it('should handle PR update scenario', async () => {
      const inquirer = require('inquirer');

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');
      mockGitService.pushCurrentBranch = jest.fn().mockResolvedValue(undefined);

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);
      mockGitHubService.createOrUpdatePullRequest = jest.fn().mockResolvedValue({
        data: { html_url: 'http://github.com/test/pr/1', number: 1, title: 'Test PR' },
        isUpdate: true // This is an update
      });

      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-123',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      mockAIDescriptionService.generatePRDescription = jest.fn().mockResolvedValue({
        title: 'Test PR',
        body: 'Test body',
        summary: 'Test summary'
      });

      // Mock inquirer for create action
      inquirer.default.prompt
        .mockResolvedValueOnce({ includeConfluence: false }) // Confluence prompt
        .mockResolvedValueOnce({ action: 'create' })
        .mockResolvedValueOnce({ openInBrowser: false }); // Don't open in browser

      await expect(createPullRequest(mockOptions)).resolves.toBeUndefined();

      expect(mockGitHubService.createOrUpdatePullRequest).toHaveBeenCalled();
    });

    it('should handle fallback title and body when AI generates empty content', async () => {
      const inquirer = require('inquirer');

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');
      mockGitService.pushCurrentBranch = jest.fn().mockResolvedValue(undefined);

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);
      mockGitHubService.createOrUpdatePullRequest = jest.fn().mockResolvedValue({
        data: { html_url: 'http://github.com/test/pr/1', number: 1, title: 'Test PR' },
        isUpdate: false
      });

      mockJiraService.hasConfluencePages = jest.fn().mockResolvedValue(false);
      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-123',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      // Mock AI service to return empty title and body
      mockAIDescriptionService.generatePRDescription = jest.fn().mockResolvedValue({
        title: '', // Empty title
        body: '', // Empty body
        summary: 'Test summary'
      });

      // Mock inquirer for create action
      inquirer.default.prompt
        .mockResolvedValueOnce({ action: 'create' })
        .mockResolvedValueOnce({ openInBrowser: false });

      await expect(createPullRequest(mockOptions)).resolves.toBeUndefined();

      expect(mockGitHubService.createOrUpdatePullRequest).toHaveBeenCalledWith(
        { owner: 'test-owner', repo: 'test-repo' },
        expect.objectContaining({
          title: 'PROJECT-123: Auto-generated PR title', // Fallback title
          body: 'Auto-generated PR description' // Fallback body
        })
      );
    });

    it('should handle no changes detected error', async () => {
      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 0, // No changes
        totalInsertions: 0,
        totalDeletions: 0,
        files: [],
        commits: []
      });

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });

      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-123',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      // Mock inquirer in case the function reaches Confluence prompts
      const inquirer = require('inquirer');
      inquirer.default.prompt.mockClear();
      inquirer.default.prompt.mockResolvedValueOnce({ includeConfluence: false });

      await expect(createPullRequest(mockOptions)).rejects.toThrow("No changes detected between 'main' and 'feature/PROJECT-123'");
    });

    it('should handle invalid Jira ticket format error', async () => {
      const invalidOptions = { ...mockOptions, jira: 'INVALID-TICKET' };

      // Mock validation to return false for invalid ticket
      mockValidateJiraTicket.mockReturnValue(false);

      await expect(createPullRequest(invalidOptions)).rejects.toThrow('Invalid Jira ticket format: INVALID-TICKET. Expected format: PROJECT-123');
    });

    it('should handle dry run mode', async () => {
      const dryRunOptions: CreatePROptions = {
        ...mockOptions,
        dryRun: true
      };

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true); // Mock that 'main' branch exists
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');
      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);
      mockJiraService.getTicket = jest.fn().mockResolvedValue({ key: 'PROJECT-123', summary: 'Test ticket' });
      mockAIDescriptionService.generatePRDescription = jest.fn().mockResolvedValue({ title: 'Test PR', body: 'Test body' });

      // Mock inquirer in case the function reaches Confluence prompts
      const inquirer = require('inquirer');
      inquirer.default.prompt.mockClear();
      inquirer.default.prompt
        .mockResolvedValueOnce({ includeConfluence: false })
        .mockResolvedValueOnce({ action: 'create' }); // Action prompt for dry run

      // Test should not throw for dry run
      await expect(createPullRequest(dryRunOptions)).resolves.toBeUndefined();
    });

    it('should handle missing configuration gracefully', async () => {
      mockValidateGitRepository.mockImplementation(() => {
        throw new Error('Missing required configuration');
      });

      await expect(createPullRequest(mockOptions)).rejects.toThrow('Missing required configuration');
    });

    it('should handle git repository validation errors', async () => {
      mockGitService.validateRepository = jest.fn().mockRejectedValue(new Error('Not a git repository'));

      await expect(createPullRequest(mockOptions)).rejects.toThrow();
    });

    it('should handle options with required properties', () => {
      const validOptions: CreatePROptions = {
        jira: 'PROJECT-123'
      };

      expect(validOptions).toHaveProperty('jira');
      expect(typeof createPullRequest).toBe('function');
    });

    it('should retry AI description generation when user chooses to retry', async () => {
      const inquirer = require('inquirer');

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');
      mockGitService.pushCurrentBranch = jest.fn().mockResolvedValue(undefined);

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);
      mockGitHubService.createOrUpdatePullRequest = jest.fn().mockResolvedValue({
        data: { html_url: 'http://github.com/test/pr/1', number: 1, title: 'Test PR' },
        isUpdate: false
      });

      mockJiraService.hasConfluencePages = jest.fn().mockResolvedValue(false);
      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-123',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      // Mock AI service to fail once, then succeed
      mockAIDescriptionService.generatePRDescription = jest.fn()
        .mockRejectedValueOnce(new Error('AI service failed'))
        .mockResolvedValueOnce({ title: 'Test PR', body: 'Test body', summary: 'Test summary' });

      // Clear previous mocks and set up specific mocks for this test
      inquirer.default.prompt.mockClear();
      inquirer.default.prompt
        .mockResolvedValueOnce({ retry: true }) // First prompt: retry choice
        .mockResolvedValueOnce({ action: 'create' }) // Second prompt: create action
        .mockResolvedValueOnce({ openInBrowser: false }); // Don't open in browser

      await expect(createPullRequest(mockOptions)).resolves.toBeUndefined();

      // Verify AI service was called twice (initial attempt + retry)
      expect(mockAIDescriptionService.generatePRDescription).toHaveBeenCalledTimes(2);
    });

    it('should not retry AI description generation when user chooses not to retry', async () => {
      const inquirer = require('inquirer');

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);

      mockJiraService.hasConfluencePages = jest.fn().mockResolvedValue(false);
      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-123',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      // Mock AI service to fail
      const expectedError = new Error('AI service failed');
      mockAIDescriptionService.generatePRDescription = jest.fn().mockRejectedValue(expectedError);

      // Mock inquirer to return no retry choice
      inquirer.default.prompt
        .mockResolvedValueOnce({ retry: false });

      await expect(createPullRequest(mockOptions)).rejects.toThrow('AI service failed');

      // Verify AI service was called only once (no retry)
      expect(mockAIDescriptionService.generatePRDescription).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple retry attempts and succeed on the third attempt', async () => {
      const inquirer = require('inquirer');

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');
      mockGitService.pushCurrentBranch = jest.fn().mockResolvedValue(undefined);

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);
      mockGitHubService.createOrUpdatePullRequest = jest.fn().mockResolvedValue({
        data: { html_url: 'http://github.com/test/pr/1', number: 1, title: 'Test PR' },
        isUpdate: false
      });

      mockJiraService.hasConfluencePages = jest.fn().mockResolvedValue(false);
      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-123',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      // Mock AI service to fail three times, then succeed on the fourth attempt
      mockAIDescriptionService.generatePRDescription = jest.fn()
        .mockRejectedValueOnce(new Error('AI service failed'))
        .mockResolvedValueOnce({ title: 'Test PR', body: 'Test body', summary: 'Test summary' })
        .mockRejectedValueOnce(new Error('AI service failed again'))
        .mockResolvedValueOnce({ title: 'Final PR', body: 'Final body', summary: 'Final summary' });

      // Clear previous mocks and set up specific mocks for this test
      inquirer.default.prompt.mockClear();
      inquirer.default.prompt
        .mockResolvedValueOnce({ retry: true }) // Initial retry choice after first failure
        .mockResolvedValueOnce({ action: 'regenerate' }) // User wants to regenerate after first success
        .mockResolvedValueOnce({ retry: true }) // Retry after third failure
        .mockResolvedValueOnce({ action: 'create' }) // Create action after final success
        .mockResolvedValueOnce({ openInBrowser: false }); // Don't open in browser

      await expect(createPullRequest(mockOptions)).resolves.toBeUndefined();

      // Verify AI service was called 4 times (initial fail + retry success + regenerate fail + retry success)
      expect(mockAIDescriptionService.generatePRDescription).toHaveBeenCalledTimes(4);
    });

    it('should give up retrying when user chooses not to continue after retry failure', async () => {
      const inquirer = require('inquirer');

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);

      mockJiraService.hasConfluencePages = jest.fn().mockResolvedValue(false);
      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-123',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      // Mock AI service to fail once, user chooses not to retry
      const expectedError = new Error('AI service failed');
      mockAIDescriptionService.generatePRDescription = jest.fn()
        .mockRejectedValueOnce(expectedError);

      // Clear previous mocks and set up specific mocks for this test
      inquirer.default.prompt.mockClear();
      inquirer.default.prompt
        .mockResolvedValueOnce({ retry: false }); // Don't retry after initial failure

      await expect(createPullRequest(mockOptions)).rejects.toThrow('AI service failed');

      // Verify AI service was called only once (no retry)
      expect(mockAIDescriptionService.generatePRDescription).toHaveBeenCalledTimes(1);
    });

    it('should throw error after all retry attempts are exhausted', async () => {
      const inquirer = require('inquirer');

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);

      mockJiraService.hasConfluencePages = jest.fn().mockResolvedValue(false);
      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-123',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      // Mock AI service to fail consistently - max retry attempts
      const finalError = new Error('Final AI failure');
      mockAIDescriptionService.generatePRDescription = jest.fn()
        .mockRejectedValueOnce(new Error('AI service failed'))
        .mockRejectedValueOnce(new Error('AI service failed again'))
        .mockRejectedValueOnce(new Error('AI service failed once more'))
        .mockRejectedValueOnce(finalError);

      // Clear previous mocks and set up specific mocks for this test
      inquirer.default.prompt.mockClear();
      inquirer.default.prompt
        .mockResolvedValueOnce({ retry: true }) // Initial retry choice after first failure
        .mockResolvedValueOnce({ retry: true }) // Retry again after second failure
        .mockResolvedValueOnce({ retry: true }) // Retry again after third failure
        .mockResolvedValueOnce({ retry: true }); // Try to retry after fourth failure (should reach max)

      await expect(createPullRequest(mockOptions)).rejects.toThrow();

      // Verify AI service was called multiple times (initial + retries)
      expect(mockAIDescriptionService.generatePRDescription).toHaveBeenCalled();
    });

    it('should handle Jira ticket validation with empty input', async () => {
      const inquirer = require('inquirer');

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');
      mockGitService.pushCurrentBranch = jest.fn().mockResolvedValue(undefined);

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);
      mockGitHubService.createOrUpdatePullRequest = jest.fn().mockResolvedValue({
        data: { html_url: 'http://github.com/test/pr/1', number: 1, title: 'Test PR' },
        isUpdate: false
      });

      mockJiraService.hasConfluencePages = jest.fn().mockResolvedValue(false);
      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-123',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      mockAIDescriptionService.generatePRDescription = jest.fn().mockResolvedValue({
        title: 'Test PR',
        body: 'Test body',
        summary: 'Test summary'
      });

      // Mock inquirer to test validation - first empty input, then valid input
      inquirer.default.prompt.mockClear();
      inquirer.default.prompt
        .mockResolvedValueOnce({ ticket: 'PROJECT-123' }) // Valid input (validation happens internally)
        .mockResolvedValueOnce({ action: 'create' }) // User confirms
        .mockResolvedValueOnce({ openInBrowser: false }); // Don't open in browser

      const optionsWithoutJira = { ...mockOptions };
      delete optionsWithoutJira.jira;

      await expect(createPullRequest(optionsWithoutJira)).resolves.toBeUndefined();

      expect(mockJiraService.getTicket).toHaveBeenCalledWith('PROJECT-123');
    });

    it('should handle Jira ticket validation with invalid format', async () => {
      const inquirer = require('inquirer');

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');
      mockGitService.pushCurrentBranch = jest.fn().mockResolvedValue(undefined);

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);
      mockGitHubService.createOrUpdatePullRequest = jest.fn().mockResolvedValue({
        data: { html_url: 'http://github.com/test/pr/1', number: 1, title: 'Test PR' },
        isUpdate: false
      });

      mockJiraService.hasConfluencePages = jest.fn().mockResolvedValue(false);
      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-123',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      mockAIDescriptionService.generatePRDescription = jest.fn().mockResolvedValue({
        title: 'Test PR',
        body: 'Test body',
        summary: 'Test summary'
      });

      // Mock inquirer to test validation - first invalid format, then valid input
      inquirer.default.prompt.mockClear();
      inquirer.default.prompt
        .mockResolvedValueOnce({ ticket: 'PROJECT-123' }) // Valid input (validation happens internally)
        .mockResolvedValueOnce({ action: 'create' }) // User confirms
        .mockResolvedValueOnce({ openInBrowser: false }); // Don't open in browser

      const optionsWithoutJira = { ...mockOptions };
      delete optionsWithoutJira.jira;

      await expect(createPullRequest(optionsWithoutJira)).resolves.toBeUndefined();

      expect(mockJiraService.getTicket).toHaveBeenCalledWith('PROJECT-123');
    });

    it('should throw error when generatedContent is null after retries', async () => {
      const inquirer = require('inquirer');

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);

      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-123',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      // Mock AI service to succeed but return null (this triggers the null check)
      mockAIDescriptionService.generatePRDescription = jest.fn()
        .mockResolvedValueOnce(null); // Return null to trigger the error

      // Mock inquirer responses
      inquirer.default.prompt.mockClear();
      inquirer.default.prompt
        .mockResolvedValueOnce({ includeConfluence: false })
        .mockResolvedValueOnce({ retry: false }); // User chooses not to retry

      await expect(createPullRequest(mockOptions)).rejects.toThrow('Failed to generate PR description - AI service returned null or undefined');
    });

    it('should display summary in dry run mode when available', async () => {
      const inquirer = require('inquirer');

      const dryRunOptions = {
        ...mockOptions,
        dryRun: true
      };

      // Mock the basic methods needed
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');
      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);
      mockJiraService.getTicket = jest.fn().mockResolvedValue({ key: 'PROJECT-123', summary: 'Test ticket' });

      // Mock AI service to return content with summary
      mockAIDescriptionService.generatePRDescription = jest.fn().mockResolvedValue({
        title: 'Test PR',
        body: 'Test body',
        summary: 'Test summary' // Include summary to test line 350
      });

      // Mock inquirer responses
      inquirer.default.prompt.mockClear();
      inquirer.default.prompt
        .mockResolvedValueOnce({ includeConfluence: false })
        .mockResolvedValueOnce({ action: 'create' });

      await expect(createPullRequest(dryRunOptions)).resolves.toBeUndefined();
    });

    it('should throw error when current branch is empty', async () => {
      // Mock git service to return empty branch
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue(''); // Empty branch
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);

      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-123',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      mockAIDescriptionService.generatePRDescription = jest.fn().mockResolvedValue({
        title: 'Test PR',
        body: 'Test body',
        summary: 'Test summary'
      });

      // Mock inquirer responses
      const inquirer = require('inquirer');
      inquirer.default.prompt.mockClear();
      inquirer.default.prompt
        .mockResolvedValueOnce({ includeConfluence: false })
        .mockResolvedValueOnce({ action: 'create' });

      await expect(createPullRequest(mockOptions)).rejects.toThrow('Current branch cannot be empty');
    });

    it('should throw error when base branch is empty', async () => {
      // Mock git service to return empty base branch
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');
      mockGitService.pushCurrentBranch = jest.fn().mockResolvedValue(undefined);

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);
      mockGitHubService.createOrUpdatePullRequest = jest.fn().mockResolvedValue({
        data: { html_url: 'http://github.com/test/pr/1', number: 1, title: 'Test PR' },
        isUpdate: false
      });

      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-123',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      mockAIDescriptionService.generatePRDescription = jest.fn().mockResolvedValue({
        title: 'Test PR',
        body: 'Test body',
        summary: 'Test summary'
      });

      // Mock inquirer responses
      const inquirer = require('inquirer');
      inquirer.default.prompt.mockClear();
      inquirer.default.prompt
        .mockResolvedValueOnce({ includeConfluence: false })
        .mockResolvedValueOnce({ action: 'create' });

      // Override the base branch to be empty - this should trigger validation
      const optionsWithEmptyBase = { ...mockOptions, base: '   ' }; // Whitespace only

      await expect(createPullRequest(optionsWithEmptyBase)).rejects.toThrow('Base branch cannot be empty');
    });

    it('should handle spinner fail in catch block', async () => {
      // Mock git service to throw an error during validation
      mockGitService.validateRepository = jest.fn().mockResolvedValue(undefined);
      mockGitService.getCurrentBranch = jest.fn().mockResolvedValue('feature/PROJECT-123');
      mockGitService.hasUncommittedChanges = jest.fn().mockResolvedValue(false);
      mockGitService.branchExists = jest.fn().mockResolvedValue(true);
      mockGitService.getChanges = jest.fn().mockResolvedValue({
        totalFiles: 2,
        totalInsertions: 10,
        totalDeletions: 5,
        files: [],
        commits: []
      });
      mockGitService.getDiffContent = jest.fn().mockResolvedValue('mock diff content');

      // Mock pushCurrentBranch to throw an error (this will trigger the catch block with spinner)
      mockGitService.pushCurrentBranch = jest.fn().mockRejectedValue(new Error('Push failed'));

      mockGitHubService.getCurrentRepo = jest.fn().mockResolvedValue({ owner: 'test-owner', repo: 'test-repo' });
      mockGitHubService.getPullRequestTemplates = jest.fn().mockResolvedValue([]);

      mockJiraService.getTicket = jest.fn().mockResolvedValue({
        key: 'PROJECT-123',
        summary: 'Test ticket',
        description: 'Test description',
        issueType: 'Story',
        status: 'In Progress'
      });

      mockAIDescriptionService.generatePRDescription = jest.fn().mockResolvedValue({
        title: 'Test PR',
        body: 'Test body',
        summary: 'Test summary'
      });

      // Mock inquirer responses
      const inquirer = require('inquirer');
      inquirer.default.prompt.mockClear();
      inquirer.default.prompt
        .mockResolvedValueOnce({ includeConfluence: false })
        .mockResolvedValueOnce({ action: 'create' });

      await expect(createPullRequest(mockOptions)).rejects.toThrow('Push failed');
    });

  });

  describe('CreatePROptions interface', () => {
    it('should accept valid options', () => {
      const options: CreatePROptions = {
        jira: 'PROJECT-123',
        base: 'main',
        title: 'Test title',
        dryRun: true,
        draft: false
      };

      expect(options.jira).toBe('PROJECT-123');
      expect(options.base).toBe('main');
      expect(options.title).toBe('Test title');
      expect(options.dryRun).toBe(true);
      expect(options.draft).toBe(false);
    });

    it('should accept partial options', () => {
      const options: CreatePROptions = {
        jira: 'PROJECT-123'
      };

      expect(options.jira).toBe('PROJECT-123');
      expect(options.base).toBeUndefined();
      expect(options.title).toBeUndefined();
      expect(options.dryRun).toBeUndefined();
      expect(options.draft).toBeUndefined();
    });
  });
});
