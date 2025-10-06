import { simpleGit } from 'simple-git';
import { CONFIG, LIMITS } from '../constants/index.js';
export class GitService {
    constructor() {
        this.git = simpleGit();
    }
    async getChanges(baseBranch = CONFIG.DEFAULT_BRANCH, includeDetailedDiff = false) {
        // Get current branch
        const currentBranch = await this.git.branch();
        const current = currentBranch.current;
        if (current === baseBranch) {
            throw new Error(`Cannot compare branch with itself. Current branch is '${baseBranch}'. Please checkout a feature branch.`);
        }
        // Get diff stats between base and current branch
        const diffSummary = await this.git.diffSummary([`${baseBranch}...HEAD`]);
        // Get commit messages
        const log = await this.git.log({ from: baseBranch, to: 'HEAD' });
        const commits = log.all.map(commit => commit.message);
        // Process file changes
        const files = await Promise.all(diffSummary.files.map(async (file) => {
            const baseFileChange = {
                file: file.file,
                status: this.mapGitStatus(file),
                insertions: 'insertions' in file ? file.insertions : 0,
                deletions: 'deletions' in file ? file.deletions : 0,
                changes: 'changes' in file ? file.changes : 0
            };
            if (includeDetailedDiff) {
                const fileDiff = await this.git.diff([`${baseBranch}...HEAD`, '--', file.file]);
                baseFileChange.diffContent = fileDiff;
                baseFileChange.lineNumbers = this.extractLineNumbers(fileDiff);
            }
            return baseFileChange;
        }));
        return {
            files,
            totalInsertions: diffSummary.insertions,
            totalDeletions: diffSummary.deletions,
            totalFiles: files.length,
            commits
        };
    }
    async getDiffContent(baseBranch = CONFIG.DEFAULT_BRANCH, maxLines = LIMITS.DEFAULT_MAX_DIFF_LINES) {
        const diff = await this.git.diff([`${baseBranch}...HEAD`]);
        // Limit diff content to prevent overwhelming the AI
        const lines = diff.split('\n');
        if (lines.length > maxLines) {
            return lines.slice(0, maxLines).join('\n') + '\n\n... (diff truncated for brevity)';
        }
        return diff;
    }
    async getCurrentBranch() {
        const branch = await this.git.branch();
        return branch.current;
    }
    async validateRepository() {
        const isRepo = await this.git.checkIsRepo();
        if (!isRepo) {
            throw new Error('Not in a git repository');
        }
    }
    async hasUncommittedChanges() {
        const status = await this.git.status();
        return status.files.length > 0;
    }
    async branchExists(branchName) {
        try {
            const branches = await this.git.branch(['-a']);
            return branches.all.some(branch => branch === branchName ||
                branch === `remotes/origin/${branchName}` ||
                branch.endsWith(`/${branchName}`));
        }
        catch {
            return false;
        }
    }
    mapGitStatus(file) {
        // Handle binary files
        if ('binary' in file && file.binary)
            return 'modified';
        // Check for renames first
        if (file.file && file.file.includes(' => '))
            return 'renamed';
        // Check insertions/deletions if they exist
        if ('insertions' in file && 'deletions' in file) {
            if (file.insertions > 0 && file.deletions === 0)
                return 'added';
            if (file.insertions === 0 && file.deletions > 0)
                return 'deleted';
        }
        return 'modified';
    }
    extractLineNumbers(diffContent) {
        const added = [];
        const removed = [];
        const lines = diffContent.split('\n');
        let currentNewLine = 0;
        let currentOldLine = 0;
        for (const line of lines) {
            // Parse hunk headers (e.g., @@ -1,4 +1,6 @@)
            const hunkMatch = /^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/.exec(line);
            if (hunkMatch) {
                currentOldLine = Number.parseInt(hunkMatch[1], LIMITS.HUNK_HEADER_OFFSET) - 1;
                currentNewLine = Number.parseInt(hunkMatch[2], LIMITS.HUNK_HEADER_OFFSET) - 1;
                continue;
            }
            // Skip lines that don't represent content changes
            if (line.startsWith('diff --git') ||
                line.startsWith('index ') ||
                line.startsWith('+++') ||
                line.startsWith('---')) {
                continue;
            }
            // Handle content lines
            if (line.startsWith('+') && !line.startsWith('+++')) {
                currentNewLine++;
                added.push(currentNewLine);
            }
            else if (line.startsWith('-') && !line.startsWith('---')) {
                currentOldLine++;
                removed.push(currentOldLine);
            }
            else if (line.startsWith(' ')) {
                // Unchanged line - increment both counters
                currentNewLine++;
                currentOldLine++;
            }
        }
        return { added, removed };
    }
    async pushCurrentBranch() {
        const currentBranch = await this.getCurrentBranch();
        await this.git.push('origin', currentBranch, ['--set-upstream']);
    }
}
//# sourceMappingURL=git.js.map