import Clutter from '@girs/clutter-10';
import Gio from '@girs/gio-2.0';
import GObject from '@girs/gobject-2.0';
import St from '@girs/st-1.0';

import { GObjectMetaInfo, registerGObject } from '@github-manager/utils/gnome';

@registerGObject
export class GitHubWidget extends St.BoxLayout {
    public static readonly metaInfo: GObjectMetaInfo = {
        GTypeName: 'GitHubWidget',
        Properties: {
            text: GObject.ParamSpec.string('text', 'Text', 'The text of the widget', GObject.ParamFlags.READWRITE, ''),
            textVisible: GObject.ParamSpec.boolean(
                'text-visible',
                'Text Visible',
                'The visibility of the text next to the widget',
                GObject.ParamFlags.READWRITE,
                true
            ),
        },
    };

    public get text(): string {
        return this.label.text ?? '';
    }

    public set text(value: string) {
        if (this.label.text === value) {
            return;
        }

        this.label.text = value;
        this.notify('text');
    }

    public get textVisible(): boolean {
        return this.label.visible;
    }

    public set textVisible(value: boolean) {
        if (this.label.visible === value) {
            return;
        }

        this.label.visible = value;
        this.notify('text-visible');
    }

    private readonly icon: St.Icon;

    private readonly label: St.Label;

    public constructor(defaultIcon: Gio.Icon, initialText: string = '') {
        super({
            styleClass: 'panel-button github-widget',
            reactive: true,
            canFocus: true,
            trackHover: true,
            visible: true,
        });

        this.icon = new St.Icon({
            styleClass: 'system-status-icon widget-icon',
            gicon: defaultIcon,
        });

        this.label = new St.Label({
            text: initialText,
            styleClass: 'system-status-icon widget-label',
            yAlign: Clutter.ActorAlign.CENTER,
            yExpand: true,
        });

        this.add_child(this.icon);
        this.add_child(this.label);
    }
}
