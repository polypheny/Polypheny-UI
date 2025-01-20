import {ChangeDetectorRef, Component, computed, HostBinding, Input, OnChanges, OnInit, Signal} from '@angular/core';
import {ClassicPreset} from 'rete';
import {KeyValue} from '@angular/common';
import {ActivityState, WorkflowState} from '../../../../models/workflows.model';
import {ActivityPort} from '../activity-port/activity-port.component';
import {Subject} from 'rxjs';
import {Activity} from '../../workflow';
import {DataModel} from '../../../../../../models/ui-request.model';
import {WorkflowsWebSocketService} from '../../../../services/workflows-websocket.service';
import {ToasterService} from '../../../../../../components/toast-exposer/toaster.service';


export const stateColors = {
    [ActivityState.IDLE]: '#dddddd',
    [ActivityState.QUEUED]: '#39f',
    [ActivityState.EXECUTING]: '#0d6efd',
    [ActivityState.FINISHED]: '#2eb85c', // same color as saved
    [ActivityState.SAVED]: '#2eb85c',
    [ActivityState.SKIPPED]: '#f9b115',
    [ActivityState.FAILED]: '#e55353',
};

export const IN_CONTROL_KEY = 'c_in';
export const SUCCESS_CONTROL_KEY = 'c_out_success';
export const FAIL_CONTROL_KEY = 'c_out_fail';

export const dataModelIcons = {
    [DataModel.RELATIONAL]: 'fa fa-table',
    [DataModel.DOCUMENT]: 'fa fa-file-text-o',
    [DataModel.GRAPH]: 'cil-graph',
};

@Component({
    selector: 'app-activity',
    templateUrl: './activity.component.html',
    styleUrl: './activity.component.scss'
})
export class ActivityComponent implements OnInit, OnChanges {
    @Input() data!: ActivityNode;
    @Input() emit!: (data: any) => void;
    @Input() rendered!: () => void;
    seed = 0;

    statusBackground: Signal<string>;
    statusText: Signal<string>;
    readonly inIcons: Record<string, Signal<string>> = {};
    readonly outIcons: Record<string, Signal<string>> = {};

    protected readonly IN_CONTROL_KEY = IN_CONTROL_KEY;
    protected readonly ActivityState = ActivityState;

    @HostBinding('class.selected') get selected() {
        return this.data.selected;
    }

    constructor(private cdr: ChangeDetectorRef, private _websocket: WorkflowsWebSocketService, private _toast: ToasterService) {
        this.cdr.detach();
    }

    ngOnInit(): void {
        const grad1 = '#20c997';
        const grad2 = stateColors[ActivityState.EXECUTING];
        this.statusBackground = computed(() => {
            if (this.data.state() === ActivityState.EXECUTING) {
                const percent = this.data.progress() * 100;
                return `linear-gradient(to right, ${grad1} ${percent - 5}%, ${grad2} ${percent + 5}%)`;
            } else {
                return stateColors[this.data.state()];
            }
        });
        this.statusText = computed(() => {
            switch (this.data.state()) {
                case ActivityState.EXECUTING:
                    return `executing (${Math.floor(this.data.progress() * 100)} %)`;
                case ActivityState.FINISHED:
                    return 'finished (not materialized)';
                case ActivityState.SAVED:
                    return 'finished';
                case ActivityState.SKIPPED:
                    return 'cancelled';
                default:
                    return this.data.state().toLowerCase();
            }
        });
        Object.entries(this.data.dataInputs).forEach(([key, input]) => {
            this.inIcons[key] = computed(() => dataModelIcons[input.socket.dataModel()]);
        });
        Object.entries(this.data.dataOutputs).forEach(([key, input]) => {
            this.outIcons[key] = computed(() => dataModelIcons[input.socket.dataModel()]);
        });

        this.cdr.detectChanges();
    }

    ngOnChanges(): void {
        this.cdr.detectChanges();
        requestAnimationFrame(() => this.rendered());
        this.seed++; // force render sockets
    }

    saveNotes() {
        // we can perform this update locally, instead of from the workflow-viewer
        console.log('saving notes', this.data.rendering());
        this._websocket.updateActivity(this.data.activityId, null, null, this.data.rendering());
    }

