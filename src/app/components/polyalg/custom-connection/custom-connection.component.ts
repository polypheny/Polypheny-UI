import {Component, Input} from '@angular/core';
import {ClassicPreset} from 'rete';
import Popper from 'popper.js';
import {AlgNode} from '../algnode/alg-node.component';
import Position = Popper.Position;

@Component({
    selector: 'app-custom-connection',
    template: `
        <svg data-testid="connection">
            <path [attr.d]="path" [attr.stroke-width]="data.width || DEFAULT_WIDTH"/>
        </svg>
    `,
    styleUrl: './custom-connection.component.scss',
    standalone: false
})
export class CustomConnectionComponent {
    @Input() data!: CustomConnection<AlgNode>;
    @Input() start: Position;
    @Input() end: Position;
    @Input() path: string;

    DEFAULT_WIDTH = DEFAULT_WIDTH;

}

const DEFAULT_WIDTH = 5;
const MAX_WIDTH = 50;

export class CustomConnection<N extends AlgNode> extends ClassicPreset.Connection<N, N> {
    isMagnetic = false;
    width = DEFAULT_WIDTH;

    constructor(source: N, sourceOutput: keyof N['outputs'], target: N, targetInput: keyof N['inputs'], width = 0) {
        super(source, sourceOutput, target, targetInput);
        this.width = DEFAULT_WIDTH + (MAX_WIDTH - DEFAULT_WIDTH) * Math.max(0, Math.min(width, 1));
    }
}
