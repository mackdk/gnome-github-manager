import * as Gettext from '@gettext';
import * as ExtensionUtils from '@gnome-shell/misc/extensionUtils';
import { assert } from 'chai';
import { SinonStub, stub } from 'sinon';

import { _, disposeTranslationDomain, initializeTranslations, ngettext } from '@github-manager/utils/locale';

describe('Locale utilities', () => {
    let initTranslationsStub: SinonStub<[domain: string], void>;
    let domainStub: SinonStub<[domain: string], Gettext.TranslationDomain>;

    before(() => {
        initTranslationsStub = stub(ExtensionUtils, 'initTranslations');
        domainStub = stub(Gettext, 'domain');
    });

    beforeEach(() => {
        disposeTranslationDomain();

        domainStub.reset();
        initTranslationsStub.reset();
    });

    after(() => {
        initTranslationsStub.restore();
        domainStub.restore();
    });

    it('can initialize the localization framework', () => {
        initializeTranslations('dummyDomain');

        // Verify it calls initTranslations from gnome-shell api
        assert.equal(initTranslationsStub.callCount, 1);
        assert.equal(initTranslationsStub.firstCall.firstArg, 'dummyDomain');

        // Verify it calls domain() from gettext api
        assert.equal(domainStub.callCount, 1);
        assert.equal(domainStub.firstCall.firstArg, 'dummyDomain');
    });

    it('throw error when invoking without initializing', () => {
        assert.throws(
            () => _('This should fail as initializeTranslations() was not called'),
            'Translation domain is not initialized. Call initializeTranslations() first.'
        );

        assert.throws(
            () => ngettext('singolar', 'plural', 5),
            'Translation domain is not initialized. Call initializeTranslations() first.'
        );
    });

    it('can localize string with arguments', () => {
        const domain = new Gettext.TranslationDomain();
        const gettextStub = stub(domain, 'gettext');

        gettextStub.withArgs('This message will be localized').returns('Questo messaggio sarà localizzato');
        gettextStub.withArgs('Task #{0} has failed. {1}: {2}').returns('Il task #{0} è fallito. {1}: {2}');

        domainStub.withArgs('testDomain').returns(domain);
        initializeTranslations('testDomain');

        // Without arguments
        assert.equal(_('This message will be localized'), 'Questo messaggio sarà localizzato');
        // With arguments
        assert.equal(
            _('Task #{0} has failed. {1}: {2}', 10, 'E_DUMMY_CODE', 4983),
            'Il task #10 è fallito. E_DUMMY_CODE: 4983'
        );
    });

    it('can localize plural forms with arguments', () => {
        const domain = new Gettext.TranslationDomain();
        const ngettextStub = stub(domain, 'ngettext');

        ngettextStub.withArgs('A new notification', 'New notifications', 1).returns('Nuova notifica');
        ngettextStub.withArgs('A new notification', 'New notifications', 5).returns('Nuove notifiche');

        ngettextStub.withArgs('I have a bike', 'I have {0} bikes', 1).returns('Ho una bicicletta');
        ngettextStub.withArgs('I have a bike', 'I have {0} bikes', 2).returns('Ho {0} biciclette');

        domainStub.withArgs('testDomain').returns(domain);
        initializeTranslations('testDomain');

        // Without arguments
        assert.equal(ngettext('A new notification', 'New notifications', 1), 'Nuova notifica');
        assert.equal(ngettext('A new notification', 'New notifications', 5), 'Nuove notifiche');
        // With arguments
        assert.equal(ngettext('I have a bike', 'I have {0} bikes', 1, 1), 'Ho una bicicletta');
        assert.equal(ngettext('I have a bike', 'I have {0} bikes', 2, 2), 'Ho 2 biciclette');
    });
});
