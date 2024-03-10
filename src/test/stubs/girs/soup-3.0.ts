import GLib from './glib-2.0';
import Gio from './gio-2.0';

export namespace Soup {
    export const HTTP_URI_FLAGS = 0;

    export class MessageHeaders {
        public append(_name: string, _value: string): void {}

        public foreach(_func: (name: string, value: string) => void): void {}
    }

    export class Message {
        public requestHeaders: MessageHeaders;

        public responseHeaders: MessageHeaders;

        public statusCode: number;

        public static new_from_uri(_method: string, _uri: GLib.Uri): Message {
            return new Message();
        }

        public constructor() {
            this.requestHeaders = new MessageHeaders();
            this.responseHeaders = new MessageHeaders();
            this.statusCode = 0;
        }

        public set_request_body_from_bytes(_content_type?: string | null, _bytes?: GLib.Bytes | null): void {}
    }

    export class Session {
        public userAgent: string = 'stub-libsoup3';

        public send_and_read_async(_msg: Message, _io_priority: number, _cancellable?: unknown, callback?: Gio.AsyncReadyCallback<this> | null): void {}

        public send_and_read_finish(result: Gio.AsyncResult): GLib.Bytes {
            return new GLib.Bytes();
        }
    }
}

export default Soup;
