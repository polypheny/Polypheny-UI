import {Component, Input} from '@angular/core';
import {ClassicPreset} from 'rete';
import Popper from 'popper.js';
import {AlgNode} from '../algnode/alg-node.component';
import Position = Popper.Position;

@Component({
    selector: 'app-custom-connection',
    template: `
        <svg data-testid="connection">
            <path [attr.d]="path"/>
        </svg>
    `,
    styleUrl: './custom-connection.component.scss'
})
export class CustomConnectionComponent {
    @Input() data!: CustomConnection<AlgNode>;
    @Input() start: Position;
    @Input() end: Position;
    @Input() path: string;

}

export class CustomConnection<N extends AlgNode> extends ClassicPreset.Connection<N, N> {
}
