import Soup from '@girs/soup-2.4';

import { HttpEngine, HttpRequest, HttpResponse } from './Http';

export class Soup2HttpEngine implements HttpEngine {
    private readonly session: Soup.Session;

    public constructor(userAgent: string) {
        this.session = new Soup.Session();
        this.session.userAgent = `${userAgent} via Soup2`;
    }

    public send(request: HttpRequest): Promise<HttpResponse> {
        const soupUri = Soup.URI.new(request.url);
        const message = new Soup.Message({ method: request.method, uri: soupUri });

        // Set the headers
        request.headers.forEach((value: string, name: string) => message.requestHeaders.append(name, value));

        // Set the request body, if available
        if (request.body !== undefined) {
            const encoder = new TextEncoder();
            message.set_request(request.body.contentType, Soup.MemoryUse.COPY, encoder.encode(request.body.data));
        }

        return new Promise<HttpResponse>((resolve, reject) => {
            try {
                this.session.queue_message(message, (_: Soup.Session, msg: Soup.Message) => {
                    const headers = new Map<string, string>();
                    msg.requestHeaders.foreach((name, value) => headers.set(name, value));

                    resolve(new HttpResponse(msg.statusCode, msg.responseBody.length, msg.responseBody.data, headers));
                });
            } catch (error) {
                reject(error);
            }
        });
    }
}
