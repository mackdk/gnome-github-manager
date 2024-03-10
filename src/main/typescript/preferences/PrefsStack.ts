import Gio from '@girs/gio-2.0';
import GObject from '@girs/gobject-2.0';
import Gtk from '@girs/gtk-4.0';
import { getCurrentExtension } from '@gnome-shell/misc/extensionUtils';

import { Logger, lazy } from '@github-manager/utils';
import { GObjectMetaInfo, registerGObject } from '@github-manager/utils/gnome';

import * as PreferencesController from './PreferencesController';
import { PrefsPage } from './PrefsPage';

@registerGObject
export class PrefsStack extends Gtk.Stack {
    @lazy
    private static readonly LOGGER: Logger = new Logger('ui::prefs::PrefsStack');

    public static readonly metaInfo: GObjectMetaInfo = {
        GTypeName: 'PrefsStack',
        Template: Gio.File.new_for_path(`${getCurrentExtension().path}/ui/PrefsStack.ui`).get_uri() ?? undefined,
        InternalChildren: ['header', 'primaryMenu'],
        Implements: [Gtk.Buildable],
    };

    private _header?: Gtk.HeaderBar;

    private _primaryMenu?: Gtk.MenuButton;

    public constructor() {
        super({ hexpand: true, vexpand: true, transitionType: Gtk.StackTransitionType.SLIDE_LEFT_RIGHT });
    }

    public vfunc_add_child(builder: Gtk.Builder, child: GObject.Object, type: string | null): void {
        if (child instanceof PrefsPage) {
            const window = new Gtk.ScrolledWindow({
                canFocus: true,
                child: new Gtk.Viewport({
                    scrollToFocus: true,
                    child: child,
                }),
            });

            super.add_titled(window, child.label, child.label);
        } else if (child instanceof Gtk.StackPage) {
            if (child.title !== null && child.title.length > 0) {
                super.add_titled(child.child, child.name, child.title);
            } else {
                super.add_named(child.child, child.name);
            }
        } else if (child instanceof Gtk.Widget) {
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
        if (dialog instanceof Gtk.Window) {
            dialog.set_titlebar(this._header);
            dialog.insert_action_group('actions', PreferencesController.buildActionGroupFor(dialog));
        } else {
            PrefsStack.LOGGER.error('Unable to initialize UI: PrefsStack root is not an instance of Window');
        }

        PreferencesController.addMenuButton(this._header, this._primaryMenu);
    }
}
