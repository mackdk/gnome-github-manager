import Gio from '@girs/gio-2.0';
import GObject from '@girs/gobject-2.0';
import Gtk from '@girs/gtk-4.0';
import { getCurrentExtension } from '@gnome-shell/misc/extensionUtils';

import { GObjectMetaInfo, registerGObject } from '@github-manager/utils/gnome';

import { PrefsRow } from './PrefsRow';

export interface PrefsGroupConstructorProperties extends Gtk.Box.ConstructorProps {
    label: string;
}

@registerGObject
export class PrefsGroup extends Gtk.Box {
    public static readonly metaInfo: GObjectMetaInfo = {
        GTypeName: 'PrefsGroup',
        Template: Gio.File.new_for_path(`${getCurrentExtension().path}/ui/PrefsGroup.ui`).get_uri() ?? undefined,
        Properties: {
            label: GObject.ParamSpec.string(
                'label',
                'Label',
                'Label display for the input widget of this pref',
                GObject.ParamFlags.READWRITE,
                ''
            ),
        },
        InternalChildren: ['rows'],
        Implements: [Gtk.Buildable],
    };

    private _label: string;
    private _rows?: Gtk.ListBox;
    private prefsRows: PrefsRow[];

    public constructor(params?: Partial<PrefsGroupConstructorProperties>) {
        super(params);

        this.prefsRows = [];
        this._label = params?.label ?? '';
    }

    public vfunc_add_child(builder: Gtk.Builder, child: GObject.Object, type: string | null): void {
        if (child instanceof PrefsRow) {
            this.appendRow(child);
        } else if (child instanceof Gtk.Widget) {
            super.append(child);
        } else {
            super.vfunc_add_child(builder, child, type);
        }
    }

    public appendRow(row: PrefsRow): boolean {
        if (this._rows === undefined) {
            return false;
        }

        this.prefsRows.push(row);
        this._rows.append(row);
        return true;
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
