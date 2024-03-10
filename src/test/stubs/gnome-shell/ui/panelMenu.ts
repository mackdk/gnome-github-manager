import St from '@girs/st-1.0';

export class ButtonBox {}

export class Button extends ButtonBox {
    
    public constructor(_menuAlignment?: number, _nameText?: string, _dontCreateMenu?: boolean) {
        super();
    }

    public add_actor(widget: St.Widget): void {}
}
