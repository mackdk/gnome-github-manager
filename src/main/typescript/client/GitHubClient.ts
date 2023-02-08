
export class ApiError {
    public readonly statusCode: number;
    public readonly message: string;
    public readonly error?: Error;

    public constructor(statusCode: number, message: string, error? : Error) {
        this.statusCode = statusCode;
        this.message = message;
        this.error = error;
    }
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

    get pollInterval() : number;

    listNotifications(showParticipatingOnly?: boolean): Promise<Notification[]>;
}
