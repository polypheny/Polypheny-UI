import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {ToasterService} from '../../../../components/toast-exposer/toaster.service';
import {LeftSidebarService} from '../../../../components/left-sidebar/left-sidebar.service';
import {WorkflowsService} from '../../services/workflows.service';
import {SessionModel} from '../../models/workflows.model';

@Component({
    selector: 'app-workflow-session',
    templateUrl: './workflow-session.component.html',
    styleUrl: './workflow-session.component.scss'
})
export class WorkflowSessionComponent implements OnInit, OnDestroy {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _toast = inject(ToasterService);
    private readonly _sidebar = inject(LeftSidebarService);
    private readonly _workflows = inject(WorkflowsService);

    sessionId: string;
    session: SessionModel;

    ngOnInit(): void {
        this._sidebar.hide();

        this._route.paramMap.subscribe(params => {
            this.sessionId = params.get('sessionId');
            if (this.sessionId) {
                this._workflows.getSession(this.sessionId).subscribe({
                    next: res => this.session = res,
                    error: e => this._router.navigate(['./../'], {relativeTo: this._route})
                });
            }
        });

        this.sessionId = this._route.snapshot.paramMap.get('sessionId');
    }

    ngOnDestroy(): void {
    }
}
