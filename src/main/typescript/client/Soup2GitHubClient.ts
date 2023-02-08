import { Auth, AuthBasic, Message, Session, URI } from '@gi-types/soup2';
import { getCurrentExtension } from '@gnome-shell/misc/extensionUtils';

import { Logger } from '@github-manager/utils';

import { AbstractGitHubClient, HttpReponse } from './AbstractGitHubClient';

export class Soup2GitHubClient extends AbstractGitHubClient {

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

        Soup2GitHubClient.LOGGER.debug('Executing {0} ON {1}', method, soupUri.to_string(false));
        request.requestHeaders.append('Authorization', this.auth.get_authorization(request));

        return new Promise<HttpReponse>((resolve, reject) => {
            try {
                this.session.queue_message(request, (_ : Session, response: Message) => {
                    Soup2GitHubClient.LOGGER.debug('Response: {0} - Length {1}', response.statusCode, response.responseBody.length);

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
