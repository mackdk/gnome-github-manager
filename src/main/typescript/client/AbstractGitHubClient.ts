import * as GitHub from './GitHubApiTypes';
import { ApiError, GitHubClient, HttpStatus } from './GitHubClient';

export class HttpReponse {
    public readonly statusCode: number;
    public readonly body: string;
    public readonly length: number;

    public constructor(stausCode: number, length: number, body?: string) {
        this.statusCode = stausCode;
        this.length = length;
        this.body = body ?? '';
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
    protected readonly apiVersion: string;

    protected _pollInterval: number;

    protected _domain: string;

    protected _token: string;

    protected constructor(domain: string, token: string) {
        this._pollInterval = 60;

        this._token = token;
        this._domain = domain;

        // GitHub API version to use
        this.apiVersion = '2022-11-28';
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
            this.handleRequestError(error);
        }

        this.validateResponseCode(response, HttpStatus.Ok);
        return JSON.parse(response.body) as GitHub.Thread[];
    }

    public async getWebUrlForSubject(subject: GitHub.Subject): Promise<string> {
        let response: HttpReponse;

        try {
            response = await this.doRequest('GET', subject.url);
        } catch (error) {
            this.handleRequestError(error);
        }

        this.validateResponseCode(response, HttpStatus.Ok);

        const subjectDetail = JSON.parse(response.body) as GitHub.HtmlAccessible;
        return subjectDetail.html_url;
    }

    public async markThreadAsRead(notification: GitHub.Thread): Promise<void> {
        let response: HttpReponse;

        try {
            response = await this.doRequest('PATCH', notification.url);
        } catch (error) {
            this.handleRequestError(error);
        }

        this.validateResponseCode(response, HttpStatus.ResetContent, HttpStatus.NotModified);
    }

    public async markAllThreadsAsRead(): Promise<void> {
        let response: HttpReponse;

        try {
            const markRequest: GitHub.MarkNotificationsArReadRequest = {
                last_read_at: new Date().toISOString(),
                read: true,
            };

            const request = new RequestBody('application/json', JSON.stringify(markRequest));

            response = await this.doRequest('PUT', `https://${this.baseUrl}/notifications`, request);
        } catch (error) {
            this.handleRequestError(error);
        }

        this.validateResponseCode(response, HttpStatus.Accepted, HttpStatus.ResetContent, HttpStatus.NotModified);
    }

    protected abstract doRequest(method: string, url: string, request?: RequestBody): Promise<HttpReponse>;

    private get baseUrl(): string {
        if (this.domain == 'github.com' || this.domain == 'api.github.com') {
            return 'api.github.com';
        } else {
            return `${this._domain}/api/v3`;
        }
    }

    private handleRequestError(error: unknown): never {
        if (error instanceof Error) {
            throw new ApiError(-1, 'Unable to perform API call', error);
        } else if (typeof error === 'string') {
            throw new ApiError(-1, `Unable to perform API call - ${error}`);
        }

        // Throw a generic error
        throw new ApiError(-1, 'Unable to perform API call');
    }

    private validateResponseCode(response: HttpReponse, ...validStates: number[]): void {
        if (!validStates.includes(response.statusCode)) {
            const errorResponse = JSON.parse(response.body) as GitHub.BasicError;
            const message =
                errorResponse.message ??
                HttpStatus[response.statusCode]
                    // insert a space between lower & upper
                    .replace(/([a-z])([A-Z])/g, '$1 $2')
                    // space before last upper in a sequence followed by lower
                    .replace(/\b([A-Z]+)([A-Z])([a-z])/, '$1 $2$3')
                    // uppercase the first character
                    .replace(/^./, (str: string) => str.toUpperCase());

            throw new ApiError(response.statusCode, message);
        }
    }
}
