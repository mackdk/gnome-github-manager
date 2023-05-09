import { assert } from 'chai';

import { formatString, readonlyMap } from '@github-manager/utils/utilities';

describe('General utilities', () => {
    describe('formatString()', () => {
        it('can produce the correctly formatted string', () => {
            assert.equal(
                formatString('Task #{0} has failed. {1}: {2}', 10, 'E_DUMMY_CODE', 4983),
                'Task #10 has failed. E_DUMMY_CODE: 4983'
            );
        });

        it('calls toString() on object, if available', () => {
            assert.equal(
                formatString('Received event object "{0}"', { value: 3 }),
                'Received event object "[object Object]"'
            );

            assert.equal(
                formatString('Received event object "{0}"', { toString: () => 'TO_STRING_GENERATED' }),
                'Received event object "TO_STRING_GENERATED"'
            );
        });

        it('ignores additional arguments or missing ones', () => {
            // Missing two arguments
            assert.equal(formatString('Task #{0} has failed. {1}: {2}', 10), 'Task #10 has failed. {1}: {2}');

            // Additional arguments
            assert.equal(
                formatString('Task #{0} has failed. {1}: {2}', 10, 'E_DUMMY_CODE', 4983, 'NO_ERROR', 23786),
                'Task #10 has failed. E_DUMMY_CODE: 4983'
            );
        });

        it('can handle null and undefined as paramaters while formatting', () => {
            // Additional arguments
            assert.equal(
                formatString('Task #{0} has failed. {1}: {2}', null, undefined, { toString: () => undefined }),
                'Task #{0} has failed. {1}: {2}'
            );
        });
    });

    describe('readonlyMap', () => {
        it('resulting map cannot be cast to Map and edited', () => {
            const originalMap = new Map<string, number>();

            originalMap.set('key-1', 1);
            originalMap.set('key-2', 2);

            const unmodifiableMap = readonlyMap(originalMap);
            assert.isTrue(Object.isFrozen(unmodifiableMap));
            assert.throws(
                () => (unmodifiableMap as Map<string, number>).clear(),
                'unmodifiableMap.clear is not a function'
            );
        });

        it('changes are reflected in the readonly map', () => {
            const originalMap = new Map<string, number>();

            originalMap.set('key-1', 1);
            originalMap.set('key-2', 2);

            const unmodifiableMap = readonlyMap(originalMap);

            originalMap.delete('key-2');
            originalMap.set('key-3', 3);
            originalMap.set('key-4', 4);

            assert.equal(unmodifiableMap.size, 3);
            assert.isUndefined(unmodifiableMap.get('key-2'));

            unmodifiableMap.forEach((value, key, map) => {
                assert.isTrue(Object.is(unmodifiableMap, map));
                assert.equal(originalMap.get(key), value);
            });

            originalMap.forEach((value, key, map) => {
                assert.isTrue(Object.is(originalMap, map));
                assert.equal(unmodifiableMap.get(key), value);
            });
        });
    });
});
