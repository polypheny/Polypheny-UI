import {Component, computed, input} from '@angular/core';
import {Activity} from '../../workflow';
import {ExecutionState} from '../../../../models/workflows.model';

@Component({
    selector: 'app-activity-exec-stats',
    templateUrl: './activity-exec-stats.component.html',
    styleUrl: './activity-exec-stats.component.scss'
})
export class ActivityExecStatsComponent {
    activity = input.required<Activity>();

    orderedDurations = computed(() => {
        const durations = this.activity().executionInfo().durations;
        return [ExecutionState.SUBMITTED, ExecutionState.EXECUTING, ExecutionState.AWAIT_PROCESSING, ExecutionState.PROCESSING_RESULT]
        .map(state => [state, durations[state] || 0]);
    });
}
