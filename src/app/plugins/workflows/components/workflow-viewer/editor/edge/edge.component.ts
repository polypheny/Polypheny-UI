import {Component, Input} from '@angular/core';
import {ClassicPreset} from 'rete';
import {ActivityNode, FAIL_CONTROL_KEY, IN_CONTROL_KEY, SUCCESS_CONTROL_KEY} from '../activity/activity.component';

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

    public static createDataEdge(from: ActivityNode, fromPort: number, to: ActivityNode, toPort: number) {
        return new Edge(from, ActivityNode.getDataPortKey(fromPort), to, ActivityNode.getDataPortKey(toPort));
    }

    public static createControlEdge(from: ActivityNode, to: ActivityNode, fromPort: number) {
        const isSuccess = fromPort === 0;
        console.log('creating control edge!');
        return new Edge(from, isSuccess ? SUCCESS_CONTROL_KEY : FAIL_CONTROL_KEY, to, IN_CONTROL_KEY);
    }
}
