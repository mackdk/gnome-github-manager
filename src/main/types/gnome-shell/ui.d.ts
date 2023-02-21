import { MessageTray } from '@gnome-shell/ui/messageTray';
import { Panel } from '@gnome-shell/ui/panel';

export interface Main {
    panel: Panel;
    messageTray: MessageTray;
}

export const main: Main;
