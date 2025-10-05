import {
  handleErrorWithPrefix,
  formatErrorMessage,
  isAxiosError,
  extractErrorDetails,
  createError,
  AppError,
  handleError,
  createErrorHandler,
  createJiraError,
  createGitHubError,
  createGitError,
  createValidationError,
  ERROR_CODES
} from '../utils/error-handler';

// Mock console to test logging
const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

describe('Error Handler Utils', () => {
  beforeEach(() => {
    consoleSpy.mockClear();
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  describe('AppError', () => {
    it('should create AppError with message only', () => {
      const error = new AppError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('AppError');
      expect(error.code).toBeUndefined();
      expect(error.statusCode).toBeUndefined();
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(Error);
    });

    it('should create AppError with all parameters', () => {
      const error = new AppError('Test error', 'TEST_CODE', 404, false);

      expect(error.message).toBe('Test error');
      expect(error.name).toBe('AppError');
      expect(error.code).toBe('TEST_CODE');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(false);
    });

    it('should handle Error.captureStackTrace when available', () => {
      const originalCaptureStackTrace = Error.captureStackTrace;
      const mockCaptureStackTrace = jest.fn();

      // Mock Error.captureStackTrace
      Error.captureStackTrace = mockCaptureStackTrace;

      const error = new AppError('Test error');

      expect(mockCaptureStackTrace).toHaveBeenCalledWith(error, AppError);

      // Restore original
      Error.captureStackTrace = originalCaptureStackTrace;
    });

    it('should handle missing Error.captureStackTrace', () => {
      const originalCaptureStackTrace = Error.captureStackTrace;

      // Remove Error.captureStackTrace
      delete (Error as any).captureStackTrace;

      expect(() => new AppError('Test error')).not.toThrow();

      // Restore original
      Error.captureStackTrace = originalCaptureStackTrace;
    });
  });

  describe('handleError', () => {
    const originalExit = process.exit;
    const mockExit = jest.fn() as any;

    beforeEach(() => {
      process.exit = mockExit;
    });

    afterEach(() => {
      process.exit = originalExit;
    });

    it('should handle AppError with code', () => {
      const error = new AppError('Test error', 'TEST_CODE');

      handleError(error);

      expect(consoleSpy).toHaveBeenCalledWith(expect.any(String), 'Test error');
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(String), 'TEST_CODE');
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should handle AppError without code', () => {
      const error = new AppError('Test error');

      handleError(error);

      expect(consoleSpy).toHaveBeenCalledWith(expect.any(String), 'Test error');
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should handle regular Error in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Regular error');
      error.stack = 'Error stack trace';

      handleError(error);

      expect(consoleSpy).toHaveBeenCalledWith(expect.any(String), 'Regular error');
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(String), 'Error stack trace');
      expect(mockExit).toHaveBeenCalledWith(1);

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle regular Error in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Regular error');

      handleError(error);

      expect(consoleSpy).toHaveBeenCalledWith(expect.any(String), 'Regular error');
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(mockExit).toHaveBeenCalledWith(1);

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle unknown error types', () => {
      handleError('String error');

      expect(consoleSpy).toHaveBeenCalledWith(expect.any(String), 'String error');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('createErrorHandler', () => {
    it('should create handler that wraps Error in AppError', () => {
      const handler = createErrorHandler('Test Context');
      const error = new Error('Original error');

      expect(() => handler(error)).toThrow(AppError);

      try {
        handler(error);
      } catch (thrownError) {
        expect((thrownError as AppError).message).toBe('Test Context: Original error');
        expect(thrownError).toBeInstanceOf(AppError);
      }
    });

    it('should create handler that wraps non-Error in AppError', () => {
      const handler = createErrorHandler('Test Context');

      expect(() => handler('String error')).toThrow(AppError);

      try {
        handler('String error');
      } catch (thrownError) {
        expect((thrownError as AppError).message).toBe('Test Context: String error');
        expect(thrownError).toBeInstanceOf(AppError);
      }
    });
  });

  describe('Error creation functions', () => {
    it('should create Jira error', () => {
      const error = createJiraError('Jira API failed', 500);

      expect(error.message).toBe('Jira API failed');
      expect(error.code).toBe(ERROR_CODES.JIRA_API_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error).toBeInstanceOf(AppError);
    });

    it('should create GitHub error', () => {
      const error = createGitHubError('GitHub API failed', 404);

      expect(error.message).toBe('GitHub API failed');
      expect(error.code).toBe(ERROR_CODES.GITHUB_API_ERROR);
      expect(error.statusCode).toBe(404);
      expect(error).toBeInstanceOf(AppError);
    });

    it('should create Git error', () => {
      const error = createGitError('Git operation failed');

      expect(error.message).toBe('Git operation failed');
      expect(error.code).toBe(ERROR_CODES.GIT_ERROR);
      expect(error.statusCode).toBeUndefined();
      expect(error).toBeInstanceOf(AppError);
    });

    it('should create Validation error', () => {
      const error = createValidationError('Validation failed');

      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(error.statusCode).toBeUndefined();
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('createError', () => {
    it('should create error with message and code', () => {
      const error = createError('Test error', 'TEST_ERROR');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error).toBeInstanceOf(Error);
    });

    it('should create error with additional details', () => {
      const details = { field: 'username', value: 'invalid' };
      const error = createError('Validation failed', 'VALIDATION_ERROR', details);

      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual(details);
    });

    it('should create error without code', () => {
      const error = createError('Simple error');

      expect(error.message).toBe('Simple error');
      expect(error.code).toBeUndefined();
    });
  });

  describe('isAxiosError', () => {
    it('should identify axios errors', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { message: 'Not found' }
        },
        config: {},
        message: 'Request failed'
      };

      expect(isAxiosError(axiosError)).toBe(true);
    });

    it('should reject non-axios errors', () => {
      const regularError = new Error('Regular error');

      expect(isAxiosError(regularError)).toBe(false);
      expect(isAxiosError(null)).toBe(false);
      expect(isAxiosError(undefined)).toBe(false);
      expect(isAxiosError({})).toBe(false);
      expect(isAxiosError({ message: 'Not axios' })).toBe(false);
    });

    it('should handle axios error without response', () => {
      const axiosError = {
        isAxiosError: true,
        message: 'Network error',
        config: {}
      };

      expect(isAxiosError(axiosError)).toBe(true);
    });
  });

  describe('extractErrorDetails', () => {
    it('should extract details from axios error with response', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 422,
          statusText: 'Unprocessable Entity',
          data: {
            message: 'Validation failed',
            errors: ['Field is required']
          }
        },
        config: { url: '/api/test' },
        message: 'Request failed'
      };

      const details = extractErrorDetails(axiosError);

      expect(details).toEqual({
        type: 'HTTP_ERROR',
        statusCode: 422,
        statusText: 'Unprocessable Entity',
        url: '/api/test',
        responseData: {
          message: 'Validation failed',
          errors: ['Field is required']
        }
      });
    });

    it('should extract details from axios error without response', () => {
      const axiosError = {
        isAxiosError: true,
        message: 'Network Error',
        config: { url: '/api/test' },
        code: 'ECONNREFUSED'
      };

      const details = extractErrorDetails(axiosError);

      expect(details).toEqual({
        type: 'NETWORK_ERROR',
        code: 'ECONNREFUSED',
        url: '/api/test',
        message: 'Network Error'
      });
    });

    it('should extract details from regular error', () => {
      const regularError = new Error('Something went wrong');

      const details = extractErrorDetails(regularError);

      expect(details).toEqual({
        type: 'GENERIC_ERROR',
        message: 'Something went wrong'
      });
    });

    it('should handle custom error with code', () => {
      const customError = createError('Custom error', 'CUSTOM_CODE');

      const details = extractErrorDetails(customError);

      expect(details).toEqual({
        type: 'GENERIC_ERROR',
        message: 'Custom error',
        code: 'CUSTOM_CODE'
      });
    });

    it('should handle non-error objects', () => {
      const details = extractErrorDetails('String error');

      expect(details).toEqual({
        type: 'UNKNOWN_ERROR',
        message: 'String error'
      });
    });

    it('should handle null/undefined errors', () => {
      expect(extractErrorDetails(null)).toEqual({
        type: 'UNKNOWN_ERROR',
        message: 'Unknown error occurred'
      });

      expect(extractErrorDetails(undefined)).toEqual({
        type: 'UNKNOWN_ERROR',
        message: 'Unknown error occurred'
      });
    });
  });

  describe('formatErrorMessage', () => {
    it('should format axios error with response', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { message: 'Resource not found' }
        },
        config: { url: '/api/users/123' },
        message: 'Request failed'
      };

      const formatted = formatErrorMessage(axiosError);

      expect(formatted).toContain('HTTP Error (404)');
      expect(formatted).toContain('Resource not found');
      expect(formatted).toContain('/api/users/123');
    });

    it('should format axios network error', () => {
      const axiosError = {
        isAxiosError: true,
        message: 'Network Error',
        code: 'ECONNREFUSED'
      };

      const formatted = formatErrorMessage(axiosError);

      expect(formatted).toContain('Network Error');
      expect(formatted).toContain('ECONNREFUSED');
    });

    it('should format regular error', () => {
      const error = new Error('File not found');

      const formatted = formatErrorMessage(error);

      expect(formatted).toBe('File not found');
    });

    it('should format custom error with code', () => {
      const error = createError('Validation failed', 'VALIDATION_ERROR');

      const formatted = formatErrorMessage(error);

      expect(formatted).toContain('Validation failed');
      expect(formatted).toContain('VALIDATION_ERROR');
    });

    it('should handle string errors', () => {
      const formatted = formatErrorMessage('String error message');

      expect(formatted).toBe('String error message');
    });

    it('should handle empty/null errors', () => {
      expect(formatErrorMessage(null)).toBe('Unknown error occurred');
      expect(formatErrorMessage(undefined)).toBe('Unknown error occurred');
      expect(formatErrorMessage('')).toBe('Unknown error occurred');
    });

    it('should handle axios error with statusText but no responseData message', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {}
        },
        config: { url: '/api/test' },
        message: 'Request failed'
      };

      const formatted = formatErrorMessage(axiosError);

      expect(formatted).toContain('HTTP Error (500)');
      expect(formatted).toContain('Internal Server Error');
      expect(formatted).toContain('/api/test');
    });

    it('should handle axios error with no statusText and no responseData message', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: {}
        },
        config: { url: '/api/test' },
        message: 'Request failed'
      };

      const formatted = formatErrorMessage(axiosError);

      expect(formatted).toContain('HTTP Error (500)');
      expect(formatted).toContain('/api/test');
    });
  });

  describe('handleErrorWithPrefix', () => {
    it('should log and throw formatted error', () => {
      const error = new Error('Test error');

      expect(() => handleErrorWithPrefix(error)).toThrow('Test error');
      expect(consoleSpy).toHaveBeenCalledWith('Error:', 'Test error');
    });

    it('should log and throw with custom prefix', () => {
      const error = new Error('API error');

      expect(() => handleErrorWithPrefix(error, 'API Request')).toThrow('API error');
      expect(consoleSpy).toHaveBeenCalledWith('API Request Error:', 'API error');
    });

    it('should handle axios errors', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: { message: 'Internal server error' }
        },
        config: { url: '/api/test' },
        message: 'Request failed'
      };

      expect(() => handleErrorWithPrefix(axiosError)).toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error:',
        expect.stringContaining('HTTP Error (500)')
      );
    });

    it('should preserve original error for instanceof checks', () => {
      const originalError = new Error('Original error');

      try {
        handleErrorWithPrefix(originalError);
      } catch (thrownError) {
        expect(thrownError).toBe(originalError);
      }
    });

    it('should handle non-error inputs', () => {
      expect(() => handleErrorWithPrefix('String error')).toThrow('String error');
      expect(consoleSpy).toHaveBeenCalledWith('Error:', 'String error');
    });
  });

  describe('HTTP Status Code Handling', () => {
    const createAxiosError = (status: number, message: string, data?: any) => ({
      isAxiosError: true,
      response: {
        status,
        statusText: message,
        data: data || { message }
      },
      config: { url: '/api/test' },
      message: 'Request failed'
    });

    it('should handle 400 Bad Request', () => {
      const error = createAxiosError(400, 'Bad Request');
      const formatted = formatErrorMessage(error);

      expect(formatted).toContain('HTTP Error (400)');
      expect(formatted).toContain('Bad Request');
    });

    it('should handle 401 Unauthorized', () => {
      const error = createAxiosError(401, 'Unauthorized');
      const formatted = formatErrorMessage(error);

      expect(formatted).toContain('HTTP Error (401)');
      expect(formatted).toContain('Unauthorized');
    });

    it('should handle 403 Forbidden', () => {
      const error = createAxiosError(403, 'Forbidden');
      const formatted = formatErrorMessage(error);

      expect(formatted).toContain('HTTP Error (403)');
      expect(formatted).toContain('Forbidden');
    });

    it('should handle 404 Not Found', () => {
      const error = createAxiosError(404, 'Not Found');
      const formatted = formatErrorMessage(error);

      expect(formatted).toContain('HTTP Error (404)');
      expect(formatted).toContain('Not Found');
    });

    it('should handle 422 Unprocessable Entity with validation errors', () => {
      const error = createAxiosError(422, 'Unprocessable Entity', {
        message: 'Validation failed',
        errors: {
          title: ['Title is required'],
          body: ['Body cannot be empty']
        }
      });
      const formatted = formatErrorMessage(error);

      expect(formatted).toContain('HTTP Error (422)');
      expect(formatted).toContain('Validation failed');
    });

    it('should handle 429 Rate Limited', () => {
      const error = createAxiosError(429, 'Too Many Requests');
      const formatted = formatErrorMessage(error);

      expect(formatted).toContain('HTTP Error (429)');
      expect(formatted).toContain('Too Many Requests');
    });

    it('should handle 500 Internal Server Error', () => {
      const error = createAxiosError(500, 'Internal Server Error');
      const formatted = formatErrorMessage(error);

      expect(formatted).toContain('HTTP Error (500)');
      expect(formatted).toContain('Internal Server Error');
    });
  });

  describe('Error Context Preservation', () => {
    it('should preserve error stack trace', () => {
      const originalError = new Error('Original error');
      const originalStack = originalError.stack;

      try {
        handleErrorWithPrefix(originalError);
      } catch (thrownError) {
        expect((thrownError as Error).stack).toBe(originalStack);
      }
    });

    it('should preserve custom error properties', () => {
      const customError = createError('Custom error', 'CUSTOM_CODE', {
        field: 'username',
        value: 'invalid'
      });

      try {
        handleErrorWithPrefix(customError);
      } catch (thrownError) {
        expect((thrownError as any).code).toBe('CUSTOM_CODE');
        expect((thrownError as any).details).toEqual({ field: 'username', value: 'invalid' });
      }
    });
  });
});
