import {Component, computed, EventEmitter, Input, Output, signal} from '@angular/core';
import {ExecutionMonitorModel, ExecutionState} from '../../../models/workflows.model';
import {WorkflowsService} from '../../../services/workflows.service';
import {Workflow} from '../workflow';

@Component({
    selector: 'app-execution-monitor',
    templateUrl: './execution-monitor.component.html',
    styleUrl: './execution-monitor.component.scss',
    standalone: false
})
export class ExecutionMonitorComponent {


    constructor(private _workflows: WorkflowsService) {
    }

    @Input() sessionId: string; // does not change
    @Input() workflow: Workflow;
    @Input() canOpen = true; // does not change
    @Output() openActivity = new EventEmitter<string>();

    readonly monitor = signal<ExecutionMonitorModel>(null);
    readonly isLoading = signal(false);
    readonly showModal = signal(false);
    readonly infoDurationsSeconds = computed(() => {
        if (this.monitor()) {
            return this.monitor().infos.map(info =>
                Math.round(info.totalDuration / 1000)
            );
        }
        return null;
    });
    readonly tuplesPerSecond = computed(() => {
        const tps = this.monitor().tuplesWritten * 1000 / this.monitor().totalDuration;
        return Math.round(tps);
    });
    readonly orderedExecutionStates = [ExecutionState.SUBMITTED, ExecutionState.EXECUTING, ExecutionState.AWAIT_PROCESSING, ExecutionState.PROCESSING_RESULT];

    toggleModal() {
        this.showModal.update(b => !b);
    }

    show(execMonitor?: ExecutionMonitorModel) {
        if (execMonitor) {
            this.monitor.set(execMonitor);
        } else {
            this.isLoading.set(true);
            this._workflows.getExecutionMonitor(this.sessionId).subscribe(m => {
                this.monitor.set(m);
                this.isLoading.set(false);
            });
        }
        this.showModal.set(true);
    }
}
