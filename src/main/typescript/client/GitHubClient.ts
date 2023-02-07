import { Auth, AuthBasic, Message, Session, URI } from '@gi-types/soup2';
import { getCurrentExtension } from '@gnome-shell/misc/extensionUtils';
import { reason, Status } from '@tshttp/status';

import { Logger } from '@github-manager/utils';

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

class HttpReponse {
    public readonly statusCode: number;
    public readonly body: string;
    public readonly length: number;

    public constructor(stausCode: number, length: number, body?: string) {
        this.statusCode = stausCode;
        this.length = length;
        this.body = body === undefined ? '' : body;
    }
}

abstract class AbstractGitHubClient implements GitHubClient {

    protected _pollInterval: number;

    protected constructor() {
        this._pollInterval = 60;
    }

    public get pollInterval() : number {
        return this._pollInterval;
    }

    public async listNotifications(showParticipatingOnly = false): Promise<Notification[]> {
        let response : HttpReponse;

        try {
            response = await this.doRequest('GET', `/notifications?${showParticipatingOnly}`);
        } catch(e) {
            if (e instanceof Error) {
                throw new ApiError(-1, 'Unable to perform API call', e);
            } else if (typeof e === 'string') {
                throw new ApiError(-1, `Unable to perform API call - ${e}`);
            }

            // Throw a generic error
            throw new ApiError(-1, 'Unable to perform API call');
        }

        if (response.statusCode == Status.Ok) {
            return JSON.parse(response.body);
        } else {
            const errorResponse = response.length > 0 ? JSON.parse(response.body) : {};
            const message = errorResponse.message !== undefined ? errorResponse.message : reason(response.statusCode as Status);

            throw new ApiError(response.statusCode, message);
        }
    }

    protected abstract doRequest(method: string, url: string): Promise<HttpReponse>;
}

class LibSoup2GitHubClient extends AbstractGitHubClient {

    private static readonly LOGGER: Logger = new Logger('client::LibSoup2GitHubClient');

    private readonly session: Session;

    private readonly auth: Auth;

    private readonly domain: string;

    private readonly token: string;

    private readonly baseUrl: string;

    public constructor(domain: string, token: string) {
        super();

        const extensionName: string = getCurrentExtension().metadata.name;

        this.token = token;

        if (domain == 'github.com' || domain == 'api.github.com') {
            this.domain = 'api.github.com';
            this.baseUrl = 'api.github.com';
        } else {
            this.domain = domain;
            this.baseUrl = `${this.domain}/api/v3`;
        }

        this.session = new Session();
        this.session.user_agent = `gnome-shell-extension ${extensionName} via libsoup2`;

        this.auth = new AuthBasic({ host: this.domain, realm: 'Github Api' });
        this.auth.authenticate('', this.token);
    }

    protected doRequest(method: string, path: string): Promise<HttpReponse> {
        const soupUri = URI.new(`https://${this.baseUrl}${path}`);
        const request = new Message({ method: method, uri: soupUri });

        LibSoup2GitHubClient.LOGGER.debug('Executing {0} ON {1}', method, soupUri.to_string(false));
        request.requestHeaders.append('Authorization', this.auth.get_authorization(request));

        return new Promise<HttpReponse>((resolve, reject) => {
            try {
                this.session.queue_message(request, (_ : Session, response: Message) => {
                    LibSoup2GitHubClient.LOGGER.debug('Response: {0} - Length {1}', response.statusCode, response.responseBody.length);

                    // Update the poll interval if set in the response
                    if (response.responseHeaders.get('X-Poll-Interval')) {
                        this._pollInterval = Number(response.responseHeaders.get('X-Poll-Interval'));
                    }

                    resolve(new HttpReponse(response.statusCode, response.responseBody.length, response.responseBody.data));
                });
            } catch (e) {
                reject(e);
            }
        });
    }
}

export class GitHubClientFactory {

    private static readonly LOGGER: Logger = new Logger('client::GitHubClientFactory');

    public static newClient(domain: string, token: string) : GitHubClient {
        GitHubClientFactory.LOGGER.info('Using client for Soup version: {0}', imports.gi.versions.Soup);
        if (imports.gi.versions.Soup == '3.0') {
            throw new Error(`Unsupported Soup version: ${imports.gi.versions.Soup}`);
        } else {
            return new LibSoup2GitHubClient(domain, token);
        }
    }
}
