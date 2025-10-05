import inquirer from 'inquirer';
import { AIProviderManager } from '../../services/ai-providers/manager.js';
import { getConfig } from '../../utils/config.js';
import { AI_PROVIDERS, AI_PROVIDER_NAMES } from '../../constants/index.js';

// Mock dependencies
jest.mock('inquirer');
jest.mock('../../utils/config.js');

const mockedInquirer = inquirer as jest.Mocked<typeof inquirer>;
const mockedGetConfig = getConfig as jest.MockedFunction<typeof getConfig>;

describe('AIProviderManager', () => {
  let manager: AIProviderManager;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock environment variables
    process.env.ANTHROPIC_API_KEY = 'claude-key';
    process.env.OPENAI_API_KEY = 'openai-key';
    process.env.GEMINI_API_KEY = 'gemini-key';

    mockedGetConfig.mockImplementation((key: string) => {
      switch (key) {
        case 'github':
          return { token: 'github-token' };
        case AI_PROVIDERS.COPILOT:
          return { token: 'copilot-token' };
        case 'aiProviders':
          return {
            claude: { apiKey: 'config-claude-key', model: 'claude-3-sonnet' },
            openai: { apiKey: 'config-openai-key', model: 'gpt-4' },
            gemini: { apiKey: 'config-gemini-key', model: 'gemini-pro' }
          };
        default:
          throw new Error('Config not found');
      }
    });
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  describe('constructor', () => {
    it('should initialize with available providers from config', () => {
      manager = new AIProviderManager();

      expect(manager.getAvailableProviders()).toContain(AI_PROVIDERS.CLAUDE);
      expect(manager.getAvailableProviders()).toContain(AI_PROVIDERS.CHATGPT);
      expect(manager.getAvailableProviders()).toContain(AI_PROVIDERS.GEMINI);
      expect(manager.getAvailableProviders()).toContain(AI_PROVIDERS.COPILOT);
    });

    it('should initialize with providers from environment variables', () => {
      mockedGetConfig.mockImplementation(() => {
        throw new Error('Config not found');
      });

      manager = new AIProviderManager();

      expect(manager.getAvailableProviders()).toContain(AI_PROVIDERS.CLAUDE);
      expect(manager.getAvailableProviders()).toContain(AI_PROVIDERS.CHATGPT);
      expect(manager.getAvailableProviders()).toContain(AI_PROVIDERS.GEMINI);
    });

    it('should handle missing config gracefully', () => {
      mockedGetConfig.mockImplementation(() => {
        throw new Error('Config not found');
      });

      manager = new AIProviderManager();

      expect(manager.getAvailableProviders().length).toBeGreaterThan(0);
    });
  });

  describe('selectProvider', () => {
    beforeEach(() => {
      manager = new AIProviderManager();
    });

    it('should return cached provider if already selected', async () => {
      // First selection
      mockedInquirer.prompt.mockResolvedValue({ selectedProvider: AI_PROVIDERS.CLAUDE });
      const firstResult = await manager.selectProvider();

      // Second selection should return cached result
      const secondResult = await manager.selectProvider();

      expect(firstResult).toBe(AI_PROVIDERS.CLAUDE);
      expect(secondResult).toBe(AI_PROVIDERS.CLAUDE);
      expect(mockedInquirer.prompt).toHaveBeenCalledTimes(1);
    });

    it('should throw error when no providers available', async () => {
      mockedGetConfig.mockImplementation(() => {
        throw new Error('Config not found');
      });

      // Clear environment variables
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      manager = new AIProviderManager();

      await expect(manager.selectProvider()).rejects.toThrow(
        'No AI providers configured. Please set ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, or configure GitHub Copilot.'
      );
    });

    it('should return single provider without prompting', async () => {
      // Clear environment variables
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.CLAUDE_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.CHATGPT_API_KEY;
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;

      mockedGetConfig.mockImplementation((key: string) => {
        if (key === 'aiProviders') {
          return { claude: { apiKey: 'claude-key' } };
        }
        throw new Error('Config not found');
      });

      manager = new AIProviderManager();

      const result = await manager.selectProvider();

      expect(result).toBe(AI_PROVIDERS.CLAUDE);
      expect(mockedInquirer.prompt).not.toHaveBeenCalled();
    });

    it('should prompt user when multiple providers available', async () => {
      mockedInquirer.prompt.mockResolvedValue({ selectedProvider: AI_PROVIDERS.CHATGPT });

      const result = await manager.selectProvider();

      expect(result).toBe(AI_PROVIDERS.CHATGPT);
      expect(mockedInquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'list',
          name: 'selectedProvider',
          message: 'Multiple AI providers available. Please select one:',
          choices: expect.arrayContaining([
            { name: AI_PROVIDER_NAMES.CLAUDE, value: AI_PROVIDERS.CLAUDE },
            { name: AI_PROVIDER_NAMES.CHATGPT, value: AI_PROVIDERS.CHATGPT },
            { name: AI_PROVIDER_NAMES.GEMINI, value: AI_PROVIDERS.GEMINI },
            { name: AI_PROVIDER_NAMES.COPILOT, value: AI_PROVIDERS.COPILOT }
          ])
        }
      ]);
    });
  });

  describe('generateContent', () => {
    beforeEach(() => {
      manager = new AIProviderManager();
    });

    it('should generate content with specified provider', async () => {
      const mockProvider = {
        generateContent: jest.fn().mockResolvedValue({
          content: 'Generated content',
          provider: AI_PROVIDERS.CLAUDE
        })
      };

      manager['providers'].set(AI_PROVIDERS.CLAUDE, mockProvider as any);

      const result = await manager.generateContent('test prompt', AI_PROVIDERS.CLAUDE);

      expect(result).toBe('Generated content');
      expect(mockProvider.generateContent).toHaveBeenCalledWith('test prompt');
    });

    it('should generate content with selected provider', async () => {
      const mockProvider = {
        generateContent: jest.fn().mockResolvedValue({
          content: 'Generated content',
          provider: AI_PROVIDERS.CLAUDE
        })
      };

      manager['providers'].set(AI_PROVIDERS.CLAUDE, mockProvider as any);
      manager['selectedProvider'] = AI_PROVIDERS.CLAUDE;

      const result = await manager.generateContent('test prompt');

      expect(result).toBe('Generated content');
      expect(mockProvider.generateContent).toHaveBeenCalledWith('test prompt');
    });

    it('should throw error for unavailable provider', async () => {
      await expect(manager.generateContent('test prompt', 'nonexistent' as any))
        .rejects.toThrow('Provider nonexistent not available');
    });

    it('should try fallback providers on failure', async () => {
      const mockClaudeProvider = {
        generateContent: jest.fn().mockRejectedValue(new Error('Claude failed'))
      };

      const mockChatGPTProvider = {
        generateContent: jest.fn().mockResolvedValue({
          content: 'Generated content',
          provider: AI_PROVIDERS.CHATGPT
        })
      };

      manager['providers'].set(AI_PROVIDERS.CLAUDE, mockClaudeProvider as any);
      manager['providers'].set(AI_PROVIDERS.CHATGPT, mockChatGPTProvider as any);

      // Mock selectProvider to return AI_PROVIDERS.CLAUDE first
      jest.spyOn(manager, 'selectProvider').mockResolvedValue(AI_PROVIDERS.CLAUDE);

      const result = await manager.generateContent('test prompt');

      expect(result).toBe('Generated content');
      expect(mockClaudeProvider.generateContent).toHaveBeenCalledWith('test prompt');
      expect(mockChatGPTProvider.generateContent).toHaveBeenCalledWith('test prompt');
    });

    it('should continue to next fallback when multiple providers fail', async () => {
      const mockClaudeProvider = {
        generateContent: jest.fn().mockRejectedValue(new Error('Claude failed'))
      };

      const mockChatGPTProvider = {
        generateContent: jest.fn().mockRejectedValue(new Error('ChatGPT failed'))
      };

      const mockGeminiProvider = {
        generateContent: jest.fn().mockResolvedValue({
          content: 'Generated content',
          provider: AI_PROVIDERS.GEMINI
        })
      };

      manager['providers'].set(AI_PROVIDERS.CLAUDE, mockClaudeProvider as any);
      manager['providers'].set(AI_PROVIDERS.CHATGPT, mockChatGPTProvider as any);
      manager['providers'].set(AI_PROVIDERS.GEMINI, mockGeminiProvider as any);

      // Mock selectProvider to return AI_PROVIDERS.CLAUDE first
      jest.spyOn(manager, 'selectProvider').mockResolvedValue(AI_PROVIDERS.CLAUDE);

      const result = await manager.generateContent('test prompt');

      expect(result).toBe('Generated content');
      expect(mockClaudeProvider.generateContent).toHaveBeenCalledWith('test prompt');
      expect(mockChatGPTProvider.generateContent).toHaveBeenCalledWith('test prompt');
      expect(mockGeminiProvider.generateContent).toHaveBeenCalledWith('test prompt');
    });

    it('should not try fallback when provider is explicitly specified', async () => {
      const mockProvider = {
        generateContent: jest.fn().mockRejectedValue(new Error('Provider failed'))
      };

      manager['providers'].set(AI_PROVIDERS.CLAUDE, mockProvider as any);

      await expect(manager.generateContent('test prompt', AI_PROVIDERS.CLAUDE))
        .rejects.toThrow('Provider failed');
    });
  });

  describe('getAvailableProviders', () => {
    it('should return list of available providers', () => {
      manager = new AIProviderManager();

      const providers = manager.getAvailableProviders();

      expect(providers).toEqual(expect.arrayContaining([AI_PROVIDERS.CLAUDE, AI_PROVIDERS.CHATGPT, AI_PROVIDERS.GEMINI, AI_PROVIDERS.COPILOT]));
    });
  });

  describe('hasProvider', () => {
    beforeEach(() => {
      manager = new AIProviderManager();
    });

    it('should return true for available provider', () => {
      expect(manager.hasProvider(AI_PROVIDERS.CLAUDE)).toBe(true);
    });

    it('should return false for unavailable provider', () => {
      expect(manager.hasProvider('nonexistent' as any)).toBe(false);
    });
  });

  describe('getProviderDisplayName', () => {
    it('should return correct display names', () => {
      manager = new AIProviderManager();

      expect(manager['getProviderDisplayName'](AI_PROVIDERS.CLAUDE)).toBe(AI_PROVIDER_NAMES.CLAUDE);
      expect(manager['getProviderDisplayName'](AI_PROVIDERS.CHATGPT)).toBe(AI_PROVIDER_NAMES.CHATGPT);
      expect(manager['getProviderDisplayName'](AI_PROVIDERS.GEMINI)).toBe(AI_PROVIDER_NAMES.GEMINI);
      expect(manager['getProviderDisplayName'](AI_PROVIDERS.COPILOT)).toBe(AI_PROVIDER_NAMES.COPILOT);
    });
  });
});
