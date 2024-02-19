import { BoxLayout } from '@gi-types/st1';

import { Button } from './panelMenu';

export class Panel {
    _rightBox: BoxLayout = new BoxLayout();

    public addToStatusArea(role: string, indicator: Button, position?: number, box?: number): Button {
        return new Button();
    }
}
