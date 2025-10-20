import {Component, computed, input, Signal} from '@angular/core';
import {Activity} from '../../workflow';
import {ExecutionState} from '../../../../models/workflows.model';

@Component({
    selector: 'app-activity-exec-stats',
    templateUrl: './activity-exec-stats.component.html',
    styleUrl: './activity-exec-stats.component.scss',
    standalone: false
})
export class ActivityExecStatsComponent {
    activity = input.required<Activity>();

    orderedDurations = computed(() => {
        const durations = this.activity().executionInfo().durations;
        return [ExecutionState.SUBMITTED, ExecutionState.EXECUTING, ExecutionState.AWAIT_PROCESSING, ExecutionState.PROCESSING_RESULT]
        .map(state => [state, durations[state] || 0]);
    });

    settingSplit: Signal<[string, string]> = computed(() => { // the first log message should contain the used settings
        if (this.activity().logMessages().length > 0) {
            const first = this.activity().logMessages()[0];
            if (first.level === 'INFO' && first.msg.includes(' with settings: {')) {
                const idx = first.msg.indexOf('{');
                if (idx > 0 && idx < first.msg.length - 2) {
                    return [first.msg.slice(0, idx), first.msg.slice(idx)];
                }
            }
        }
        return null;
    });
}
