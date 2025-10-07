import { EnvironmentConfig } from '../interface/config.js';
export type { EnvironmentConfig } from '../interface/config.js';
/**
 * Get the configuration file path
 * @returns The full path to the configuration file
 */
export declare function getConfigFilePath(): string;
/**
 * Load configuration from JSON file
 */
export declare function loadConfig(): EnvironmentConfig;
/**
 * Get specific configuration section
 */
export declare function getConfig<T extends keyof EnvironmentConfig>(section: T): EnvironmentConfig[T];
/**
 * Get specific configuration value
 */
export declare function getConfigValue<T extends keyof EnvironmentConfig, K extends keyof EnvironmentConfig[T]>(section: T, key: K): EnvironmentConfig[T][K];
/**
 * Check if configuration exists and is valid
 */
export declare function validateConfig(): boolean;
/**
 * Check if JSON config file exists
 */
export declare function hasJsonConfig(): boolean;
//# sourceMappingURL=config.d.ts.map