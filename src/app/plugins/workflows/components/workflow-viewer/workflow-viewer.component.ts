import {Component, ElementRef, inject, Injector, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {WorkflowsService} from '../../services/workflows.service';
import {ToasterService} from '../../../../components/toast-exposer/toaster.service';
import {WorkflowModel} from '../../models/workflows.model';
import {WorkflowEditor} from './editor/workflow-editor';

@Component({
    selector: 'app-workflow-viewer',
    templateUrl: './workflow-viewer.component.html',
    styleUrl: './workflow-viewer.component.scss'
})
export class WorkflowViewerComponent implements OnInit, OnDestroy {
    @Input() sessionId: string;
    @Input() isEditable: boolean;

    @ViewChild('rete') container!: ElementRef;

    private readonly _workflows = inject(WorkflowsService);
    private readonly _toast = inject(ToasterService);
    private editor: WorkflowEditor;
    workflow: WorkflowModel;

    constructor(private injector: Injector) {
    }

    ngOnInit(): void {
    }

    ngAfterViewInit(): void {
        const el = this.container.nativeElement;

        if (el) {
            this.editor = new WorkflowEditor(this.injector, el, false);
        }
        this._workflows.getActiveWorkflow(this.sessionId).subscribe({
            next: res => {
                this.workflow = res;
                this.editor.initialize(res);
            }
        });
    }

    ngOnDestroy(): void {
        this.editor?.destroy();
    }

}
