import Clutter from '@girs/clutter-15';
import Gio from '@girs/gio-2.0';
import { Button } from '@girs/gnome-shell/dist/ui/panelMenu';
import GObject from '@girs/gobject-2.0';
import St from '@girs/st-15';

import { GObjectMetaInfo, registerGObject } from '@github-manager/utils/gnome';

@registerGObject
export class GitHubWidget extends Button {
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
        return this.label.text;
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
        super(0.5, 'GithubManagerButton', true);

        this.styleClass = 'github-widget-button';

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

        const layout: St.BoxLayout = new St.BoxLayout({
            styleClass: 'panel-button github-widget',
            reactive: true,
            canFocus: true,
            trackHover: true,
            visible: true,
        });

        layout.add_child(this.icon);
        layout.add_child(this.label);

        this.add_child(layout);
    }
}
