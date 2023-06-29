export enum MemoryUse {
    STATIC = 0,
    TAKE = 1,
    COPY = 2,
    TEMPORARY = 3,
}

export class URI {
    public static new(_url: string): URI {
        return new URI();
    }
}

export class MessageHeaders {
    public append(_name: string, _value: string): void {}

    public foreach(_func: (name: string, value: string) => void): void {}
}

export class MessageBody {
    public length: number;
    public data: string;

    public constructor() {
        this.length = 0;
        this.data = '';
    }
}

export class Message {
    public requestHeaders: MessageHeaders;

    public statusCode: number;

    public responseBody: MessageBody;

    public constructor(_properties: unknown) {
        this.requestHeaders = new MessageHeaders();
        this.statusCode = 0;
        this.responseBody = new MessageBody();
    }

    public set_request(_content_type: string | null, _req_use: MemoryUse, _req_body?: Uint8Array | null): void {}
}

export class Session {
    public user_agent: string = 'stub-libsoup2';

    public queue_message(_msg: Message, _callback?: unknown): void {}
}
