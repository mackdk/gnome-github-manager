import { Box, Orientation, Label, Switch, Entry, SpinButton, Widget } from '@gi-types/gtk4';
import { SettingsBindFlags } from '@gi-types/gio2';

const ExtensionUtils = imports.misc.extensionUtils;

const GITHUB_SETTINGS_SCHEMA = 'org.gnome.shell.extensions.github.notifications';

const _settings = ExtensionUtils.getSettings(GITHUB_SETTINGS_SCHEMA);

const TOKEN_EXPLAINER = `To get your token, please visit <a href="https://github.com/settings/tokens/new?scopes=notifications&amp;description=Gnome%20desktop%20notifications">https://github.com/settings/tokens</a>
 - Click on "Generate Token"
 - In "Select scopes", choose only "notifications"
 - Copy and paste the token in the above field

Only Github Enterprise users need to change the "Github Hostname"
It should not include "http[s]://" or path params.

* This refresh interval will be ignored if smaller than Github's policy.
See <a href="https://developer.github.com/v3/activity/notifications/">https://developer.github.com/v3/activity/notifications</a>`;

function makeLabeledOptionBox(labelText: string) {
    const box = new Box({
        orientation: Orientation.HORIZONTAL,
        spacing: 10,
    });
    const label = new Label({
        label: labelText
    });

    box.append(label);
    return box;
}

function bindSettingToGtkWidget(boundSettingName: string, widget: Widget, property: string) {
    _settings.bind(boundSettingName, widget, property, SettingsBindFlags.DEFAULT);
}

function makeLabeledSwitchOptionBox(label: string, boundSettingName: string) {
    const box = makeLabeledOptionBox(label);

    const switch_ = new Switch();
    bindSettingToGtkWidget(boundSettingName, switch_, 'state');

    box.append(switch_);
    return box;
}

function makeLabeledEntryOptionBox(label: string, boundSettingName: string) {
    const box = makeLabeledOptionBox(label);

    const entry = new Entry();
    bindSettingToGtkWidget(boundSettingName, entry, 'text');

    box.append(entry);
    return box;
}

function makeLabeledSpinButtonOptionBox(label: string, boundSettingName: string, min: number, max: number, step: number) {
    const box = makeLabeledOptionBox(label);

    const spinButton = SpinButton.new_with_range(min, max, step);
    bindSettingToGtkWidget(boundSettingName, spinButton, 'value');

    box.append(spinButton);
    return box;
}

export default {
    init: function () {
        // Nothing to initialize
    },

    buildPrefsWidget: function () {
        const mainBox = new Box({
            orientation: Orientation.VERTICAL,
            'margin-top': 20,
            'margin-bottom': 20,
            'margin-start': 20,
            'margin-end': 20,
            spacing: 10,
        });

        const innerWidgets = [
            makeLabeledEntryOptionBox('Github Hostname', 'domain'),
            makeLabeledEntryOptionBox('Github Token', 'token'),
            makeLabeledEntryOptionBox('Github Handle', 'handle'),
            makeLabeledSwitchOptionBox('Show notifications alert', 'show-alert'),
            makeLabeledSpinButtonOptionBox(
                'Refresh interval (in seconds)*',
                'refresh-interval',
                60,
                86400,
                1,
            ),
            makeLabeledSwitchOptionBox(
                'Only count notifications if you\'re participating (mention, review asked...)',
                'show-participating-only',
            ),
            makeLabeledSwitchOptionBox('Hide notification count', 'hide-notification-count'),
            makeLabeledSwitchOptionBox(
                'Hide widget when there are no notifications',
                'hide-widget'
            ),
            new Label({
                label: TOKEN_EXPLAINER,
                selectable: true,
                'use-markup': true
            }),
        ];

        for (const w of innerWidgets) {
            mainBox.append(w);
        }

        return mainBox;
    },
};
