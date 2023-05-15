import { Bytes, PRIORITY_DEFAULT, Uri } from '@gi-types/glib2';
import { HTTP_URI_FLAGS, Message, Session } from '@gi-types/soup3';

import { HttpEngine, HttpRequest, HttpResponse } from './Http';

export class Soup3HttpEngine implements HttpEngine {
    private readonly session: Session;

    public constructor(userAgent: string) {
        this.session = new Session();
        this.session.user_agent = `${userAgent} via Soup3`;
    }

    public async send(request: HttpRequest): Promise<HttpResponse> {
        const message = Message.new_from_uri(request.method, Uri.parse(request.url, HTTP_URI_FLAGS));

        // Set the headers
        request.headers.forEach((value: string, name: string) => message.requestHeaders.append(name, value));

        // Set the request body, if available
        if (request.body !== undefined) {
            const encoder = new TextEncoder();
            message.set_request_body_from_bytes(request.body.contentType, new Bytes(encoder.encode(request.body.data)));
        }

        const responseBody: string = await this.session
            .send_and_read_async(message, PRIORITY_DEFAULT, null)
            .then((bytes) => bytes.get_data() ?? new Uint8Array())
            .then((data) => new TextDecoder('utf-8').decode(data));

        // Convert the headers
        const headers = new Map<string, string>();
        message.responseHeaders.foreach((name, value) => headers.set(name, value));

        return new HttpResponse(message.statusCode, responseBody.length, responseBody, headers);
    }
}
