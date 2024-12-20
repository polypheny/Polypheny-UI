import {Component, inject} from '@angular/core';
import {WorkflowsService} from '../../services/workflows.service';

@Component({
    selector: 'app-workflow-viewer',
    templateUrl: './workflow-viewer.component.html',
    styleUrl: './workflow-viewer.component.scss'
})
export class WorkflowViewerComponent {
    private readonly _workflows = inject(WorkflowsService);

}
