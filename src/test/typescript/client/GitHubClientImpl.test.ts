import { readFileSync } from 'fs';

import { HttpEngineStup, testResource } from '@test-suite/testSupport';
import { assert } from 'chai';
import { stub } from 'sinon';

import * as GitHub from '@github-manager/client/GitHubApiTypes';
import { ApiError } from '@github-manager/client/GitHubClient';
import { GitHubClientImpl } from '@github-manager/client/GitHubClientImpl';
import { HttpEngine, HttpRequest, HttpResponse } from '@github-manager/client/Http';

import '@test-suite/globals';

interface ScenarioRequest {
    url: string;
    method: string;
    headers: Record<string, string> | undefined;
    contentType: string | undefined;
    data: unknown;
}

interface ScenarioResponse {
    status: number;
    headers: Record<string, string> | undefined;
    data: unknown;
}

interface ClientScenario {
    request: ScenarioRequest;
    response: ScenarioResponse;
}

describe('GitHubClientImpl', () => {
    let engineStub: HttpEngine;
    let client: GitHubClientImpl;
    let scenariosMap: Map<string, ClientScenario>;

    before(() => {
        const scenarioJSON = readFileSync(testResource('github-client-scenarios.json'), { encoding: 'utf-8' });
        scenariosMap = new Map<string, ClientScenario>(
            Object.entries(JSON.parse(scenarioJSON) as Record<string, ClientScenario>)
        );
    });

    beforeEach(() => {
        // Default implementation to allow stubbing
        engineStub = new HttpEngineStup();
    });

    it('initializes the properties correctly', () => {
        client = new GitHubClientImpl('github.com', 'fake-token', engineStub);

        assert.equal(client.domain, 'github.com');
        assert.equal(client.token, 'fake-token');
        assert.equal(client.pollInterval, 60);
        assert.equal(client.baseUrl, 'api.github.com');

        client = new GitHubClientImpl('mydomain.com', 'fake-token', engineStub);

        assert.equal(client.domain, 'mydomain.com');
        assert.equal(client.token, 'fake-token');
        assert.equal(client.pollInterval, 60);
        assert.equal(client.baseUrl, 'mydomain.com/api/v3');
    });

    it('can change domain and token', () => {
        client = new GitHubClientImpl('github.com', 'fake-token', engineStub);

        assert.equal(client.domain, 'github.com');
        assert.equal(client.token, 'fake-token');
        assert.equal(client.baseUrl, 'api.github.com');

        client.domain = 'mydomain.com';
        client.token = 'mydomain-token';

        assert.equal(client.domain, 'mydomain.com');
        assert.equal(client.token, 'mydomain-token');
        assert.equal(client.baseUrl, 'mydomain.com/api/v3');
    });

    it('can fetch all notification threads', async () => {
        const scenario: ClientScenario = getScenario('fetch-all-threads');
        const sendStub = stub(engineStub, 'send').returns(Promise.resolve(asHttpResponse(scenario.response)));

        client = new GitHubClientImpl('github.com', 'fake-token', engineStub);

        const threads = await client.listThreads(false);

        assert.isTrue(sendStub.calledOnce);
        assertRequest(sendStub.firstCall.firstArg as HttpRequest, scenario.request);

        assert.equal(threads.length, 2);

        assert.equal(threads[0].id, '6801720895');
        assert.equal(threads[0].reason, 'ci_activity');
        assert.equal(threads[0].last_read_at, '2023-06-18T13:30:15Z');
        assert.equal(threads[0].updated_at, '2023-06-18T11:24:27Z');
        assert.equal(threads[0].unread, true);
        assert.equal(threads[0].url, 'https://api.github.com/notifications/threads/6801720895');

        assert.equal(threads[0].repository.id, 534557096);
        assert.equal(threads[0].repository.node_id, 'R_kgDOH9yxqA');
        assert.equal(threads[0].repository.name, 'gnome-github-manager');
        assert.equal(threads[0].repository.html_url, 'https://github.com/mackdk/gnome-github-manager');

        assert.equal(threads[0].repository.owner.id, 2292684);
        assert.equal(threads[0].repository.owner.node_id, 'MDQ6VXNlcjIyOTI2ODQ=');
        assert.equal(threads[0].repository.owner.login, 'mackdk');
        assert.isUndefined(threads[0].repository.owner.name);
        assert.isUndefined(threads[0].repository.owner.email);
        assert.equal(threads[0].repository.owner.avatar_url, 'https://avatars.githubusercontent.com/u/2292684?v=4');

        // Verify the poll interval returned by GitHub
        assert.equal(client.pollInterval, 60);
    });

    it('can handle error response while retrieving threads', async () => {
        const scenario: ClientScenario = getScenario('fetch-threads-fails');
        const sendStub = stub(engineStub, 'send').returns(Promise.resolve(asHttpResponse(scenario.response)));

        client = new GitHubClientImpl('github.com', 'fake-token', engineStub);

        try {
            await client.listThreads();
            assert.fail('Error should have been thrown');
        } catch (err) {
            assert.isTrue(err instanceof ApiError);

            const apiError = err as ApiError;
            assert.equal(apiError.statusCode, 401);
            assert.equal(apiError.message, 'Custom message from server');
        }

        assert.isTrue(sendStub.calledOnce);
        assertRequest(sendStub.firstCall.firstArg as HttpRequest, scenario.request);
    });

    it('can handle error while executing request', async () => {
        const error = new Error('Request too fake to be executed');
        const sendStub = stub(engineStub, 'send').throws(error);

        client = new GitHubClientImpl('github.com', 'fake-token', engineStub);

        try {
            await client.listThreads();
            assert.fail('Error should have been thrown');
        } catch (err) {
            assert.isTrue(err instanceof ApiError);

            const apiError = err as ApiError;
            assert.equal(apiError.statusCode, -1);
            assert.equal(apiError.message, 'Unable to perform API call');
            assert.equal(apiError.cause, error);
        }

        assert.isTrue(sendStub.calledOnce);
    });

    it('can retrive html url for subject', async () => {
        const scenario: ClientScenario = getScenario('get-subject');
        const sendStub = stub(engineStub, 'send').returns(Promise.resolve(asHttpResponse(scenario.response)));

        const subject = { url: 'https://api.github.com/repos/uyuni-project/uyuni/pulls/7122' } as GitHub.Subject;

        client = new GitHubClientImpl('github.com', 'fake-token', engineStub);
        const webUrl = await client.getWebUrlForSubject(subject);

        assert.isTrue(sendStub.calledOnce);
        assertRequest(sendStub.firstCall.firstArg as HttpRequest, scenario.request);

        assert.equal(webUrl, 'https://github.com/uyuni-project/uyuni/pull/7122');

        // Verify the poll interval returned by GitHub
        assert.equal(client.pollInterval, 240);
    });

    it('can mark a thread as read', async () => {
        const scenario: ClientScenario = getScenario('mark-thread-read');
        const sendStub = stub(engineStub, 'send').returns(Promise.resolve(asHttpResponse(scenario.response)));

        const thread = { url: 'https://api.github.com/notifications/threads/6801720895' } as GitHub.Thread;

        client = new GitHubClientImpl('github.com', 'fake-token', engineStub);
        await client.markThreadAsRead(thread);

        assert.isTrue(sendStub.calledOnce);
        assertRequest(sendStub.firstCall.firstArg as HttpRequest, scenario.request);
    });

    it('can mark all threads as read', async () => {
        const scenario: ClientScenario = getScenario('mark-all-threads-read');
        const sendStub = stub(engineStub, 'send').returns(Promise.resolve(asHttpResponse(scenario.response)));

        client = new GitHubClientImpl('github.com', 'fake-token', engineStub);
        await client.markAllThreadsAsRead(new Date('2023-06-18T16:30:17Z'));

        assert.isTrue(sendStub.calledOnce);
        assertRequest(sendStub.firstCall.firstArg as HttpRequest, scenario.request);
    });

    // Retrieves the scenario with the given name
    function getScenario(name: string): ClientScenario {
        const scenario = scenariosMap.get(name);
        if (scenario === undefined) {
            assert.fail('Cannot find client scenario ' + name);
        }

        return scenario;
    }

    // Converts the response in the scenario to an HttpResponse object
    function asHttpResponse(response: ScenarioResponse): HttpResponse {
        const stringifiedData = response.data !== undefined ? JSON.stringify(response.data) : undefined;
        const headersMap = new Map<string, string>(Object.entries(response.headers ?? {}));

        return new HttpResponse(response.status, stringifiedData?.length ?? 0, stringifiedData, headersMap);
    }

    // Checks if the actual HttpRequest as the expected values
    function assertRequest(request: HttpRequest, expectedRequest: ScenarioRequest): void {
        assert.equal(request.url, expectedRequest.url);
        assert.equal(request.method, expectedRequest.method);
        if (expectedRequest.data !== undefined) {
            if (request.body === undefined) {
                assert.fail('Request body is undefined');
            }

            assert.equal(request.body.data, JSON.stringify(expectedRequest.data));
            assert.equal(request.body.contentType, expectedRequest.contentType);
        } else {
            assert.isUndefined(request.body);
        }

        const expectedHeaders = expectedRequest.headers;
        if (expectedHeaders !== undefined) {
            assert.equal(request.headers.size, Object.keys(expectedHeaders).length);
            request.headers.forEach((value, key) => assert.equal(value, expectedHeaders[key]));
        }
    }
});
