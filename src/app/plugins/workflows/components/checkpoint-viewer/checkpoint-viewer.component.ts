import {Component, inject} from '@angular/core';
import {PortType} from '../../models/activity-registry.model';
import {CheckpointViewerService} from '../../services/checkpoint-viewer.service';

@Component({
    selector: 'app-checkpoint-viewer',
    templateUrl: './checkpoint-viewer.component.html',
    styleUrl: './checkpoint-viewer.component.scss'
})
export class CheckpointViewerComponent {

    protected readonly PortType = PortType;


    readonly _checkpoint: CheckpointViewerService = inject(CheckpointViewerService);
}
