import { CURRENT_TIME } from '@gi-types/gdk4';
import { Pixbuf } from '@gi-types/gdkpixbuf2';
import { ActionGroup, File, Settings, SimpleAction, SimpleActionGroup } from '@gi-types/gio2';
import { Object as GObject, MetaInfo } from '@gi-types/gobject2';
import {
    AboutDialog,
    Builder,
    Button,
    ButtonsType,
    HeaderBar,
    Image,
    License,
    MessageDialog,
    MessageType,
    ResponseType,
    ScrolledWindow,
    Stack,
    StackPage,
    StackTransitionType,
    Viewport,
    Widget,
    Window,
    show_uri,
} from '@gi-types/gtk4';
import { Extension, getCurrentExtension, getSettings } from '@gnome-shell/misc/extensionUtils';

import { Logger } from '@github-manager/utils';
import { registerGObject } from '@github-manager/utils/gnome';
import { _ } from '@github-manager/utils/locale';

import { PrefsPage } from './PrefsPage';

@registerGObject
export class PrefsStack extends Stack {
    private static readonly LOGGER: Logger = new Logger('ui::prefs::PrefsStack');

    private readonly extension: Extension;

    public static metaInfo: MetaInfo = {
        GTypeName: 'PrefsStack',
        Template: File.new_for_path(`${getCurrentExtension().path}/ui/PrefsStack.ui`).get_uri(),
        InternalChildren: ['header', 'generateButton'],
    };

    private _header?: HeaderBar;

    private _generateButton?: Button;

    public constructor() {
        super({ transitionType: StackTransitionType.SLIDE_LEFT_RIGHT });

        this.extension = getCurrentExtension();
    }

    public vfunc_add_child(builder: Builder, child: GObject, type?: string | null | undefined): void {
        if (child instanceof PrefsPage) {
            const window = new ScrolledWindow({
                canFocus: true,
                child: new Viewport({
                    scrollToFocus: true,
                    child: child,
                }),
            });

            super.add_titled(window, child.label, child.label);
        } else if (child instanceof StackPage) {
            if (child.title) {
                super.add_titled(child.child, child.name, child.title);
            } else {
                super.add_named(child.child, child.name);
            }
        } else if (child instanceof Widget) {
            super.add_child(child);
        } else {
            super.vfunc_add_child(builder, child, type);
        }
    }

    public vfunc_realize(): void {
        super.vfunc_realize();

        const dialog = this.get_root();
        if (dialog instanceof Window) {
            dialog.set_titlebar(this._header);
            dialog.insert_action_group('actions', this.buildActionGroupFor(dialog));
        }

        const tokenGenerationUrl = 'https://github.com/settings/tokens/new?description=GNOME%20GitHub%20Manager';
        this._generateButton?.connect('clicked', () => this.openUrl(tokenGenerationUrl));
    }

    private openUrl(url: string): void {
        show_uri(null, url, CURRENT_TIME);
    }

    private resetToDefault(dialog: Window): void {
        const confirmation: MessageDialog = new MessageDialog({
            transientFor: dialog,
            buttons: ButtonsType.YES_NO,
            messageType: MessageType.QUESTION,
            modal: true,
            destroy_with_parent: true,
            text: _('Are you sure you want to reset all settings?'),
            secondaryText: _('All the customizations made will be lost. This operation cannot be undone.'),
        });

        confirmation.get_widget_for_response(ResponseType.YES)?.add_css_class('destructive-action');
        confirmation.set_default_response(ResponseType.NO);

        confirmation.connect('response', (_source, response) => {
            if (response == ResponseType.YES) {
                const settings: Settings = getSettings();
                settings.list_keys().forEach((key) => {
                    const defaultValue = settings.get_default_value(key);

                    if (defaultValue) {
                        settings.set_value(key, defaultValue);
                    }
                });
            }

            _source.destroy();
        });

        confirmation.present();
    }

    private about(dialog: Window): void {
        try {
            const githubIcon = Pixbuf.new_from_file_at_scale(`${this.extension.path}/github.svg`, -1, 128, true);
            const paintableLogo = Image.new_from_pixbuf(githubIcon).get_paintable();

            const aboutDialog = new AboutDialog({
                transientFor: dialog,
                modal: true,
                authors: ['Thomas Florio <mackdk@hotmail.com>', 'Alexandre Dufournet <alexandre.dufournet@gmail.com>'],
                programName: this.extension.metadata.name,
                version: _('Version {0}', this.extension.metadata.version.toFixed(1)),
                comments: _(
                    'Integrate GitHub within the GNOME Desktop Environment.\n\n' +
                        'Based on GitHub Notifications by Alexandre Dufournet.'
                ),
                licenseType: License.GPL_2_0,
                website: this.extension.metadata.url,
                website_label: _('Source code on GitHub'),
            });

            if (paintableLogo) {
                aboutDialog.logo = paintableLogo;
            }

            aboutDialog.set_system_information(null);

            const titleBar = aboutDialog.get_titlebar();
            if (titleBar instanceof HeaderBar) {
                titleBar.get_title_widget()?.set_visible(true);
            }

            aboutDialog.present();
        } catch (err) {
            PrefsStack.LOGGER.error('Unable to open about dialog', err);
        }
    }

    private buildActionGroupFor(dialog: Window): ActionGroup {
        const actionGroup = new SimpleActionGroup();
        const baseUrl = this.extension.metadata.url;

        this.addActionToGroup(actionGroup, 'resetToDefault', () => this.resetToDefault(dialog));
        this.addActionToGroup(actionGroup, 'reportBug', () => this.openUrl(`${baseUrl}/issues/new`));
        this.addActionToGroup(actionGroup, 'userGuide', () => this.openUrl(`${baseUrl}/wiki`));
        this.addActionToGroup(actionGroup, 'about', () => this.about(dialog));

        return actionGroup;
    }

    private addActionToGroup(actionGroup: SimpleActionGroup, name: string, callback: () => void): void {
        const action = new SimpleAction({ name: name });
        action.connect('activate', callback);
        actionGroup.add_action(action);
    }
}
