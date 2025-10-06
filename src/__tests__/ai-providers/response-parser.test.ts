import { ResponseParser } from '../../services/ai-providers/response-parser.js';

describe('ResponseParser', () => {
    let parser: ResponseParser;

    beforeEach(() => {
        parser = new ResponseParser();
    });

    describe('parseAIResponse', () => {
        it('should parse AI response correctly', () => {
            const response = {
                content: 'Generated response content'
            };

            const result = parser.parseAIResponse(response);

            expect(result).toEqual({
                title: 'Generated response content',
                body: 'Generated response content',
                summary: 'Generated response content'
            });
        });

        it('should handle JSON response', () => {
            const response = {
                content: '{"title": "Test Title", "description": "Test Description", "summary": "Test Summary"}'
            };

            const result = parser.parseAIResponse(response);

            expect(result).toEqual({
                title: 'Test Title',
                body: 'Test Description',
                summary: 'Test Summary'
            });
        });

        it('should throw error when content is missing', () => {
            const response = {};

            expect(() => parser.parseAIResponse(response))
                .toThrow('No content received from AI provider');
        });
    });

    describe('extractContentFromResponse', () => {
        it('should extract content from valid response', () => {
            const response = {
                content: 'AI provider response'
            };

            const content = parser['extractContentFromResponse'](response);
            expect(content).toBe('AI provider response');
        });

        it('should throw error when content is missing', () => {
            const response = {};

            expect(() => parser['extractContentFromResponse'](response))
                .toThrow('No content received from AI provider');
        });

        it('should throw error when content is null', () => {
            const response = {
                content: null
            };

            expect(() => parser['extractContentFromResponse'](response))
                .toThrow('No content received from AI provider');
        });

        it('should throw error when content is undefined', () => {
            const response = {
                content: undefined
            };

            expect(() => parser['extractContentFromResponse'](response))
                .toThrow('No content received from AI provider');
        });
    });

    describe('parseResponseContent', () => {
        it('should parse valid JSON response', () => {
            const jsonContent = '{"title": "Test Title", "description": "Test Description", "summary": "Test Summary"}';

            const result = parser['parseResponseContent'](jsonContent);

            expect(result).toEqual({
                title: 'Test Title',
                body: 'Test Description',
                summary: 'Test Summary'
            });
        });

        it('should parse JSON with markdown code blocks', () => {
            const jsonContent = '```json\n{"title": "Test Title", "description": "Test Description"}\n```';

            const result = parser['parseResponseContent'](jsonContent);

            expect(result.title).toBe('Test Title');
            expect(result.body).toBe('Test Description');
            expect(result.summary).toBe('Test Description'); // Fallback from body
        });

        it('should extract JSON from mixed content', () => {
            const mixedContent = 'Here is the response:\n{"title": "Test Title", "description": "Test Description"}\nEnd of response';

            const result = parser['parseResponseContent'](mixedContent);

            expect(result.title).toBe('Test Title');
            expect(result.body).toBe('Test Description');
            expect(result.summary).toBe('Test Description'); // Fallback from body
        });

        it('should fall back to text extraction when JSON parsing fails', () => {
            const invalidJson = '{"title": "Test Title", "description": "Test Description"'; // Missing closing brace

            const result = parser['parseResponseContent'](invalidJson);

            expect(result.title).toBe('{"title": "Test Title", "description": "Test Description"');
            expect(result.body).toBe(invalidJson);
        });

        it('should extract from plain text with markdown header', () => {
            const textContent = '# Test Title\n\nThis is the description content.';

            const result = parser['parseResponseContent'](textContent);

            expect(result.title).toBe('Test Title');
            expect(result.body).toBe(textContent);
            expect(result.summary).toBe('This is the description content.'); // Fallback from first paragraph
        });

        it('should extract from plain text with Title prefix', () => {
            const textContent = 'Title: Test Title\n\nThis is the description content.';

            const result = parser['parseResponseContent'](textContent);

            expect(result.title).toBe('Test Title');
            expect(result.body).toBe(textContent);
            expect(result.summary).toBe('This is the description content.'); // Fallback from first paragraph
        });

        it('should extract from plain text with subheader', () => {
            const textContent = '## Test Title\n\nThis is the description content.';

            const result = parser['parseResponseContent'](textContent);

            expect(result.title).toBe('Test Title');
            expect(result.body).toBe(textContent);
            expect(result.summary).toBe('This is the description content.'); // Fallback from first paragraph
        });

        it('should extract first meaningful line as title when no patterns match', () => {
            const textContent = 'This is a meaningful title that should be extracted\n\nThis is the description content.';

            const result = parser['parseResponseContent'](textContent);

            expect(result).toEqual({
                title: 'This is a meaningful title that should be extracted',
                body: textContent,
                summary: 'This is a meaningful title that should be extracted'
            });
        });

        it('should use default title when no meaningful line found', () => {
            const textContent = 'Short\n\nThis is the description content.';

            const result = parser['parseResponseContent'](textContent);

            expect(result.title).toBe('This is the description content.');
            expect(result.body).toBe(textContent);
            expect(result.summary).toBe('This is the description content.'); // Fallback from first paragraph
        });
    });

    describe('cleanJSONResponse', () => {
        it('should remove markdown code blocks', () => {
            const content = '```json\n{"key": "value"}\n```';
            const cleaned = parser['cleanJSONResponse'](content);
            expect(cleaned).toBe('{"key": "value"}');
        });

        it('should trim whitespace', () => {
            const content = '  {"key": "value"}  ';
            const cleaned = parser['cleanJSONResponse'](content);
            expect(cleaned).toBe('{"key": "value"}');
        });

        it('should extract JSON from mixed content', () => {
            const content = 'Here is the JSON: {"key": "value"} and more text';
            const cleaned = parser['cleanJSONResponse'](content);
            expect(cleaned).toBe('{"key": "value"}');
        });

        it('should handle content without JSON', () => {
            const content = 'plain text content';
            const cleaned = parser['cleanJSONResponse'](content);
            expect(cleaned).toBe('plain text content');
        });
    });


    describe('extractTitle', () => {
        it('should extract markdown header', () => {
            const content = '# Test Title\n\nContent';
            const title = parser['extractTitle'](content);
            expect(title).toBe('Test Title');
        });

        it('should extract Title prefix', () => {
            const content = 'Title: Test Title\n\nContent';
            const title = parser['extractTitle'](content);
            expect(title).toBe('Test Title');
        });

        it('should extract subheader', () => {
            const content = '## Test Title\n\nContent';
            const title = parser['extractTitle'](content);
            expect(title).toBe('Test Title');
        });

        it('should extract sub-subheader', () => {
            const content = '### Test Title\n\nContent';
            const title = parser['extractTitle'](content);
            expect(title).toBe('Test Title');
        });

        it('should extract first meaningful line', () => {
            const content = 'This is a meaningful title that should be extracted\n\nContent';
            const title = parser['extractTitle'](content);
            expect(title).toBe('This is a meaningful title that should be extracted');
        });

        it('should return null when no meaningful line found', () => {
            const content = 'Short\n\nContent';
            const title = parser['extractTitle'](content);
            expect(title).toBeNull();
        });

        it('should handle case insensitive Title prefix', () => {
            const content = 'title: Test Title\n\nContent';
            const title = parser['extractTitle'](content);
            expect(title).toBe('Test Title');
        });
    });

    describe('extractSummary', () => {
        it('should extract Summary prefix', () => {
            const content = 'Summary: This is a summary\n\nMore content';
            const summary = parser['extractSummary'](content);
            expect(summary).toBe('This is a summary');
        });

        it('should extract markdown summary section', () => {
            const content = '## Summary\nThis is a summary\n\nMore content';
            const summary = parser['extractSummary'](content);
            expect(summary).toBe('This is a summary');
        });

        it('should extract subheader summary section', () => {
            const content = '### Summary\nThis is a summary\n\nMore content';
            const summary = parser['extractSummary'](content);
            expect(summary).toBe('This is a summary');
        });

        it('should extract first paragraph as summary', () => {
            const content = 'This is a good summary paragraph that explains the changes.\n\nMore detailed content follows.';
            const summary = parser['extractSummary'](content);
            expect(summary).toBe('This is a good summary paragraph that explains the changes.');
        });

        it('should return undefined when no suitable summary found', () => {
            const content = 'Short\n\nMore content';
            const summary = parser['extractSummary'](content);
            expect(summary).toBeNull();
        });

        it('should handle case insensitive Summary prefix', () => {
            const content = 'summary: This is a summary\n\nMore content';
            const summary = parser['extractSummary'](content);
            expect(summary).toBe('This is a summary');
        });
    });
});
