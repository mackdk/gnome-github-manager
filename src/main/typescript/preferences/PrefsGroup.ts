import { File } from '@gi-types/gio2';
import { Object as GObject, MetaInfo, ParamFlags, ParamSpec } from '@gi-types/gobject2';
import { Box, Builder, ListBox, Widget } from '@gi-types/gtk4';
import { getCurrentExtension } from '@gnome-shell/misc/extensionUtils';

import { registerGObject } from '@github-manager/utils/gnome';

import { PrefsRow } from './PrefsRow';

export interface PrefsGroupConstructorProperties extends Box.ConstructorProperties {
    label: string;
}

@registerGObject
export class PrefsGroup extends Box {
    public static readonly metaInfo: MetaInfo = {
        GTypeName: 'PrefsGroup',
        Template: File.new_for_path(`${getCurrentExtension().path}/ui/PrefsGroup.ui`).get_uri(),
        Properties: {
            label: ParamSpec.string(
                'label',
                'Label',
                'Label display for the input widget of this pref',
                ParamFlags.READWRITE,
                ''
            ),
        },
        InternalChildren: ['rows'],
    };

    private _label: string;
    private _rows?: ListBox;
    private prefsRows: PrefsRow[];

    public constructor(params?: Partial<PrefsGroupConstructorProperties>) {
        super(params);

        this.prefsRows = [];
        this._label = params?.label ?? '';
    }

    public vfunc_add_child(builder: Builder, child: GObject, type?: string | null | undefined): void {
        if (child instanceof PrefsRow) {
            this.appendRow(child);
        } else if (child instanceof Widget) {
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
        if (this._label == value) {
            return;
        }

        this._label = value;
        this.notify('label');
    }
}
