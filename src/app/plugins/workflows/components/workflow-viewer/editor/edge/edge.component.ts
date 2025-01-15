import {Component, computed, Input, OnInit, Signal} from '@angular/core';
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
    @Input() start: any;
    @Input() end: any;
    @Input() path: string;

    isControl = false;

    ngOnInit(): void {
        // @ts-ignore
        if (this.data.isPseudo || this.data.isMagnetic) {
            this.isControl = ActivityNode.isControlPortKey(this.data.sourceOutput) || ActivityNode.isControlPortKey(this.data.targetInput);
        } else {
            this.isControl = this.data.isControl;
        }
    }


}

export const EDGE_COLOR_MAP = {
    [EdgeState.IDLE]: 'black',
    [EdgeState.ACTIVE]: 'green',
    [EdgeState.INACTIVE]: 'red'
};

export class Edge<N extends ActivityNode> extends ClassicPreset.Connection<N, N> {
    isMagnetic = false;
    readonly edgeColor = computed(() => EDGE_COLOR_MAP[this.state()]);
    readonly sourceActivityId: string; // activityId
    readonly targetActivityId: string; // activityId

    constructor(source: N, sourceOutput: keyof N['outputs'], target: N, targetInput: keyof N['inputs'],
                public readonly isControl: boolean, public readonly state: Signal<EdgeState>) {
        super(source, sourceOutput, target, targetInput);
        this.sourceActivityId = source.activityId;
        this.targetActivityId = target.activityId;
    }

    public static createDataEdge(from: ActivityNode, fromPort: number, to: ActivityNode, toPort: number, state: Signal<EdgeState>) {
        return new Edge(from, ActivityNode.getDataPortKey(fromPort), to, ActivityNode.getDataPortKey(toPort), false, state);
    }

    public static createControlEdge(from: ActivityNode, to: ActivityNode, fromPort: number, state: Signal<EdgeState>) {
        const isSuccess = fromPort === 0;
        return new Edge(from, isSuccess ? SUCCESS_CONTROL_KEY : FAIL_CONTROL_KEY, to, IN_CONTROL_KEY, true, state);
    }

    getFromPort() {
        if (this.isControl) {
            return this.sourceOutput === SUCCESS_CONTROL_KEY ? 0 : 1;
        } else {
            // @ts-ignore
            return ActivityNode.getDataPortIndexFromKey(this.sourceOutput);
        }
    }

    getToPort() {
        if (this.isControl) {
            return 0;
        } else {
            // @ts-ignore
            return ActivityNode.getDataPortIndexFromKey(this.targetInput);
        }
    }

    isEquivalent(edge: EdgeModel) {
        return edge.isControl === this.isControl
            && edge.fromId === this.sourceActivityId && edge.fromPort === this.getFromPort()
            && edge.toId === this.targetActivityId && edge.toPort === this.getToPort();
    }

    toModel(): EdgeModel {
        return {
            fromId: this.sourceActivityId, fromPort: this.getFromPort(),
            toId: this.targetActivityId, toPort: this.getToPort(),
            isControl: this.isControl
        };
    }
}
