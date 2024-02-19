import { dirname, resolve } from 'path';

import callsites from 'callsites';

import * as GitHub from '@github-manager/client/GitHubApiTypes';
import { GitHubClient } from '@github-manager/client/GitHubClient';
import { HttpEngine, HttpRequest, HttpResponse } from '@github-manager/client/Http';

// Simple do-nothing HttpEngine implementation
export class HttpEngineStup implements HttpEngine {
    public send(_request: HttpRequest): Promise<HttpResponse> {
        return Promise.resolve(new HttpResponse(200, 0));
    }
}

// Simple do-nothing GitHub client implementation
export class GitHubClientStub implements GitHubClient {
    public readonly pollInterval: number = 100;
    public domain: string = 'stub.domain.com';
    public token: string = 'FakeToken';

    public listThreads(_showParticipatingOnly?: boolean): Promise<GitHub.Thread[]> {
        return Promise.resolve([]);
    }

    public markThreadAsRead(_githubNotification: GitHub.Thread): Promise<void> {
        return Promise.resolve();
    }

    public markAllThreadsAsRead(_updateDate?: Date): Promise<void> {
        return Promise.resolve();
    }

    public getWebUrlForSubject(_subject: GitHub.Subject): Promise<string> {
        return Promise.resolve('http://example.com');
    }
}

// Load a resource for the current test using the same base path within the test/resources path
export function testResource(filename: string): string {
    const callerFile = callsites()[1].getFileName();
    if (callerFile === null) {
        throw new Error("Unable to retrieve test resources path for file '" + filename + "'");
    }

    return resolve(dirname(callerFile).replace('test/typescript', 'test/resources'), filename);
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function assertWithRetries(name: string, retries: number, delay: number, code: () => void): Promise<void> {
    let failure: unknown;

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            code();
            return;
        } catch (error) {
            failure = error;
            await sleep(delay);
        }
    }

    throw failure;
}
