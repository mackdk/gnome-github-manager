import { Bytes, PRIORITY_DEFAULT, Uri } from '@gi-types/glib2';
import { HTTP_URI_FLAGS, Message, Session } from '@gi-types/soup3';
import { getCurrentExtension } from '@gnome-shell/misc/extensionUtils';

import { Logger } from '@github-manager/utils';

import { AbstractGitHubClient, HttpReponse, RequestBody } from './AbstractGitHubClient';

export class Soup3GitHubClient extends AbstractGitHubClient {
    private static readonly LOGGER: Logger = new Logger('client::Soup3GitHubClient');

    private readonly session: Session;

    public constructor(domain: string, token: string) {
        super(domain, token);

        const extensionName: string = getCurrentExtension().metadata.name;

        this.session = new Session();
        this.session.user_agent = `${extensionName} Extension via libsoup2`;
    }

    protected async doRequest(method: string, url: string, request?: RequestBody): Promise<HttpReponse> {
        const message = Message.new_from_uri(method, Uri.parse(url, HTTP_URI_FLAGS));

        // Set the headers
        message.requestHeaders.append('X-GitHub-Api-Version', this.apiVersion);
        message.requestHeaders.append('Authorization', `Bearer ${this._token}`);

        // Set the request body, if available
        if (request !== undefined) {
            const encoder = new TextEncoder();
            message.set_request_body_from_bytes(request.contentType, new Bytes(encoder.encode(request.body)));
        }

        Soup3GitHubClient.LOGGER.debug('Executing {0} ON {1}', message.method, message.uri.to_string());

        const responseBody: string = await this.session
            .send_and_read_async(message, PRIORITY_DEFAULT, null)
            .then((bytes) => bytes.get_data() ?? new Uint8Array())
            .then((data) => new TextDecoder('utf-8').decode(data));

        Soup3GitHubClient.LOGGER.debug('Response: {0} - Length {1}', message.statusCode, responseBody.length);

        // Update the poll interval if set in the response
        const pollIntervalHeader = message.responseHeaders.get_one('X-Poll-Interval');
        if (pollIntervalHeader !== null) {
            const enforcedPollInterval = Number(pollIntervalHeader);
            if (enforcedPollInterval !== this._pollInterval) {
                Soup3GitHubClient.LOGGER.info('New polling interval enforced by GitHub {}s', enforcedPollInterval);
                this._pollInterval = enforcedPollInterval;
            }
        }

        return new HttpReponse(message.statusCode, responseBody.length, responseBody);
    }
}
