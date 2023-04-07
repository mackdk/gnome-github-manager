import { Status, reason } from '@tshttp/status';

import * as GitHub from './GitHubApiTypes';
import { ApiError, GitHubClient } from './GitHubClient';

export class HttpReponse {
    public readonly statusCode: number;
    public readonly body: string;
    public readonly length: number;

    public constructor(stausCode: number, length: number, body?: string) {
        this.statusCode = stausCode;
        this.length = length;
        this.body = body === undefined ? '' : body;
    }
}

export class RequestBody {
    public readonly contentType: string;
    public readonly body: string;

    public constructor(contentType: string, body: string) {
        this.contentType = contentType;
        this.body = body;
    }
}

export abstract class AbstractGitHubClient implements GitHubClient {
    protected _pollInterval: number;

    protected _domain: string;

    protected _token: string;

    protected constructor(domain: string, token: string) {
        this._pollInterval = 60;

        this._token = token;
        this._domain = domain;
    }

    public get pollInterval(): number {
        return this._pollInterval;
    }

    public get token(): string {
        return this._token;
    }

    public set token(value: string) {
        this._token = value;
    }

    public get domain(): string {
        return this._domain;
    }

    public set domain(value: string) {
        this._domain = value;
    }

    public async listThreads(showParticipatingOnly: boolean = false): Promise<GitHub.Thread[]> {
        let response: HttpReponse;

        try {
            response = await this.doRequest(
                'GET',
                `https://${this.baseUrl}/notifications?${showParticipatingOnly.toString()}`
            );
        } catch (error) {
            throw this.handleRequestError(error);
        }

        if (response.statusCode == Status.Ok) {
            return JSON.parse(response.body) as GitHub.Thread[];
        }

        throw this.handleBadResponse(response);
    }

    public async getWebUrlForSubject(subject: GitHub.Subject): Promise<string> {
        let response: HttpReponse;

        try {
            response = await this.doRequest('GET', subject.url);
        } catch (error) {
            throw this.handleRequestError(error);
        }

        if (response.statusCode == Status.Ok) {
            const subjectDetail = JSON.parse(response.body) as GitHub.HtmlAccessible;
            return subjectDetail.html_url;
        }

        throw this.handleBadResponse(response);
    }

    public markThreadAsRead(notification: GitHub.Thread): void {
        this.doRequest('PATCH', notification.url)
            .then((response) => {
                const successStates: number[] = [Status.ResetContent, Status.NotModified];
                if (!successStates.includes(response.statusCode)) {
                    throw this.handleBadResponse(response);
                }
            })
            .catch((error) => {
                throw this.handleRequestError(error);
            });
    }

    public markAllThreadsAsRead(): void {
        const markRequest: GitHub.MarkNotificationsArReadRequest = {
            last_read_at: new Date().toISOString(),
            read: true,
        };

        const request = new RequestBody('application/json', JSON.stringify(markRequest));

        this.doRequest('PUT', `https://${this.baseUrl}/notifications`, request)
            .then((response) => {
                const successStates: number[] = [Status.Accepted, Status.ResetContent, Status.NotModified];
                if (!successStates.includes(response.statusCode)) {
                    throw this.handleBadResponse(response);
                }
            })
            .catch((error) => {
                throw this.handleRequestError(error);
            });
    }

    protected abstract doRequest(method: string, url: string, request?: RequestBody): Promise<HttpReponse>;

    private get baseUrl(): string {
        if (this.domain == 'github.com' || this.domain == 'api.github.com') {
            return 'api.github.com';
        } else {
            return `${this._domain}/api/v3`;
        }
    }

    private handleRequestError(error: unknown): ApiError {
        if (error instanceof Error) {
            return new ApiError(-1, 'Unable to perform API call', error);
        } else if (typeof error === 'string') {
            return new ApiError(-1, `Unable to perform API call - ${error}`);
        }

        // Throw a generic error
        return new ApiError(-1, 'Unable to perform API call');
    }

    private handleBadResponse(response: HttpReponse): ApiError {
        const errorResponse = JSON.parse(response.body) as GitHub.BasicError;
        const message = errorResponse.message ?? reason(response.statusCode as Status);

        return new ApiError(response.statusCode, message);
    }
}
