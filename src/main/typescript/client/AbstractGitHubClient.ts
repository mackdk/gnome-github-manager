import { Status, reason } from '@tshttp/status';

import { ApiError, ErrorResponse, GitHubClient, Notification } from './GitHubClient';

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

export abstract class AbstractGitHubClient implements GitHubClient {
    protected _pollInterval: number;

    protected constructor() {
        this._pollInterval = 60;
    }

    public get pollInterval(): number {
        return this._pollInterval;
    }

    public async listNotifications(showParticipatingOnly: boolean = false): Promise<Notification[]> {
        let response: HttpReponse;

        try {
            response = await this.doRequest('GET', `/notifications?${showParticipatingOnly.toString()}`);
        } catch (e) {
            if (e instanceof Error) {
                throw new ApiError(-1, 'Unable to perform API call', e);
            } else if (typeof e === 'string') {
                throw new ApiError(-1, `Unable to perform API call - ${e}`);
            }

            // Throw a generic error
            throw new ApiError(-1, 'Unable to perform API call');
        }

        if (response.statusCode == Status.Ok) {
            return JSON.parse(response.body) as Notification[];
        } else {
            const errorResponse = response.length > 0 ? (JSON.parse(response.body) as Partial<ErrorResponse>) : {};
            const message = errorResponse.message ?? reason(response.statusCode as Status);

            throw new ApiError(response.statusCode, message);
        }
    }

    protected abstract doRequest(method: string, url: string): Promise<HttpReponse>;
}
