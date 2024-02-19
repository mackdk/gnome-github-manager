import { MessageTray } from './ui/messageTray';
import { Panel } from './ui/panel';

export class Main {
    panel: Panel = new Panel();
    messageTray: MessageTray = new MessageTray();
}

export const main: Main = new Main();
