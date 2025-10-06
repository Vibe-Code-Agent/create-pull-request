export class ResponseParser {
    parseAIResponse(response, _provider) {
        const content = this.extractContentFromResponse(response);
        return this.parseResponseContent(content);
    }
    extractContentFromResponse(response) {
        if (!response.content) {
            throw new Error('No content received from AI provider');
        }
        return response.content;
    }
    parseResponseContent(content) {
        // Try to parse as JSON first
        const cleanedContent = this.cleanJSONResponse(content);
        try {
            const parsed = JSON.parse(cleanedContent);
            const title = parsed.title || this.extractTitle(content) || 'Pull Request';
            const body = parsed.description || parsed.body || content;
            // For parsed JSON, if summary is missing, generate it from the body instead of the original content
            const summary = parsed.summary || this.generateFallbackSummary(body);
            return {
                title,
                body,
                summary
            };
        }
        catch {
            // If JSON parsing fails, fall back to text extraction
            const title = this.extractTitle(content) || 'Pull Request';
            const summary = this.extractSummary(content) || this.generateFallbackSummary(content);
            return {
                title,
                body: content,
                summary
            };
        }
    }
    cleanJSONResponse(content) {
        // Remove markdown code blocks if present
        let cleaned = content.replaceAll(/```json\s*/g, '').replaceAll(/```\s*/g, '');
        // Remove any leading/trailing whitespace
        cleaned = cleaned.trim();
        // Try to extract JSON from mixed content
        const jsonMatch = /\{[\s\S]*\}/.exec(cleaned);
        if (jsonMatch) {
            cleaned = jsonMatch[0];
        }
        return cleaned;
    }
    extractTitle(content) {
        // Look for title patterns
        const titlePatterns = [
            /^#\s+(.+)$/m, // Markdown header
            /^Title:\s*(.+)$/im, // Title: prefix
            /^##\s+(.+)$/m, // Markdown subheader
            /^###\s+(.+)$/m // Markdown sub-subheader
        ];
        for (const pattern of titlePatterns) {
            const match = pattern.exec(content);
            if (match?.[1]) {
                return match[1].trim();
            }
        }
        // If no pattern matches, try to extract first meaningful line
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && trimmed.length > 10 && trimmed.length < 100) {
                return trimmed;
            }
        }
        return null;
    }
    extractSummary(content) {
        // Look for summary patterns
        const summaryPatterns = [
            /^Summary:\s*(.+)$/im,
            /^## Summary\s*\n(.+)$/im,
            /^### Summary\s*\n(.+)$/im
        ];
        for (const pattern of summaryPatterns) {
            const match = pattern.exec(content);
            if (match?.[1]) {
                return match[1].trim();
            }
        }
        // Extract first paragraph as summary
        const paragraphs = content.split('\n\n');
        if (paragraphs.length > 0) {
            const firstParagraph = paragraphs[0].trim();
            if (firstParagraph.length > 20 && firstParagraph.length < 500) {
                return firstParagraph;
            }
        }
        return null;
    }
    generateFallbackSummary(content) {
        // Remove markdown formatting
        const plainText = content
            .replace(/```[\s\S]*?```/g, '') // Remove code blocks
            .replace(/`[^`]+`/g, '') // Remove inline code
            .replace(/[*_#]+/g, '') // Remove markdown formatting
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links but keep text
            .trim();
        // Split into paragraphs and find first meaningful one
        const paragraphs = plainText.split(/\n\n+/);
        let summary = '';
        for (const paragraph of paragraphs) {
            const trimmed = paragraph.trim();
            if (trimmed.length > 20) {
                summary = trimmed;
                break;
            }
        }
        // If no paragraph found, use the whole text
        if (!summary) {
            summary = plainText;
        }
        // If summary is too long, extract first sentence
        if (summary.length > 300) {
            const sentences = summary.split(/[.!?](?:\s+|$)/);
            for (const sentence of sentences) {
                const trimmed = sentence.trim();
                if (trimmed.length > 20) {
                    summary = trimmed;
                    break;
                }
            }
        }
        // Limit summary length to 300 characters
        if (summary.length > 300) {
            summary = summary.slice(0, 297) + '...';
        }
        return summary || 'Pull request changes';
    }
}
//# sourceMappingURL=response-parser.js.map