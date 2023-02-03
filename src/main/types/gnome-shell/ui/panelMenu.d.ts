import { Widget } from '@gi-types/st1';

export class ButtonBox extends Widget { }

export class Button extends ButtonBox {
    public constructor(menuAlignment: number, nameText: string, dontCreateMenu: boolean);
    public add_actor(widget: Widget): void;
}
