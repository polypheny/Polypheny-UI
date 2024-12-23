import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {ToasterService} from '../../../../components/toast-exposer/toaster.service';
import {LeftSidebarService} from '../../../../components/left-sidebar/left-sidebar.service';
import {WorkflowsService} from '../../services/workflows.service';
import {SessionModel, WorkflowDefModel} from '../../models/workflows.model';

@Component({
    selector: 'app-workflows-dashboard',
    templateUrl: './workflows-dashboard.component.html',
    styleUrl: './workflows-dashboard.component.scss'
})
export class WorkflowsDashboardComponent implements OnInit, OnDestroy {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _toast = inject(ToasterService);
    private readonly _sidebar = inject(LeftSidebarService);
    private readonly _workflows = inject(WorkflowsService);

    workflowDefs: Record<string, WorkflowDefModel>;
    sessions: Record<string, SessionModel>;
    selectedVersion: Record<string, number> = {};
    newWorkflowName = '';

    ngOnInit(): void {
        this._sidebar.hide();

        // TODO: add ability to update sessions and workflowdefs
        this._workflows.getWorkflowDefs().subscribe({
            next: res => {
                console.log(res);
                this.workflowDefs = res;
                Object.entries(res).forEach(([key, value]) => {
                    this.selectedVersion[key] = Math.max(...Object.keys(value.versions).map(versionId => parseInt(versionId, 10))); // TODO: order by creation date
                });
            }
        });
        this._workflows.getSessions().subscribe({
            next: res => this.sessions = res
        });
    }

    ngOnDestroy(): void {
    }

    onVersionChange(workflowName: string) {
        // Logic when a version is selected (optional)
        console.log('Selected version for', workflowName, this.selectedVersion[workflowName]);
    }

    openVersion(key: string) {
        console.log('Opening Version');
        this._workflows.openWorkflow(key, this.selectedVersion[key]).subscribe({
            next: sessionId => this.openSession(sessionId),
            error: err => this._toast.error(err.error)
        });
    }

    createAndOpenWorkflow() {
        this._workflows.createSession(this.newWorkflowName).subscribe({
            next: sessionId => this.openSession(sessionId),
            error: err => this._toast.error(err.error)
        });
    }

    openSession(sessionId: string) {
        this._router.navigate([`./${sessionId}`], {relativeTo: this._route});
    }
}