    showProblems() {
        if (Object.keys(this.data.invalidSettings()).length > 0) {
            this.data.openSettings();
        }
        if (this.data.invalidReason()) {
            this._toast.warn(this.data.invalidReason(), 'Problem with Activity');
        }
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

export class ActivityNode extends ClassicPreset.Node {
    width = 400;
    height = 270;
    canExecute = computed(() => this.state() === 'IDLE' && this.workflowState() === 'IDLE');
    canReset = computed(() => this.state() !== 'IDLE' && this.workflowState() === 'IDLE');
    canOpenCheckpoint = computed(() => this.state() === 'FINISHED' || this.state() === 'SAVED'); // TODO: find solution for when to show inputs

    readonly activityId = this.activity.id;
    readonly displayName = this.activity.displayName;
    readonly rendering = this.activity.rendering;
    readonly state = this.activity.state.asReadonly();
    readonly progress = this.activity.progress.asReadonly();
    readonly commonType = this.activity.commonType;
    readonly invalidReason = this.activity.invalidReason;
    readonly invalidSettings = this.activity.invalidSettings;
    readonly hasInvalidSettings = this.activity.hasInvalidSettings;
    readonly isOpened = this.activity.isOpened;
    readonly controlInput: ClassicPreset.Input<ActivityPort>;
    readonly dataInputs: { [key: string]: ClassicPreset.Input<ActivityPort> } = {};
    readonly controlOutputs: { [key: string]: ClassicPreset.Output<ActivityPort> };
    readonly dataOutputs: { [key: string]: ClassicPreset.Output<ActivityPort> } = {};

    constructor(
        private readonly activity: Activity,
        public readonly workflowState: Signal<WorkflowState>,
        public readonly executeActivitySubject: Subject<string>,
        public readonly resetActivitySubject: Subject<string>,
        public readonly openSettingsSubject: Subject<string>,
        public readonly openCheckpointSubject: Subject<[string, boolean, number]>
    ) {
        super(activity.displayName());
        // control ports
        this.controlInput = new ClassicPreset.Input(new ActivityPort(null, true, 'in', this.state), null, true);
        this.addInput(IN_CONTROL_KEY, this.controlInput);
        this.addOutput(SUCCESS_CONTROL_KEY, new ClassicPreset.Output(new ActivityPort(null, false, 'success', this.state), null, true));
        this.addOutput(FAIL_CONTROL_KEY, new ClassicPreset.Output(new ActivityPort(null, false, 'fail', this.state), null, true));

        this.controlOutputs = {
            [SUCCESS_CONTROL_KEY]: this.outputs[SUCCESS_CONTROL_KEY] as ClassicPreset.Output<ActivityPort>,
            [FAIL_CONTROL_KEY]: this.outputs[FAIL_CONTROL_KEY] as ClassicPreset.Output<ActivityPort>
        };

        const def = activity.def;
        // data ports
        def.inPorts.forEach((inPort, i) => {
            const input = new ClassicPreset.Input(new ActivityPort(inPort, true, null, this.state), null, false);
            this.addInput(ActivityNode.getDataPortKey(i), input);
            this.dataInputs[ActivityNode.getDataPortKey(i)] = input;
        });
        def.outPorts.forEach((outPort, i) => {
            const output = new ClassicPreset.Output(new ActivityPort(outPort, false, null, this.state), null, true);
            this.addOutput(ActivityNode.getDataPortKey(i), new ClassicPreset.Output(new ActivityPort(outPort, false, null, this.state), null, true));
            this.dataOutputs[ActivityNode.getDataPortKey(i)] = output;
        });

        this.height += Math.max(0,
            (def.inPorts.length - 3) * 34,
            (def.outPorts.length - 2) * 34
        );
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
        this.executeActivitySubject.next(this.activityId);
    }

    reset() {
        this.resetActivitySubject.next(this.activityId);
    }

    openSettings() {
        this.openSettingsSubject.next(this.activityId);
    }

    openCheckpoint(isInput: boolean, key: string) {
        this.openCheckpointSubject.next([this.activityId, isInput, ActivityNode.getDataPortIndexFromKey(key)]);
    }
}
