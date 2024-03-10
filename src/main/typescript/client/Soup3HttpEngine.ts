import GLib from '@girs/glib-2.0';
import Gio from '@girs/gio-2.0';
import Soup from '@girs/soup-3.0';

import { HttpEngine, HttpRequest, HttpResponse } from './Http';

export class Soup3HttpEngine implements HttpEngine {
    private readonly session: Soup.Session;

    public constructor(userAgent: string) {
        this.session = new Soup.Session();
        this.session.userAgent = `${userAgent} via Soup3`;
    }

    public async send(request: HttpRequest): Promise<HttpResponse> {
        const message = Soup.Message.new_from_uri(request.method, GLib.Uri.parse(request.url, Soup.HTTP_URI_FLAGS));

        // Set the headers
        request.headers.forEach((value: string, name: string) => message.requestHeaders.append(name, value));

        // Set the request body, if available
        if (request.body !== undefined) {
            const encoder = new TextEncoder();
            message.set_request_body_from_bytes(
                request.body.contentType,
                new GLib.Bytes(encoder.encode(request.body.data))
            );
        }

        return new Promise<HttpResponse>((resolve, reject) => {
            try {
                this.session.send_and_read_async(
                    message,
                    GLib.PRIORITY_DEFAULT,
                    null,
                    (session: Soup.Session | null, res: Gio.AsyncResult) => {
                        if (session === null) {
                            reject(new Error('Unable to retrieve session'));
                            return;
                        }

                        const bytes = session.send_and_read_finish(res).get_data();
                        const responseBody = new TextDecoder('utf-8').decode(bytes ?? new Uint8Array());

                        // Convert the headers
                        const headers = new Map<string, string>();
                        message.responseHeaders.foreach((name, value) => headers.set(name, value));

                        resolve(new HttpResponse(message.statusCode, responseBody.length, responseBody, headers));
                    }
                );
            } catch (error) {
                if (error instanceof Error) {
                    reject(error);
                } else {
                    reject(new Error('Unable to retrieve data'));
                }
            }
        });
    }
}
