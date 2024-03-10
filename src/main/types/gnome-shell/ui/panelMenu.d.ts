import St from '@girs/st-1.0';

export class ButtonBox extends St.Widget {}

export class Button extends ButtonBox {
    public constructor(menuAlignment: number, nameText: string, dontCreateMenu: boolean);
    public add_actor(widget: St.Widget): void;
}
