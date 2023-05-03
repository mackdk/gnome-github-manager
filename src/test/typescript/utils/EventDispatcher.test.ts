import { assert } from 'chai';
import { fake } from 'sinon';

import { EventDispatcher } from '@github-manager/utils/EventDispatcher';

describe('EventDispatcher', () => {
    it('can add a new event listeners', () => {
        const dispatcher = new EventDispatcher();
        let handle, callback;

        callback = fake();
        handle = dispatcher.addEventListener('test-event-one', callback);
        assert.equal(handle, 1);
        assert.isTrue(callback.notCalled);

        callback = fake();
        handle = dispatcher.addEventListener('test-event-one', callback);
        assert.equal(handle, 2);
        assert.isTrue(callback.notCalled);

        callback = fake();
        handle = dispatcher.addEventListener('test-event-two', callback);
        assert.equal(handle, 3);
        assert.isTrue(callback.notCalled);

        assert.equal(dispatcher.eventListenersMap.size, 2);
        assert.equal(dispatcher.eventListenersMap.get('test-event-one')?.size, 2);
        assert.equal(dispatcher.eventListenersMap.get('test-event-two')?.size, 1);
    });

    it('can remove existing event listener', () => {
        const dispatcher = new EventDispatcher();
        const handle = dispatcher.addEventListener('test-event-one', fake());

        assert.equal(dispatcher.eventListenersMap.size, 1);
        assert.equal(dispatcher.eventListenersMap.get('test-event-one')?.size, 1);

        dispatcher.removeEventListener('test-event-one', handle);
        assert.equal(dispatcher.eventListenersMap.size, 0);
        assert.equal(dispatcher.eventListenersMap.get('test-event-one')?.size, undefined);
    });

    it('does not remove non-existing listeners', () => {
        const dispatcher = new EventDispatcher();
        const handle = dispatcher.addEventListener('test-event-one', fake());

        assert.equal(dispatcher.eventListenersMap.size, 1);
        assert.equal(dispatcher.eventListenersMap.get('test-event-one')?.size, 1);

        dispatcher.removeEventListener('unexisting-event', handle);
        assert.equal(dispatcher.eventListenersMap.size, 1);
        assert.equal(dispatcher.eventListenersMap.get('test-event-one')?.size, 1);

        dispatcher.removeEventListener('test-event-one', 5);
        assert.equal(dispatcher.eventListenersMap.size, 1);
        assert.equal(dispatcher.eventListenersMap.get('test-event-one')?.size, 1);

        dispatcher.removeEventListener('unexisting-event', 5);
        assert.equal(dispatcher.eventListenersMap.size, 1, 'two');
        assert.equal(dispatcher.eventListenersMap.get('test-event-one')?.size, 1);
    });

    it('calls registered listeners when the event is emitted', async () => {
        const dispatcher = new EventDispatcher();

        const callback1 = fake();
        const callback2 = fake();
        const callback3 = fake();

        dispatcher.addEventListener('test-event-one', callback1);
        dispatcher.addEventListener('test-event-one', callback2);

        dispatcher.addEventListener('test-event-two', callback3);

        await dispatcher.emit('test-event-one');

        assert.isTrue(callback1.calledOnce);
        assert.isTrue(callback2.calledOnce);
        assert.isTrue(callback3.notCalled);

        await dispatcher.emit('test-event-two');

        assert.isTrue(callback1.calledOnce);
        assert.isTrue(callback2.calledOnce);
        assert.isTrue(callback3.calledOnce);

        await dispatcher.emit('test-event-one');

        assert.isTrue(callback1.calledTwice);
        assert.isTrue(callback2.calledTwice);
        assert.isTrue(callback3.calledOnce);

        await dispatcher.emit('test-event-three');

        assert.isTrue(callback1.calledTwice);
        assert.isTrue(callback2.calledTwice);
        assert.isTrue(callback3.calledOnce);
    });

    it('removes all listener on dispose', () => {
        const dispatcher = new EventDispatcher();

        const callback1 = fake();
        const callback2 = fake();
        const callback3 = fake();

        dispatcher.addEventListener('test-event-one', callback1);
        dispatcher.addEventListener('test-event-one', callback2);

        dispatcher.addEventListener('test-event-two', callback3);

        assert.equal(dispatcher.eventListenersMap.size, 2);
        assert.equal(dispatcher.eventListenersMap.get('test-event-one')?.size, 2);
        assert.equal(dispatcher.eventListenersMap.get('test-event-two')?.size, 1);

        dispatcher.dispose();

        assert.equal(dispatcher.eventListenersMap.size, 0);
        assert.isUndefined(dispatcher.eventListenersMap.get('test-event-one'));
        assert.isUndefined(dispatcher.eventListenersMap.get('test-event-two'));
    });
});
