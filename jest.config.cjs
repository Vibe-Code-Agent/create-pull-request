// Conditionally set NODE_OPTIONS for Node.js 25+ which requires --localstorage-file
// Node.js versions < 25 don't have this requirement and will fail with this flag
const nodeVersion = parseInt(process.version.slice(1).split('.')[0]);

if (nodeVersion >= 25) {
  const os = require('os');
  const path = require('path');
  const fs = require('fs');

  // Only set if not already configured to avoid worker process issues
  if (!process.env.NODE_OPTIONS || !process.env.NODE_OPTIONS.includes('--localstorage-file')) {
    // Create a stable temp directory for Jest
    const tempDir = path.join(os.tmpdir(), 'jest-localstorage');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Use a unique file per worker to avoid database lock issues
    const tempFile = path.join(tempDir, `storage-${process.pid}-${Date.now()}`);
    process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ` --localstorage-file=${tempFile}`;
  }
}

module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  // Run tests serially to avoid localstorage conflicts
  maxWorkers: 1,
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true
    }],
    '^.+\\.js$': ['ts-jest', {
      useESM: true
    }]
  },
  // Handle ES modules properly
  extensionsToTreatAsEsm: ['.ts'],
  // Transform ES modules from node_modules - be more permissive
  transformIgnorePatterns: [
    'node_modules/(?!(chalk|inquirer|@inquirer|ora|ansi-styles|strip-ansi|wrap-ansi|string-width|emoji-regex|is-fullwidth-code-point|ansi-regex|supports-color|has-flag|cli-cursor|restore-cursor|cli-spinners|is-interactive|figures|wcwidth|mute-stream|run-async|rxjs|through|base64-js|chardet|tmp|iconv-lite|safer-buffer|external-editor|@octokit|simple-git|get-east-asian-width)/)'
  ],
  // Module name mapping for ES modules
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^#ansi-styles$': 'ansi-styles',
    '^#supports-color$': 'supports-color'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/index.ts' // Main entry point, typically just exports
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'clover'
  ],
  // No global coverage threshold - coverage is tracked but not enforced
  // Fail tests if coverage is below threshold
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/lib/',
    '/coverage/',
    '/scripts/'
  ]
};
