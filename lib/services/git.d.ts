import { GitChanges } from '../interface/git.js';
export type { FileChange, GitChanges } from '../interface/git.js';
export declare class GitService {
    private readonly git;
    constructor();
    getChanges(baseBranch?: string, includeDetailedDiff?: boolean): Promise<GitChanges>;
    getDiffContent(baseBranch?: string, maxLines?: number): Promise<string>;
    getCurrentBranch(): Promise<string>;
    validateRepository(): Promise<void>;
    hasUncommittedChanges(): Promise<boolean>;
    branchExists(branchName: string): Promise<boolean>;
    private mapGitStatus;
    private extractLineNumbers;
    pushCurrentBranch(): Promise<void>;
}
//# sourceMappingURL=git.d.ts.map