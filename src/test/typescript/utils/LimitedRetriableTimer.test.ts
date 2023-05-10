import { assert } from 'chai';
import { SinonFakeTimers, stub, useFakeTimers } from 'sinon';

import { LimitedRetriableTimer } from '@github-manager/utils/LimitedRetriableTimer';

import '@test-suite/globals';

describe('LimitedRetriableTimer', () => {
    let clock: SinonFakeTimers;
    let timer: LimitedRetriableTimer | undefined = undefined;

    const task = stub().callsFake(() => Promise.resolve(true));

    beforeEach(() => {
        clock = useFakeTimers();

        task.resetHistory();
    });

    afterEach(() => {
        clock.restore();
        timer?.stop();
    });

    it('can execute task on timer', async () => {
        timer = new LimitedRetriableTimer(task, 60);

        timer.start();

        await clock.tickAsync('02:00');

        // Expect three executions: One immediately, one at 60 seconds, one at 120 seconds
        assert.equal(task.callCount, 3);
    });

    it('can execute task on timer with a delay', async () => {
        timer = new LimitedRetriableTimer(task, 30);

        // Start after 90 seconds
        timer.start(90);

        await clock.tickAsync('02:00');

        // Expect two executions: One after 90 seconds, one at 120 seconds.
        assert.equal(task.callCount, 2);
    });

    it('increases delay on task failure', async () => {
        task.callsFake(() => Promise.resolve(task.callCount > 2));

        timer = new LimitedRetriableTimer(task, 10);

        // Start after 90 seconds
        timer.start();

        await clock.tickAsync('03:30');

        /*
            Expect 6 execution:
                1) Immediately, failed
                2) After 60 seconds, failed
                3) After 180 seconds, succeed
                4) After 190 seconds, succeed
                5) After 200 seconds, succeed
                6) After 210 seconds, succeed
        */
        assert.equal(task.callCount, 6);
    });

    it('can limit lower and higher intervals', async () => {
        task.callsFake(() => Promise.resolve(task.callCount > 1));

        timer = new LimitedRetriableTimer(task, 10);
        timer.lowerIntervalLimit = 20;
        timer.upperIntervalLimit = 40;

        // Start after 90 seconds
        timer.start();

        await clock.tickAsync('01:00');

        /*
            Expect 3 executions in 1 minute:
                1) Immediately, failed
                2) After 40 seconds, succeded (limited to 40 instead of 60 due to high limit)
                3) After 60 seconds, succeded (forced to 20 instead of 10 due to low limit)
        */
        assert.equal(task.callCount, 3);
    });

    it('stops if task throws error', async () => {
        task.callsFake(() => Promise.reject(new Error('Unexpected error')));

        timer = new LimitedRetriableTimer(task, 10);

        // Start after 90 seconds
        timer.start();

        await clock.tickAsync('01:00');

        // Expect only one call since after the 1st one the process stops
        assert.equal(task.callCount, 1);
    });
});
