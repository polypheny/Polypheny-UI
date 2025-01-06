import {ChangeDetectorRef, Component, computed, HostBinding, Input, OnChanges, Signal} from '@angular/core';
import {ClassicPreset} from 'rete';
import {KeyValue} from '@angular/common';
import {ActivityState, CommonType, WorkflowState} from '../../../../models/workflows.model';
import {ActivityDef} from '../../../../models/activity-registry.model';
import {ActivityPort} from '../activity-port/activity-port.component';
import {Subject} from 'rxjs';

@Component({
    selector: 'app-activity',
    templateUrl: './activity.component.html',
    styleUrl: './activity.component.scss'
})
export class ActivityComponent implements OnChanges {
    @Input() data!: ActivityNode;
    @Input() emit!: (data: any) => void;
    @Input() rendered!: () => void;
    seed = 0;

    @HostBinding('class.selected') get selected() {
        return this.data.selected;
    }

    constructor(private cdr: ChangeDetectorRef) {
        this.cdr.detach();
    }

    ngOnChanges(): void {
        this.cdr.detectChanges();
        requestAnimationFrame(() => this.rendered());
        this.seed++; // force render sockets
    }

    sortByIndex<
        N extends object,
        T extends KeyValue<string, N & { index?: number }>
    >(a: T, b: T) {
        const ai = a.value.index || 0;
        const bi = b.value.index || 0;

        return ai - bi;
    }
}

export const IN_CONTROL_KEY = 'c_in';
export const SUCCESS_CONTROL_KEY = 'c_out_success';
export const FAIL_CONTROL_KEY = 'c_out_fail';

export class ActivityNode extends ClassicPreset.Node {
    width = 200;
    height = 260; // TODO: change dimensions according to number of inputs / outputs etc
    canExecute = computed(() => this.state() === 'IDLE' && this.workflowState() === 'IDLE');
    canReset = computed(() => this.state() !== 'IDLE' && this.workflowState() === 'IDLE');

    constructor(
        public readonly def: ActivityDef,
        public readonly activityId: string,
        public readonly state: Signal<ActivityState>,
        public readonly workflowState: Signal<WorkflowState>,
        public readonly progress: Signal<number>,
        public readonly commonType: Signal<CommonType>,
        public readonly executeActivitySubject: Subject<string>,
        public readonly resetActivitySubject: Subject<string>
    ) {
        super(def.displayName);
        // control ports
        this.addInput(IN_CONTROL_KEY, new ClassicPreset.Input(new ActivityPort(null, true, 'in'), null, true));
        this.addOutput(SUCCESS_CONTROL_KEY, new ClassicPreset.Output(new ActivityPort(null, false, 'success'), null, true));
        this.addOutput(FAIL_CONTROL_KEY, new ClassicPreset.Output(new ActivityPort(null, false, 'fail'), null, true));

        // data ports
        def.inPorts.forEach((inPort, i) => {
            this.addInput(ActivityNode.getDataPortKey(i), new ClassicPreset.Input(new ActivityPort(inPort, true), null, false));
        });
        def.outPorts.forEach((outPort, i) => {
            this.addOutput(ActivityNode.getDataPortKey(i), new ClassicPreset.Output(new ActivityPort(outPort, false), null, true));
        });

        this.height += (def.inPorts.length + def.outPorts.length) * 32;
        console.log('setting height to', this.height);
    }

    public static getDataPortKey(index: number) {
        return 'd_' + index;
    }

    public static getDataPortIndexFromKey(key: string) {
        return parseInt(key.slice(2), 10);
    }

    public static isControlPortKey(key: string) {
        return key === IN_CONTROL_KEY || key === SUCCESS_CONTROL_KEY || key === FAIL_CONTROL_KEY;
    }

    execute() {
        console.log('executing activity');
        this.executeActivitySubject.next(this.activityId);
    }

    reset() {
        console.log('resetting activity');
        this.resetActivitySubject.next(this.activityId);
    }
}
