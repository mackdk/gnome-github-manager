import { File } from '@gi-types/gio2';
import { MetaInfo, ParamFlags, ParamSpec } from '@gi-types/gobject2';
import { Box } from '@gi-types/gtk4';
import { getCurrentExtension } from '@gnome-shell/misc/extensionUtils';

import { registerGObject } from '@github-manager/utils/gnome';

export interface PrefsPageConstructorProperties extends Box.ConstructorProperties {
    label: string;
}

@registerGObject
export class PrefsPage extends Box {
    public static readonly metaInfo: MetaInfo = {
        GTypeName: 'PrefsPage',
        Template: File.new_for_path(`${getCurrentExtension().path}/ui/PrefsPage.ui`).get_uri(),
        Properties: {
            label: ParamSpec.string(
                'label',
                'Label',
                'Label display for the input widget of this pref',
                ParamFlags.READWRITE,
                ''
            ),
        },
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
        if (this._label == value) {
            return;
        }

        this._label = value;
        this.notify('label');
    }
}
