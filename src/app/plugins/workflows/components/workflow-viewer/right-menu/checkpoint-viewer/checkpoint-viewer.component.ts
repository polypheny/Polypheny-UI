import {Component, computed, input, OnInit, Signal} from '@angular/core';
import {Activity} from '../../workflow';
import {CheckpointViewerService} from '../../../../services/checkpoint-viewer.service';

@Component({
    selector: 'app-checkpoint-viewer',
    templateUrl: './checkpoint-viewer.component.html',
    styleUrl: './checkpoint-viewer.component.scss'
})
export class CheckpointViewerComponent implements OnInit {

    activity = input.required<Activity>();
    isQueryable = input.required<boolean>();

    isExecuted: Signal<boolean>;
    isFinished: Signal<boolean>;
    selectedOutput = 0;

    constructor(readonly _checkpoint: CheckpointViewerService) {
    }

    ngOnInit(): void {
        this.isExecuted = computed(() => this.activity().state() === 'FINISHED' || this.activity().state() === 'SAVED');
        this.isFinished = computed(() => this.activity().state() === 'FINISHED');
    }


    showOutput(i: number) {
        this.selectedOutput = i;
        this._checkpoint.setModal(true);
        this._checkpoint.getCheckpoint(this.activity(), this.selectedOutput);
    }

    materializeCheckpoints() {
        this._checkpoint.materializeCheckpoints(this.activity().id);
    }
}
