import { MemoryUse, Message, Session, URI } from '@gi-types/soup2';
import { getCurrentExtension } from '@gnome-shell/misc/extensionUtils';

import { Logger } from '@github-manager/utils';

import { AbstractGitHubClient, HttpReponse, RequestBody } from './AbstractGitHubClient';

export class Soup2GitHubClient extends AbstractGitHubClient {
    private static readonly LOGGER: Logger = new Logger('client::LibSoup2GitHubClient');

    private readonly session: Session;

    public constructor(domain: string, token: string) {
        super(domain, token);

        const extensionName: string = getCurrentExtension().metadata.name;

        this.session = new Session();
        this.session.user_agent = `gnome-shell-extension ${extensionName} via libsoup2`;
    }

    protected doRequest(method: string, url: string, request?: RequestBody): Promise<HttpReponse> {
        const soupUri = URI.new(url);
        const message = new Message({ method: method, uri: soupUri });

        // Set the headers
        message.requestHeaders.append('Authorization', `Bearer ${this.token}`);

        // Set the request body, if available
        if (request) {
            const encoder = new TextEncoder();
            message.set_request(request.contentType, MemoryUse.COPY, encoder.encode(request.body));
        }

        Soup2GitHubClient.LOGGER.debug('Executing {0} ON {1}', method, soupUri.to_string(false));

        return new Promise<HttpReponse>((resolve, reject) => {
            try {
                this.session.queue_message(message, (_: Session, msg: Message) => {
                    Soup2GitHubClient.LOGGER.debug('Response: {0} length {1}', msg.statusCode, msg.responseBody.length);

                    // Update the poll interval if set in the response
                    if (msg.responseHeaders.get('X-Poll-Interval')) {
                        this._pollInterval = Number(msg.responseHeaders.get('X-Poll-Interval'));
                    }

                    resolve(new HttpReponse(msg.statusCode, msg.responseBody.length, msg.responseBody.data));
                });
            } catch (error) {
                reject(error);
            }
        });
    }
}
