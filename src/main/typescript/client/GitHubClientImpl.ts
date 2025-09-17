import { Logger, lazy } from '@github-manager/utils';

import * as GitHub from './GitHubApiTypes';
import { ApiError, GitHubClient, HttpStatus } from './GitHubClient';
import { HttpEngine, HttpMethod, HttpRequest, HttpResponse, RequestBody } from './Http';

export class GitHubClientImpl implements GitHubClient {
    @lazy
    private static readonly LOGGER: Logger = new Logger('client::GitHubClientImpl');

    // GitHub API version to use
    private static readonly API_VERSION: string = '2022-11-28';

    private static readonly DEFAULT_API_POLL_INTERVAL: number = 60;

    private readonly engine: HttpEngine;

    private _pollInterval: number;

    private _domain: string;

    private _token: string;

    public constructor(domain: string, token: string, engine: HttpEngine) {
        this._pollInterval = GitHubClientImpl.DEFAULT_API_POLL_INTERVAL;

        this._token = token;
        this._domain = domain;

        this.engine = engine;
    }

    public get pollInterval(): number {
        return this._pollInterval;
    }

    public get domain(): string {
        return this._domain;
    }

    public set domain(value: string) {
        this._domain = value;
    }

    public get token(): string {
        return this._token;
    }

    public set token(value: string) {
        this._token = value;
    }

    public get baseUrl(): string {
        if (this._domain === 'github.com' || this._domain === 'api.github.com') {
            return 'api.github.com';
        } else {
            return `${this._domain}/api/v3`;
        }
    }

    public get httpEngine(): HttpEngine {
        return this.engine;
    }

    public async listThreads(showParticipatingOnly: boolean = false): Promise<GitHub.Thread[]> {
        const response = await this.doRequest(
            HttpMethod.GET,
            `https://${this.baseUrl}/notifications?participating=${showParticipatingOnly.toString()}`,
            [HttpStatus.Ok]
        );

        return JSON.parse(response.body) as GitHub.Thread[];
    }

    public async getWebUrlForSubject(subject: GitHub.Subject): Promise<string> {
        const response = await this.doRequest(HttpMethod.GET, subject.url, [HttpStatus.Ok]);

        const subjectDetail = JSON.parse(response.body) as GitHub.HtmlAccessible;
        return subjectDetail.html_url;
    }

    public async markThreadAsRead(notification: GitHub.Thread): Promise<void> {
        await this.doRequest(HttpMethod.PATCH, notification.url, [HttpStatus.ResetContent, HttpStatus.NotModified]);
    }

    public async markAllThreadsAsRead(updateDate: Date = new Date()): Promise<void> {
        await this.doRequest(
            HttpMethod.PUT,
            `https://${this.baseUrl}/notifications`,
            [HttpStatus.Accepted, HttpStatus.ResetContent, HttpStatus.NotModified],
            { last_read_at: updateDate.toISOString(), read: true } as GitHub.MarkNotificationsArReadRequest
        );
    }

    private async doRequest(
        method: HttpMethod,
        url: string,
        validStatus?: number[],
        requestObject?: unknown
    ): Promise<HttpResponse> {
        const request = new HttpRequest(method, url);

        // Add body if specified
        if (requestObject !== undefined) {
            request.body = new RequestBody('application/json', JSON.stringify(requestObject));
        }

        // Add authorization and versioning
        request.addHeader('X-GitHub-Api-Version', GitHubClientImpl.API_VERSION);
        request.addHeader('Authorization', `Bearer ${this._token}`);

        let response: HttpResponse;

        try {
            GitHubClientImpl.LOGGER.debug('HTTP {0}: {1}', request.method, request.url);
            response = await this.engine.send(request);
            GitHubClientImpl.LOGGER.debug('Response code: {0} - Length {1}', response.statusCode, response.length);
        } catch (error) {
            GitHubClientImpl.handleRequestError(error);
        }

        this.updatePollIntervalFromHeader(response.headers.get('X-Poll-Interval'));

        if (validStatus !== undefined) {
            GitHubClientImpl.validateResponseCode(response, ...validStatus);
        }

        return response;
    }

    private updatePollIntervalFromHeader(header: string | undefined): void {
        if (header === undefined) {
            return;
        }

        const enforcedPollInterval = Number(header);
        if (enforcedPollInterval !== this._pollInterval) {
            GitHubClientImpl.LOGGER.info('New polling interval enforced by GitHub {0}s', enforcedPollInterval);
            this._pollInterval = enforcedPollInterval;
        }
    }

    private static handleRequestError(error: unknown): never {
        GitHubClientImpl.LOGGER.info('{0} - {1} - {2}', error, typeof error, error instanceof Object);
        if (error instanceof Error) {
            throw new ApiError(-1, 'Unable to perform API call', error);
        } else if (typeof error === 'string') {
            throw new ApiError(-1, `Unable to perform API call - ${error}`);
        }

        // Throw a generic error
        throw new ApiError(-1, `Unable to perform API call - ${error?.toString() ?? 'error undefined'}`);
    }

    private static validateResponseCode(response: HttpResponse, ...validStates: number[]): void {
        if (!validStates.includes(response.statusCode)) {
            const errorResponse = JSON.parse(response.body) as GitHub.BasicError;
            const message =
                errorResponse.message ??
                'Invalid status code: ' +
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
