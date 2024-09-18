import '@girs/gjs';
import '@girs/gjs/dom';

import Adw from '@girs/adw-1';
import { ExtensionPreferences } from '@girs/gnome-shell/dist/extensions/prefs';
import GObject from '@girs/gobject-2.0';
import Gtk from '@girs/gtk-4.0';

import { GObjectMetaInfo, registerGObject } from '@github-manager/utils/gnome';

import * as PreferencesController from './PreferencesController';

export interface SettingRowConstructorProperties extends Adw.ActionRow.ConstructorProperties {
    widgetType: string;
    widgetParameters: string;
    setting: string;
    prefix: Gtk.Widget;
    suffix: Gtk.Widget;
}

@registerGObject
export class SettingRow extends Adw.ActionRow {
    public static readonly metaInfo: GObjectMetaInfo = {
        GTypeName: 'SettingRow',
        Properties: {
            widgetType: GObject.ParamSpec.string(
                'widget-type',
                'Type of widget',
                'The widget to use to edit this setting',
                GObject.ParamFlags.READWRITE,
                'GktEntry'
            ),
            widgetParameters: GObject.ParamSpec.string(
                'widget-parameters',
                'Widget parameters',
                'Additional parameter to build the widget',
                GObject.ParamFlags.READWRITE,
                '{}'
            ),
            setting: GObject.ParamSpec.string(
                'setting-key',
                'The setting key',
                'The key of the setting controlled by this widget',
                GObject.ParamFlags.READWRITE,
                ''
            ),
            prefix: GObject.ParamSpec.object(
                'prefix',
                'Prefix widget',
                'Widget at the beginning of the setting row',
                GObject.ParamFlags.READWRITE,
                Gtk.Widget.$gtype
            ),
            suffix: GObject.ParamSpec.object(
                'suffix',
                'Suffix widget',
                'Widget at the end of the setting row',
                GObject.ParamFlags.READWRITE,
                Gtk.Widget.$gtype
            ),
        },
    };

    private _widgetType: string;
    private _widgetParameters: string;
    private _settingKey: string;
    private _prefix?: Gtk.Widget;
    private _suffix?: Gtk.Widget;

    public constructor(params?: Partial<SettingRowConstructorProperties>) {
        super(params);

        this._widgetType = params?.widgetType ?? 'GktEntry';
        this._widgetParameters = params?.widgetParameters ?? '{}';
        this._settingKey = params?.setting ?? '';
        this._prefix = params?.prefix;
        this._suffix = params?.suffix;
    }

    public vfunc_realize(): void {
        super.vfunc_realize();

        const widget = PreferencesController.createAndBindWidget(
            this._widgetType,
            this._widgetParameters,
            ExtensionPreferences.lookupByUUID('github-manager@mackdk-on-github')?.getSettings(),
            this._settingKey
        );

        if (this._prefix !== undefined) {
            this.add_suffix(this._prefix);
        }

        this.set_activatable_widget(widget);
        this.add_suffix(widget);

        if (this._suffix !== undefined) {
            this.add_suffix(this._suffix);
        }
    }

    public get widgetType(): string {
        return this._widgetType;
    }

    public set widgetType(value: string) {
        if (this._widgetType === value) {
            return;
        }

        this._widgetType = value;
        this.notify('widget-type');
    }

    public get widgetParameters(): string {
        return this._widgetParameters;
    }

    public set widgetParameters(value: string) {
        if (this._widgetParameters === value) {
            return;
        }

        this._widgetParameters = value;
        this.notify('widget-parameters');
    }

    public get settingKey(): string {
        return this._settingKey;
    }

    public set settingKey(value: string) {
        if (this._settingKey === value) {
            return;
        }

        this._settingKey = value;
        this.notify('setting-key');
    }

    public get prefix(): Gtk.Widget | undefined {
        return this._prefix;
    }

    public set prefix(value: Gtk.Widget | undefined) {
        if (this._prefix === value) {
            return;
        }

        this._prefix = value;
        this.notify('prefix');
    }

    public get suffix(): Gtk.Widget | undefined {
        return this._suffix;
    }

    public set suffix(value: Gtk.Widget | undefined) {
        if (this._suffix === value) {
            return;
        }

        this._suffix = value;
        this.notify('suffix');
    }
}
