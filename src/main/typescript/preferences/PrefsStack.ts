import { File } from '@gi-types/gio2';
import { Object as GObject, MetaInfo } from '@gi-types/gobject2';
import {
    Buildable,
    Builder,
    HeaderBar,
    MenuButton,
    ScrolledWindow,
    Stack,
    StackPage,
    StackTransitionType,
    Viewport,
    Widget,
    Window,
} from '@gi-types/gtk4';
import { getCurrentExtension } from '@gnome-shell/misc/extensionUtils';

import { Logger } from '@github-manager/utils';
import { registerGObject } from '@github-manager/utils/gnome';

import * as PreferencesController from './PreferencesController';
import { PrefsPage } from './PrefsPage';

@registerGObject
export class PrefsStack extends Stack {
    private static readonly LOGGER: Logger = new Logger('ui::prefs::PrefsStack');

    public static metaInfo: MetaInfo = {
        GTypeName: 'PrefsStack',
        Template: File.new_for_path(`${getCurrentExtension().path}/ui/PrefsStack.ui`).get_uri(),
        InternalChildren: ['header', 'primaryMenu'],
        Implements: [Buildable],
    };

    private _header?: HeaderBar;

    private _primaryMenu?: MenuButton;

    public constructor() {
        super({ hexpand: true, vexpand: true, transitionType: StackTransitionType.SLIDE_LEFT_RIGHT });
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
            if (child.title.length > 0) {
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

        if (this._header === undefined || this._primaryMenu === undefined) {
            PrefsStack.LOGGER.error('Unable to initialize UI: header and/or primary menu are undefined');
            return;
        }

        const dialog = this.get_root();
        if (dialog instanceof Window) {
            dialog.set_titlebar(this._header);
            dialog.insert_action_group('actions', PreferencesController.buildActionGroupFor(dialog));
        } else {
            PrefsStack.LOGGER.error('Unable to initialize UI: PrefsStack root is not an instance of Window');
        }

        PreferencesController.addMenuButton(this._header, this._primaryMenu);
    }
}
