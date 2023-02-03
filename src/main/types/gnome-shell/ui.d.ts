import { MessageTray } from '@gnome-shell/ui/messageTray';
import { Panel } from './ui/panel';

export interface Main {
    panel: Panel;
    messageTray: MessageTray;
}

export const main : Main;
