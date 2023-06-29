import { dirname, resolve } from 'path';

import callsites from 'callsites';

import { HttpEngine, HttpRequest, HttpResponse } from '@github-manager/client/Http';

// Simple do-nothing HttpEngine implementation for unit tests
export class HttpEngineStup implements HttpEngine {
    public send(_request: HttpRequest): Promise<HttpResponse> {
        return Promise.resolve(new HttpResponse(200, 0));
    }
}

// Load a resource for the current test using the same base path within the test/resources path
export function testResource(filename: string): string {
    const callerFile = callsites()[1].getFileName();
    if (callerFile === null) {
        throw new Error("Unable to retrieve test resources path for file '" + filename + "'");
    }

    return resolve(dirname(callerFile).replace('test/typescript', 'test/resources'), filename);
};
