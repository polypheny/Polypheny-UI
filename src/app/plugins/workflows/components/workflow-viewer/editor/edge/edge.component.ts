import {Component, Input} from '@angular/core';
import {ClassicPreset} from 'rete';
import {ActivityNode} from '../activity/activity.component';

@Component({
    selector: 'app-edge',
    templateUrl: './edge.component.html',
    styleUrl: './edge.component.scss'
})
export class EdgeComponent {
    @Input() data!: Edge<ActivityNode>;
    @Input() start: any;
    @Input() end: any;
    @Input() path: string;
}

export class Edge<N extends ActivityNode> extends ClassicPreset.Connection<N, N> {
    isMagnetic = false; // TODO: why is this required?

    constructor(source: N, sourceOutput: keyof N['outputs'], target: N, targetInput: keyof N['inputs']) {
        super(source, sourceOutput, target, targetInput);
    }
}
