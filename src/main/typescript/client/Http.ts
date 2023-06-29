import { readonlyMap } from '@github-manager/utils';

export enum HttpMethod {
    GET,
    HEAD,
    POST,
    PUT,
    DELETE,
    OPTIONS,
    TRACE,
    PATCH,
}

export class HttpRequest {
    private _url: string;
    private _method: HttpMethod;
    private _body: RequestBody | undefined;
    private readonly _headers: Map<string, string>;

    public constructor(method: HttpMethod, url: string, body?: RequestBody, headers?: Map<string, string>) {
        this._method = method;
        this._url = url;
        this._body = body;
        this._headers = headers ?? new Map<string, string>();
    }

    public get method(): string {
        return HttpMethod[this._method];
    }

    public get url(): string {
        return this._url;
    }

    public get body(): RequestBody | undefined {
        return this._body;
    }

    public set body(value: RequestBody | undefined) {
        this._body = value;
    }

    public get headers(): ReadonlyMap<string, string> {
        return readonlyMap(this._headers);
    }

    public addHeader(name: string, value: string): void {
        this._headers.set(name, value);
    }

    public removeHeader(name: string): void {
        this._headers.delete(name);
    }
}

export class RequestBody {
    public readonly contentType: string;
    public readonly data: string;

    public constructor(contentType: string, body: string) {
        this.contentType = contentType;
        this.data = body;
    }
}

export class HttpResponse {
    public readonly statusCode: number;
    public readonly body: string;
    public readonly length: number;
    public readonly headers: ReadonlyMap<string, string>;

    public constructor(stausCode: number, length: number, body?: string, headers?: Map<string, string>) {
        this.statusCode = stausCode;
        this.length = length;
        this.body = body ?? '';
        this.headers = headers ?? new Map<string, string>();
    }
}

export interface HttpEngine {
    send(request: HttpRequest): Promise<HttpResponse>;
}
