import { Auth, AuthBasic, HTTP_URI_FLAGS, Message, Session } from '@gi-types/soup3';
import { getCurrentExtension } from '@gnome-shell/misc/extensionUtils';

import { Logger } from '@github-manager/utils';

import { AbstractGitHubClient, HttpReponse } from './AbstractGitHubClient';
import { Uri, PRIORITY_DEFAULT, Bytes } from '@gi-types/glib2';

export class Soup3GitHubClient extends AbstractGitHubClient {

    private static readonly LOGGER: Logger = new Logger('client::Soup3GitHubClient');

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

        this.auth = new AuthBasic({ realm: 'Github Api' });
        this.auth.authenticate('', this.token);
    }

    protected async doRequest(method: string, path: string): Promise<HttpReponse> {
        const message = Message.new_from_uri(method, Uri.parse(`https://${this.baseUrl}${path}`, HTTP_URI_FLAGS));

        Soup3GitHubClient.LOGGER.debug('Executing {0} ON {1}', message.method, message.uri.to_string());
        message.requestHeaders.append('Authorization', this.auth.get_authorization(message));

        const bytes = await this.session.send_and_read_async(message, PRIORITY_DEFAULT, null);
        const responseBody: string = new TextDecoder('utf-8').decode(bytes.get_data()?.buffer);
        Soup3GitHubClient.LOGGER.debug('Response: {0} - Length {1}', message.statusCode, responseBody.length);

        // Update the poll interval if set in the response
        const pollIntervalHeader = message.responseHeaders.get_one('X-Poll-Interval');
        if (pollIntervalHeader) {
            this._pollInterval = Number(pollIntervalHeader);
        }

        return new HttpReponse(message.statusCode, responseBody.length, responseBody);
    }
}
