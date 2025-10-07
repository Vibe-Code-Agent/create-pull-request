export interface JiraConfig {
  baseUrl: string;
  username: string;
  apiToken: string;
  projectKey?: string | null;
}

export interface GitHubConfig {
  token: string;
  defaultBranch: string;
}

export interface CopilotConfig {
  apiToken?: string | null;
}

export interface AIProvidersConfig {
  claude?: {
    apiKey?: string | null;
    model?: string;
  };
  openai?: {
    apiKey?: string | null;
    model?: string;
  };
  gemini?: {
    apiKey?: string | null;
    model?: string;
  };
  copilot?: {
    apiToken?: string | null;
    model?: string;
  };
}

export interface EnvironmentConfig {
  jira: JiraConfig;
  github: GitHubConfig;
  copilot: CopilotConfig;
  aiProviders?: AIProvidersConfig;
  createdAt: string;
  version: string;
}
