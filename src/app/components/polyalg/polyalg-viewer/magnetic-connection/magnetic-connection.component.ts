import {Component, Input} from '@angular/core';
import Popper from 'popper.js';
import Position = Popper.Position;

@Component({
    selector: 'app-magnetic-connection',
    template: `
        <svg data-testid="connection">
            <path [attr.d]="path"/>
        </svg>
    `,
    styleUrl: './magnetic-connection.component.scss'
})
export class MagneticConnectionComponent {
    @Input() data: any;
    @Input() start: Position;
    @Input() end: Position;
    @Input() path: string;
}
