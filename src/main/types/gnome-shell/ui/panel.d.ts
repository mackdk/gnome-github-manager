import { BoxLayout, Widget } from '@gi-types/st1';

import { Button } from './panelMenu';

export interface Panel extends Widget {
    _rightBox: BoxLayout;

    addToStatusArea(role: string, indicator: Button, position?: number, box?: number): Button;
}
