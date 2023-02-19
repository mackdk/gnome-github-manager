import { CURRENT_TIME } from '@gi-types/gdk4';
import { Pixbuf } from '@gi-types/gdkpixbuf2';
import { Action, ActionGroup, File, SimpleAction, SimpleActionGroup } from '@gi-types/gio2';
import { MetaInfo, Object as GObject } from '@gi-types/gobject2';
import { Window, Stack, HeaderBar, StackTransitionType, Builder, StackPage, ScrolledWindow, Viewport, Widget, AboutDialog, Image, License, MessageDialog, ButtonsType, ResponseType, MessageType, show_uri, Button } from '@gi-types/gtk4';
import { Configuration } from '@github-manager/core/Configuration';
import { Logger, registerGObject } from '@github-manager/utils';
import { Extension, getCurrentExtension } from '@gnome-shell/misc/extensionUtils';
import { PrefsPage } from './PrefsPage';

@registerGObject
export class PrefsStack extends Stack {

    private static readonly LOGGER: Logger = new Logger('ui::prefs::PrefsStack');

    private readonly extension : Extension;

    public static metaInfo: MetaInfo = {
        GTypeName: 'PrefsStack',
        Template: File.new_for_path(`${getCurrentExtension().path}/ui/PrefsStack.ui`).get_uri(),
        InternalChildren: [
            'header',
            'generateButton',
        ]
    };

    private _header?: HeaderBar;

    private _generateButton?: Button;

    public constructor() {
        super({transitionType: StackTransitionType.SLIDE_LEFT_RIGHT});

        this.extension = getCurrentExtension();
    }

    public vfunc_add_child(builder: Builder, child: GObject, type?: string | null | undefined): void {
        if (child instanceof PrefsPage) {
            const window = new ScrolledWindow({
                canFocus: true,
                child: new Viewport({
                    scrollToFocus: true,
                    child: child
                })
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

        this._generateButton?.connect('clicked', () => show_uri(null, 'https://github.com/settings/tokens/new?description=GNOME%20GitHub%20Manager', CURRENT_TIME));
    }

    private resetToDefault(dialog: Window) {
        const confirmation: MessageDialog = new MessageDialog({
            transientFor: dialog,
            buttons: ButtonsType.YES_NO,
            messageType: MessageType.QUESTION,
            modal: true,
            destroy_with_parent: true,
            text: 'Are you sure you want to reset all settings?',
            secondaryText: 'All the customizations made will be lost. This operation cannot be undone.',
        });

        confirmation.get_widget_for_response(ResponseType.YES)?.add_css_class('destructive-action');
        confirmation.set_default_response(ResponseType.NO);

        confirmation.connect('response', (_source, response) => {
            if (response == ResponseType.YES) {
                Configuration.getInstance().reset();
            }

            _source.destroy();
        });

        confirmation.present();
    }

    private about(dialog: Window) {
        try {
            const logo: Image = Image.new_from_pixbuf(Pixbuf.new_from_file_at_scale(`${this.extension.path}/github.svg`, -1, 128, true));

            const aboutDialog = new AboutDialog({
                transientFor: dialog,
                modal: true,
                logo: logo.get_paintable()!,
                authors: [
                    'Thomas Florio <mackdk@hotmail.com>',
                    'Alexandre Dufournet <alexandre.dufournet@gmail.com>'
                ],
                programName: this.extension.metadata.name,
                version: `Version ${this.extension.metadata.version.toFixed(1).toString()}`,
                comments: this.extension.metadata.comment,
                licenseType: License.GPL_2_0,
                website: this.extension.metadata.url,
                website_label: 'Source code on GitHub',
            });

            aboutDialog.set_system_information(null);

            const titleBar = aboutDialog.get_titlebar();
            if (titleBar instanceof HeaderBar) {
                titleBar.get_title_widget()?.set_visible(true);
            }

            aboutDialog.present();
        } catch(err) {
            PrefsStack.LOGGER.error('Unable to open about', err);
        }
    }

    private buildActionGroupFor(dialog: Window): ActionGroup {
        const actionGroup = new SimpleActionGroup();

        actionGroup.add_action(this.createAction('resetToDefault', () => this.resetToDefault(dialog)));
        actionGroup.add_action(this.createAction('reportBug', () => show_uri(null, `${this.extension.metadata.url}/issues/new`, CURRENT_TIME)));
        actionGroup.add_action(this.createAction('userGuide', () => show_uri(null, `${this.extension.metadata.url}/wiki`, CURRENT_TIME)));
        actionGroup.add_action(this.createAction('about', () => this.about(dialog)));

        return actionGroup;
    }

    private createAction(name: string, callback: () => void): Action {
        const action = new SimpleAction({ name: name});
        action.connect('activate', callback);
        return action;
    }
}
