export interface GitHubRepo {
    owner: string;
    repo: string;
}

export interface PullRequest {
    title: string;
    body: string;
    head: string;
    base: string;
    draft?: boolean;
}

export interface PullRequestTemplate {
    name: string;
    content: string;
}
