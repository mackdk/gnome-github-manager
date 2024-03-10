import Gio from '@girs/gio-2.0';
import GObject from '@girs/gobject-2.0';
import Gtk from '@girs/gtk-4.0';
import { getCurrentExtension } from '@gnome-shell/misc/extensionUtils';

import { GObjectMetaInfo, registerGObject } from '@github-manager/utils/gnome';

export interface PrefsPageConstructorProperties extends Gtk.Box.ConstructorProps {
    label: string;
}

@registerGObject
export class PrefsPage extends Gtk.Box {
    public static readonly metaInfo: GObjectMetaInfo = {
        GTypeName: 'PrefsPage',
        Template: Gio.File.new_for_path(`${getCurrentExtension().path}/ui/PrefsPage.ui`).get_uri() ?? undefined,
        Properties: {
            label: GObject.ParamSpec.string(
                'label',
                'Label',
                'Label display for the input widget of this pref',
                GObject.ParamFlags.READWRITE,
                ''
            ),
        },
        Implements: [Gtk.Buildable],
    };

    private _label: string;

    public constructor(params?: Partial<PrefsPageConstructorProperties>) {
        super(params);

        this._label = params?.label ?? '';
    }

    public get label(): string {
        return this._label;
    }

    public set label(value: string) {
        if (this._label === value) {
            return;
        }

        this._label = value;
        this.notify('label');
    }
}
