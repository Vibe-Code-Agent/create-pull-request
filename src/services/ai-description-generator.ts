import { JiraTicket } from './atlassian-facade.js';
import { GitChanges } from './git.js';
import { PullRequestTemplate } from './github.js';
import { AIProviderManager } from './ai-providers/manager.js';
import { PromptBuilder } from './ai-providers/prompt-builder.js';
import { ResponseParser, GeneratedPRContent } from './ai-providers/response-parser.js';

export { GeneratedPRContent } from './ai-providers/response-parser.js';

export interface GenerateDescriptionOptions {
  jiraTicket: JiraTicket;
  gitChanges: GitChanges;
  template?: PullRequestTemplate;
  diffContent?: string;
  prTitle?: string;
  repoInfo?: {
    owner: string;
    repo: string;
    currentBranch: string;
  };
}

export class AIDescriptionGeneratorService {
  private readonly providerManager: AIProviderManager;
  private readonly promptBuilder: PromptBuilder;
  private readonly responseParser: ResponseParser;

  constructor() {
    this.providerManager = new AIProviderManager();
    this.promptBuilder = new PromptBuilder();
    this.responseParser = new ResponseParser();
  }

  async generatePRDescription(options: GenerateDescriptionOptions): Promise<GeneratedPRContent> {
    // Select AI provider
    const selectedProvider = await this.providerManager.selectProvider();

    // Build the prompt using the new PromptBuilder
    const prompt = this.promptBuilder.buildPrompt(options);

    // Generate content using the provider manager
    const content = await this.providerManager.generateContent(prompt, selectedProvider);
    // Parse the response using the new ResponseParser
    const result = this.responseParser.parseAIResponse({ content }, selectedProvider);

    return result;
  }

  // All other functionality is now handled by the modular classes:
  // - AIProviderManager handles provider selection and API calls
  // - PromptBuilder handles prompt construction
  // - ResponseParser handles response parsing
}
