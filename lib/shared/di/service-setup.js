/**
 * Service registration and setup
 */
import { container, ServiceKeys } from './container.js';
import { JiraService } from '../../services/atlassian-facade.js';
import { GitHubService } from '../../services/github.js';
import { GitService } from '../../services/git.js';
import { AIDescriptionGeneratorService } from '../../services/ai-description-generator.js';
import { AIProviderManager } from '../../services/ai-providers/manager.js';
import { PromptBuilder } from '../../services/ai-providers/prompt-builder.js';
import { ResponseParser } from '../../services/ai-providers/response-parser.js';
/**
 * Register all application services
 */
export function setupServices() {
    // Register core services as singletons
    container.registerSingleton(ServiceKeys.JIRA_SERVICE, () => new JiraService());
    container.registerSingleton(ServiceKeys.GITHUB_SERVICE, () => new GitHubService());
    container.registerSingleton(ServiceKeys.GIT_SERVICE, () => new GitService());
    // Register AI services
    container.registerSingleton(ServiceKeys.AI_PROVIDER_MANAGER, () => new AIProviderManager());
    container.registerSingleton(ServiceKeys.PROMPT_BUILDER, () => new PromptBuilder());
    container.registerSingleton(ServiceKeys.RESPONSE_PARSER, () => new ResponseParser());
    // Register AI Description service with dependencies
    container.registerSingleton(ServiceKeys.AI_DESCRIPTION_SERVICE, () => {
        const providerManager = container.resolve(ServiceKeys.AI_PROVIDER_MANAGER);
        const promptBuilder = container.resolve(ServiceKeys.PROMPT_BUILDER);
        const responseParser = container.resolve(ServiceKeys.RESPONSE_PARSER);
        return new AIDescriptionGeneratorService(providerManager, promptBuilder, responseParser);
    });
}
/**
 * Get service from container (type-safe helper)
 */
export function getService(key) {
    return container.resolve(key);
}
//# sourceMappingURL=service-setup.js.map