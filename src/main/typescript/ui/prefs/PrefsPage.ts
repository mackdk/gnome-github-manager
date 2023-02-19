import { File } from '@gi-types/gio2';
import { MetaInfo, ParamFlags, ParamSpec } from '@gi-types/gobject2';
import { Box } from '@gi-types/gtk4';
import { registerGObject } from '@github-manager/utils';
import { getCurrentExtension } from '@gnome-shell/misc/extensionUtils';

export namespace PrefsPage {
    export interface ConstructorProperties extends Box.ConstructorProperties {
        label: string;
    }
}

@registerGObject
export class PrefsPage extends Box {

    public static readonly metaInfo: MetaInfo = {
        GTypeName: 'PrefsPage',
        Template: File.new_for_path(`${getCurrentExtension().path}/ui/PrefsPage.ui`).get_uri(),
        Properties: {
            'label': ParamSpec.string('label', 'Label', 'Label display for the input widget of this pref', ParamFlags.READWRITE, ''),
        },
    };

    private _label: string;

    public constructor(params?: Partial<PrefsPage.ConstructorProperties>, ...args: any[]) {
        super(params, ...args);

        this._label = params?.label || '';
    }

    public get label() {
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
