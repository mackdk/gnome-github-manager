import { Widget } from "@gi-types/st1";

export class ButtonBox {}

export class Button extends ButtonBox {
    
    public constructor(_menuAlignment?: number, _nameText?: string, _dontCreateMenu?: boolean) {
        super();
    }

    public add_actor(widget: Widget): void {}
}
