import {Component, Input, OnInit, signal, Signal} from '@angular/core';
import {ClassicPreset} from 'rete';
import {ActivityNode, FAIL_CONTROL_KEY, IN_CONTROL_KEY, SUCCESS_CONTROL_KEY} from '../activity/activity.component';
import {EdgeModel, EdgeState} from '../../../../models/workflows.model';

@Component({
    selector: 'app-edge',
    templateUrl: './edge.component.html',
    styleUrl: './edge.component.scss'
})
export class EdgeComponent implements OnInit {
    @Input() data!: Edge<ActivityNode>;
    @Input() start: { x: number; y: number };
    @Input() end: { x: number; y: number };
    @Input() path: string;

    isControl = false;
    isFailControl = false;
    center: Signal<{ x: number, y: number, angle: number }>;

    ngOnInit(): void {
        // @ts-ignore
        if (this.data.isPseudo || this.data.isMagnetic) {
            this.isControl = ActivityNode.isControlPortKey(this.data.sourceOutput) || ActivityNode.isControlPortKey(this.data.targetInput);
        } else {
            this.isControl = this.data.isControl;
        }
        this.isFailControl = this.data.sourceOutput === FAIL_CONTROL_KEY;
        this.center = this.data.center;
    }
}

export class Edge<N extends ActivityNode> extends ClassicPreset.Connection<N, N> {
    isMagnetic = false;
    readonly sourceActivityId: string; // activityId
    readonly targetActivityId: string; // activityId
    readonly center = signal({x: 0, y: 0, angle: 0});
    isMulti = false;
    multiIdx = 0;

    constructor(source: N, sourceOutput: keyof N['outputs'], target: N, targetInput: keyof N['inputs'],
                public readonly toIdx: number, // for multi-port: can differ from socket
                public readonly isControl: boolean, public readonly state: Signal<EdgeState>) {
        super(source, sourceOutput, target, targetInput);
        this.sourceActivityId = source.activityId;
        this.targetActivityId = target.activityId;
        if (!isControl && target.def.inPorts[ActivityNode.getDataPortIndexFromKey(targetInput as string)].isMulti) {
            this.isMulti = true;
            this.multiIdx = toIdx + 1 - target.def.inPorts.length;
        }
    }

    public static createDataEdge(from: ActivityNode, fromPort: number, to: ActivityNode, toPort: number, state: Signal<EdgeState>) {
        return new Edge(from, ActivityNode.getDataPortKey(fromPort), to, to.getInDataPortKey(toPort), toPort, false, state);
    }

    public static createControlEdge(from: ActivityNode, to: ActivityNode, fromPort: number, state: Signal<EdgeState>) {
        const isSuccess = fromPort === 0;
        return new Edge(from, isSuccess ? SUCCESS_CONTROL_KEY : FAIL_CONTROL_KEY, to, IN_CONTROL_KEY, 0, true, state);
    }

    getFromPort() {
        if (this.isControl) {
            return this.sourceOutput === SUCCESS_CONTROL_KEY ? 0 : 1;
        } else {
            // @ts-ignore
            return ActivityNode.getDataPortIndexFromKey(this.sourceOutput);
        }
    }

    toModel(): EdgeModel {
        return {
            fromId: this.sourceActivityId, fromPort: this.getFromPort(),
            toId: this.targetActivityId, toPort: this.toIdx,
            isControl: this.isControl
        };
    }
}
