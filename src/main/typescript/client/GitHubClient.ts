export class ApiError extends Error {
    public readonly statusCode: number;
    public readonly cause?: Error;

    public constructor(statusCode: number, message: string, cause?: Error) {
        super(message);

        this.statusCode = statusCode;
        this.cause = cause;
    }
}

export interface ErrorResponse {
    message: string;
    documentation_url: string;
}

export interface Notification {
    id: string;
    unread: boolean;
    reason: string;
    updated_at: Date;
    last_read_at: Date;
    subject: NotificationSubject;
    url: string;
    subscription_url: string;
}

export interface NotificationSubject {
    title: string;
    url: string;
    latest_comment_url: string | null;
    type: string;
}

export interface GitHubClient {
    get pollInterval(): number;

    listNotifications(showParticipatingOnly?: boolean): Promise<Notification[]>;
}
