import * as GitHub from './GitHubApiTypes';

export class ApiError extends Error {
    public readonly statusCode: number;
    public readonly cause?: Error;

    public constructor(statusCode: number, message: string, cause?: Error) {
        super(message);

        this.statusCode = statusCode;
        this.cause = cause;
    }
}

export interface GitHubClient {
    get pollInterval(): number;

    get domain(): string;
    set domain(value: string);

    get token(): string;
    set token(value: string);

    listThreads(showParticipatingOnly?: boolean): Promise<GitHub.Thread[]>;
    markThreadAsRead(githubNotification: GitHub.Thread): void;
    markAllThreadsAsRead(): void;

    getWebUrlForSubject(subject: GitHub.Subject): Promise<string>;
}
