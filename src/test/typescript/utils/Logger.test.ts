import Gio from '@girs/gio-2.0';
import GLib from '@girs/glib-2.0';
import { assert } from 'chai';
import { SinonSpy, SinonStub, spy, stub } from 'sinon';

import { LogLevel, Logger } from '@github-manager/utils/Logger';

import '@test-suite/globals';

describe('Logger', () => {
    let logSpy: SinonSpy<[message: string], void>;
    let logErrorSpy: SinonSpy<[e: unknown, message: string], void>;

    const getUserDataDirStub: SinonStub<[], string> = stub(GLib, 'get_user_data_dir');
    const newForPathStub: SinonStub<[path: string], Gio.File> = stub(Gio.File, 'new_for_path');

    before(() => {
        logSpy = spy(globalThis, 'log');
        logErrorSpy = spy(globalThis, 'logError');
    });

    beforeEach(() => {
        Logger.resetConfiguration();

        logSpy.resetHistory();
        logErrorSpy.resetHistory();

        newForPathStub.reset();
        getUserDataDirStub.reset();
    });

    after(() => {
        logSpy.restore();
        logErrorSpy.restore();

        newForPathStub.restore();
        getUserDataDirStub.restore();
    });

    it('has info as default without configuration', () => {
        assert.equal(Logger.rootLevel, LogLevel.INFO);
        assert.equal(Logger.scopeLevelsConfiguration.size, 0);

        const logger = new Logger('testSuite::utils::Logger.test');

        assert.isFalse(logger.isTraceEnabled());
        assert.isFalse(logger.isDebugEnabled());
        assert.isTrue(logger.isInfoEnabled());
        assert.isTrue(logger.isWarnEnabled());
        assert.isTrue(logger.isErrorEnabled());

        logger.info('This should be printed');
        assert.isTrue(logSpy.calledOnce);

        logger.debug('This should not be printed');
        assert.isTrue(logSpy.calledOnce);

        logger.error('This should be printed');
        assert.isTrue(logSpy.calledTwice);
    });

    it('allows to specify a level for a single Logger', () => {
        const loggerDefault = new Logger('testSuite::utils::Logger.test.default');
        const loggerCustom = new Logger('testSuite::utils::Logger.test.custom', LogLevel.TRACE);

        loggerDefault.debug('Default ignores debug');
        assert.isTrue(logSpy.notCalled);
        loggerCustom.debug('Default prints debug');
        assert.isTrue(logSpy.calledOnce);
    });

    it('uses the correct level for the logger scope', () => {
        let logger = new Logger('testSuite::utils::Logger.test');

        logger.trace('should use INFO as level as nothing was configured');
        assert.isTrue(logSpy.notCalled);

        Logger.setLevelForScope('testSuite', LogLevel.TRACE);
        logger = new Logger('testSuite::utils::Logger.test');

        logger.trace('should now use TRACE as level due to scope setting');
        assert.isTrue(logSpy.calledOnce);

        Logger.setLevelForScope('testSuite::utils', LogLevel.ERROR);
        const loggerUtils = new Logger('testSuite::utils::Logger.test');
        logger = new Logger('testSuite::Another.test');

        logger.trace('should use TRACE due to scope');
        assert.isTrue(logSpy.calledTwice);
        loggerUtils.trace('should use ERROR due to stricter scope');
        assert.isTrue(logSpy.calledTwice);

        logger = new Logger('scope::not::configured:MyClass');
        logger.trace('should use INFO due to root level');
        assert.isTrue(logSpy.calledTwice);
        logger.warn('should use INFOdue to root level');
        assert.isTrue(logSpy.calledThrice);
    });

    it('can process error arguments', () => {
        const logger = new Logger('Logger.test');
        const error = new Error('This is a test error');

        // Single error argument
        logger.warn('Log entry with an error', error);
        assert.isTrue(logSpy.notCalled);
        assert.isTrue(logErrorSpy.calledOnce);
        assert.isTrue(
            logErrorSpy.calledWithExactly(error, '[TestSuite Extension] Logger.test WARN Log entry with an error')
        );

        // Error argument with other format arguments
        logger.error('Unable to get item #{0} due to {1}', 65, 'E_DUPLICATE_KEY', error);
        assert.isTrue(logSpy.notCalled);
        assert.isTrue(logErrorSpy.calledTwice);
        assert.isTrue(
            logErrorSpy.calledWithExactly(
                error,
                '[TestSuite Extension] Logger.test ERROR Unable to get item #65 due to E_DUPLICATE_KEY'
            )
        );

        // Error argument as string
        logger.error('Unable to get item #{0} due to {1}', 65, 'E_DUPLICATE_KEY', 'Error text');
        assert.isTrue(logSpy.calledOnce);
        assert.isTrue(logErrorSpy.calledTwice);
        assert.isTrue(
            logSpy.calledWithExactly(
                '[TestSuite Extension] Logger.test ERROR Unable to get item #65 due to E_DUPLICATE_KEY - Error text'
            )
        );

        // Error argument as object
        const errorObject = { toString: () => 'Error in object' };
        logger.error('Unable to get item #{0} due to {1}', 65, 'E_DUPLICATE_KEY', errorObject);
        assert.isTrue(logSpy.calledTwice);
        assert.isTrue(logErrorSpy.calledTwice);
        assert.isTrue(
            logSpy.calledWithExactly(
                '[TestSuite Extension] Logger.test ERROR Unable to get item #65 due to E_DUPLICATE_KEY - Additional object of type object: Error in object'
            )
        );
    });

    it('uses default configuration when initializing with no configuration file', () => {
        const configurationFileStub = stub(new Gio.File());

        getUserDataDirStub.returns('.');
        newForPathStub.returns(configurationFileStub);
        configurationFileStub.query_exists.returns(false);

        Logger.initialize();

        assert.equal(Logger.rootLevel, LogLevel.INFO);
        assert.equal(Logger.scopeLevelsConfiguration.size, 0);
    });

    it('can load configuration file', () => {
        const configurationFileStub = stub(new Gio.File());
        const configurationFile = `
root = WARN

#Comments::utils = should be ignored
test::utils = ERROR
test::utils::ProcessingUtility = INFO
test::core = DEBUG
`;

        getUserDataDirStub.returns('.');
        newForPathStub.returns(configurationFileStub);
        configurationFileStub.query_exists.returns(true);
        configurationFileStub.load_contents.returns([true, new TextEncoder().encode(configurationFile), null]);

        Logger.initialize();

        assert.equal(Logger.rootLevel, LogLevel.WARN);
        assert.equal(Logger.scopeLevelsConfiguration.size, 3);
        assert.equal(Logger.scopeLevelsConfiguration.get('test::utils'), LogLevel.ERROR);
        assert.equal(Logger.scopeLevelsConfiguration.get('test::utils::ProcessingUtility'), LogLevel.INFO);
        assert.equal(Logger.scopeLevelsConfiguration.get('test::core'), LogLevel.DEBUG);
    });

    it('ignores errors while parsing the configuration file', () => {
        const configurationFileStub = stub(new Gio.File());

        getUserDataDirStub.returns('.');
        newForPathStub.returns(configurationFileStub);
        configurationFileStub.query_exists.returns(true);

        // First case, load_content return false
        configurationFileStub.load_contents.returns([false, new Uint8Array(), null]);

        Logger.initialize();

        assert.equal(Logger.rootLevel, LogLevel.INFO);
        assert.equal(Logger.scopeLevelsConfiguration.size, 0);

        // Second case, processing throws error
        configurationFileStub.load_contents.throws('Unexpected error');

        Logger.initialize();

        assert.equal(Logger.rootLevel, LogLevel.INFO);
        assert.equal(Logger.scopeLevelsConfiguration.size, 0);
    });
});
