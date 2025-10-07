export interface FileChange {
    file: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed';
    insertions: number;
    deletions: number;
    changes: number;
    diffContent?: string;
    lineNumbers?: {
        added: number[];
        removed: number[];
    };
}
export interface GitChanges {
    files: FileChange[];
    totalInsertions: number;
    totalDeletions: number;
    totalFiles: number;
    commits: string[];
}
//# sourceMappingURL=git.d.ts.map