import { ActorAlign } from '@gi-types/clutter10';
import { Icon as GioIcon } from '@gi-types/gio2';
import { MetaInfo, ParamFlags, ParamSpec } from '@gi-types/gobject2';
import { BoxLayout, Icon, Label } from '@gi-types/st1';

import { registerGObject } from '@github-manager/utils/gnome';

@registerGObject
export class GitHubWidget extends BoxLayout {
    public static readonly metaInfo: MetaInfo = {
        GTypeName: 'GitHubWidget',
        Properties: {
            text: ParamSpec.string('text', 'Text', 'The text of the widget', ParamFlags.READWRITE, ''),
            textVisible: ParamSpec.boolean(
                'text-visible',
                'Text Visible',
                'The visibility of the text next to the widget',
                ParamFlags.READWRITE,
                true
            ),
        },
    };

    public get text(): string {
        return this.label.text;
    }

    public set text(value: string) {
        if (this.label.text == value) {
            return;
        }

        this.label.text = value;
        this.notify('text');
    }

    public get textVisible(): boolean {
        return this.label.visible;
    }

    public set textVisible(value: boolean) {
        if (this.label.visible == value) {
            return;
        }

        this.label.visible = value;
        this.notify('text-visible');
    }

    private readonly icon: Icon;

    private readonly label: Label;

    public constructor(defaultIcon: GioIcon, initialText: string = '') {
        super({
            styleClass: 'panel-button github-widget',
            reactive: true,
            canFocus: true,
            trackHover: true,
            visible: true,
        });

        this.icon = new Icon({
            styleClass: 'system-status-icon widget-icon',
            gicon: defaultIcon,
        });

        this.label = new Label({
            text: initialText,
            styleClass: 'system-status-icon widget-label',
            yAlign: ActorAlign.CENTER,
            yExpand: true,
        });

        this.add_child(this.icon);
        this.add_child(this.label);
    }
}
