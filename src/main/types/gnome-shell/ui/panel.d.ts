import St from '@girs/st-1.0';

import { Button } from './panelMenu';

export interface Panel extends St.Widget {
    _rightBox: St.BoxLayout;

    addToStatusArea(role: string, indicator: Button, position?: number, box?: number): Button;
}
