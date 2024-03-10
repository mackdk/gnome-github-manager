import St from '@girs/st-1.0';

import { Button } from './panelMenu';

export class Panel {
    _rightBox: St.BoxLayout = new St.BoxLayout();

    public addToStatusArea(role: string, indicator: Button, position?: number, box?: number): Button {
        return new Button();
    }
}
