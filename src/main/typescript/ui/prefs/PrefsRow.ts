import { File } from '@gi-types/gio2';
import { MetaInfo, ParamFlags, ParamSpec } from '@gi-types/gobject2';
import { Align, Box, DropDown, Entry, PasswordEntry, SpinButton, StringList, Switch, Widget } from '@gi-types/gtk4';
import { Configuration } from '@github-manager/core/Configuration';
import { registerGObject } from '@github-manager/utils';
import { getCurrentExtension } from '@gnome-shell/misc/extensionUtils';

export namespace PrefsRow {
    export interface ConstructorProperties extends Box.ConstructorProperties {
        label: string;
        description: string;
        widgetType: string;
        widgetParameters: string;
        configurationProperty: string;
        prefix: Widget;
        suffix: Widget;
    }
}

@registerGObject
export class PrefsRow extends Box {

    public static readonly metaInfo: MetaInfo = {
        GTypeName: 'PrefsRow',
        Template: File.new_for_path(`${getCurrentExtension().path}/ui/PrefsRow.ui`).get_uri(),
        Properties: {
            'label': ParamSpec.string('label', 'Label', 'Label display for the input widget of this pref', ParamFlags.READWRITE, ''),
            'description': ParamSpec.string('description', 'Description', 'Text to provide additional information on this pref', ParamFlags.READWRITE, ''),
            'widgetType': ParamSpec.string('widget-type', 'Type of widget', 'The widget to use to edit this pref', ParamFlags.READWRITE, 'GktEntry'),
            'widgetParameters': ParamSpec.string('widget-parameters', 'Widget build parameters', 'Additional parameter to build the widget to edit this pref', ParamFlags.READWRITE, ''),
            'configurationProperty': ParamSpec.string('configuration-property', 'The configuration property', 'The configuration property controlled by this pref', ParamFlags.READWRITE, ''),
            'prefix': ParamSpec.object('prefix', 'Prefix widget', 'Widget at the beginning of the prefs row', ParamFlags.READWRITE, Widget.$gtype),
            'suffix': ParamSpec.object('suffix', 'Suffix widget', 'Widget at the end of the prefs row', ParamFlags.READWRITE, Widget.$gtype),
        }
    };

    private _label: string;
    private _description: string;
    private _widgetType: string;
    private _widgetParameters: string;
    private _configurationProperty: string;
    private _prefix?: Widget;
    private _suffix?: Widget;

    public constructor(params?: Partial<PrefsRow.ConstructorProperties>, ...args: any[]) {
        super(params, ...args);

        this._label = params?.label || '';
        this._description = params?.description || '';
        this._widgetType = params?.widgetType || 'GktEntry';
        this._widgetParameters = params?.widgetParameters || '';
        this._configurationProperty = params?.configurationProperty || '';
        this._prefix = params?.prefix;
        this._suffix = params?.suffix;
    }

    public vfunc_realize() {
        super.vfunc_realize();

        let widget: Widget, bindProperty: string;
        if (this._widgetType == 'GtkPasswordEntry') {
            const params: Partial<PasswordEntry.ConstructorProperties> = this._widgetParameters != '' ? JSON.parse(this._widgetParameters) : {};
            widget = new PasswordEntry({ showPeekIcon: true, valign: Align.CENTER, vexpand: false, hexpand: true, ...params });
            bindProperty = 'text';
        } else if (this._widgetType == 'GtkSwitch') {
            const params: Partial<Switch.ConstructorProperties> = this._widgetParameters != '' ? JSON.parse(this._widgetParameters) : {};
            widget = new Switch({ halign: Align.CENTER, hexpand: false, valign: Align.CENTER, vexpand: false, ...params });
            bindProperty = 'state';
        } else if (this._widgetType == 'GtkSpinButton') {
            const params: Partial<{min: number; max: number; step: number;}> = this._widgetParameters != '' ? JSON.parse(this._widgetParameters) : {};
            widget = SpinButton.new_with_range(params?.min || 0, params?.max || 100, params?.step || 1);
            bindProperty = 'value';
        } else if (this._widgetType == 'GtkDropDown') {
            const params: string[] = this._widgetParameters != '' ? JSON.parse(this._widgetParameters) : [];
            widget = new DropDown({ model: StringList.new(params), valign: Align.CENTER, vexpand: false, hexpand: true });
            bindProperty = 'selected';
        } else {
            const params: Partial<Entry.ConstructorProperties> = this._widgetParameters != '' ? JSON.parse(this._widgetParameters) : {};
            widget = new Entry({ valign: Align.CENTER, vexpand: false, hexpand: true, ...params });
            bindProperty = 'text';
        }

        if (this._configurationProperty != '') {
            Configuration.getInstance().bind(this._configurationProperty, widget, bindProperty);
        }

        if (this._prefix) {
            this.append(this._prefix);
        }

        this.append(widget);

        if (this._suffix) {
            this.append(this._suffix);
        }
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

    public get description() {
        return this._description;
    }

    public set description(value: string) {
        if (this._description == value) {
            return;
        }

        this._description = value;
        this.notify('description');
    }

    public get widgetType() {
        return this._widgetType;
    }

    public set widgetType(value: string) {
        if (this._widgetType == value) {
            return;
        }

        this._widgetType = value;
        this.notify('widget-type');
    }

    public get widgetParameters() {
        return this._widgetParameters;
    }

    public set widgetParameters(value: string) {
        if (this._widgetParameters == value) {
            return;
        }

        this._widgetParameters = value;
        this.notify('widget-parameters');
    }

    public get configurationProperty() {
        return this._configurationProperty;
    }

    public set configurationProperty(value: string) {
        if (this._configurationProperty == value) {
            return;
        }

        this._configurationProperty = value;
        this.notify('configuration-property');
    }

    public get prefix(): Widget | undefined {
        return this._prefix;
    }

    public set prefix(value: Widget | undefined) {
        if (this._prefix == value) {
            return;
        }

        this._prefix = value;
        this.notify('prefix');
    }

    public get suffix(): Widget | undefined {
        return this._suffix;
    }

    public set suffix(value: Widget | undefined) {
        if (this._suffix == value) {
            return;
        }

        this._suffix = value;
        this.notify('suffix');
    }

}
