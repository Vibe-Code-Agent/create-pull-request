import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { CONFIG } from '../constants/index.js';

import { EnvironmentConfig } from '../interface/config.js';

// Re-export for backward compatibility
export type { EnvironmentConfig };

/**
 * Get the configuration file path
 * @returns The full path to the configuration file
 */
export function getConfigFilePath(): string {
    return path.join(os.homedir(), CONFIG.DIRECTORY_NAME, CONFIG.FILE_NAME);
}

/**
 * Load configuration from JSON file
 */
export function loadConfig(): EnvironmentConfig {
    const configFile = getConfigFilePath();
    if (!fs.existsSync(configFile)) {
        throw new Error(`Configuration file not found at ${configFile}. Please run 'create-pr setup' to create your configuration.`);
    }

    try {
        const configData = fs.readFileSync(configFile, 'utf8');
        const config = JSON.parse(configData);
        return config;
    } catch (error) {
        throw new Error(`Failed to parse configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get specific configuration section
 */
export function getConfig<T extends keyof EnvironmentConfig>(section: T): EnvironmentConfig[T] {
    const config = loadConfig();
    return config[section];
}

/**
 * Get specific configuration value
 */
export function getConfigValue<T extends keyof EnvironmentConfig, K extends keyof EnvironmentConfig[T]>(
    section: T,
    key: K
): EnvironmentConfig[T][K] {
    const config = loadConfig();
    const sectionConfig = config[section];
    if (sectionConfig && typeof sectionConfig === 'object') {
        return (sectionConfig as any)[key];
    }
    throw new Error(`Configuration section '${String(section)}' not found or invalid`);
}

/**
 * Check if configuration exists and is valid
 */
export function validateConfig(): boolean {
    try {
        const config = loadConfig();

        // Check required fields
        const required = [
            config.jira.baseUrl,
            config.jira.username,
            config.jira.apiToken,
            config.github.token
        ];

        return required.every(field => field && field.trim().length > 0);
    } catch (_error) {
        // Configuration validation failed - this is expected behavior for missing/invalid configs
        // The calling code will handle the false return value appropriately
        return false;
    }
}

/**
 * Check if JSON config file exists
 */
export function hasJsonConfig(): boolean {
    return fs.existsSync(getConfigFilePath());
}
