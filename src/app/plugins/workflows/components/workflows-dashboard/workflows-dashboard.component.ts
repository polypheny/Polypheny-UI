import {Component, effect, inject, OnDestroy, OnInit, signal, WritableSignal} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {ToasterService} from '../../../../components/toast-exposer/toaster.service';
import {LeftSidebarService} from '../../../../components/left-sidebar/left-sidebar.service';
import {WorkflowsService} from '../../services/workflows.service';
import {SessionModel, WorkflowDefModel} from '../../models/workflows.model';
import {SidebarNode} from '../../../../models/sidebar-node.model';
import {retry} from 'rxjs';

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

    public route = signal(null);

    workflowDefs: Record<string, WorkflowDefModel>;
    workflowDefsCount = 0;
    sortedGroups: { groupName: string, defs: { id: string, def: WorkflowDefModel }[] }[];
    visibleGroups: Record<string, WritableSignal<boolean>> = {};
    sessions: Record<string, SessionModel>;
    selectedVersion: Record<string, number> = {};
    newWorkflowName = '';
    newWorkflowGroup = '';
    showDeleteModal = signal(false);
    workflowToDelete: { id: string, def: WorkflowDefModel } = null;

    constructor() {
        effect(() => {
            if (this.route()) {
                this.getWorkflowDefs();
                this.getSessions();
            }
        });
    }

    ngOnInit(): void {
        this.getRoute();
        this.initSidebar();
    }

    ngOnDestroy(): void {
        this._sidebar.hide();
    }

    private getRoute() {
        this.route.set(this._route.snapshot.paramMap.get('route'));
        this._route.params.subscribe(params => {
            this.route.set(params['route']);
        });
    }

    private getWorkflowDefs() {
        this._workflows.getWorkflowDefs().pipe(
            retry({
                count: 30,
                delay: 10000
            })
        ).subscribe({
            next: res => {
                this.workflowDefs = res;
                this.workflowDefsCount = Object.keys(res).length;

                const groups = new Map<string, { id: string, def: WorkflowDefModel }[]>();
                //const groups: {group: string, defs: {id: string, def: WorkflowDefModel}[]}[] = [];

                Object.entries(res).forEach(([id, def]) => {
                    const groupName = def.group || '';
                    const group = groups.get(groupName) || [];
                    group.push({id, def});
                    groups.set(groupName, group);
                });

                const groupsArray: { groupName: string, defs: { id: string, def: WorkflowDefModel }[] }[] = [];
                const visibleGroups: Record<string, WritableSignal<boolean>> = {};
                groups.forEach((defs, groupName) => {
                    defs.sort((a, b) => a.def.name.localeCompare(b.def.name));
                    groupsArray.push({groupName, defs});
                    visibleGroups[groupName] = signal(this.visibleGroups[groupName] ? this.visibleGroups[groupName]() : true);
                });
                this.sortedGroups = groupsArray.sort((a, b) => a.groupName.localeCompare(b.groupName));
                this.visibleGroups = visibleGroups;

                const selectedVersion = {};
                Object.entries(res).forEach(([key, value]) => {
                    selectedVersion[key] = Math.max(...Object.keys(value.versions).map(versionId => parseInt(versionId, 10))); // TODO: order by creation date
                });
                this.selectedVersion = selectedVersion;
            }
        });
    }

    private getSessions() {
        this._workflows.getSessions().subscribe({
            next: res => this.sessions = res
        });
    }

    private initSidebar() {
        const sidebarNodes: SidebarNode[] = [
            new SidebarNode(0, 'Dashboard', null, '/views/workflows/dashboard'),
            new SidebarNode(1, 'Sessions', null, '/views/workflows/sessions'),
            //new SidebarNode(2, 'Jobs', null, '/views/workflows/jobs'),
            //new SidebarNode(3, 'API', null, '/views/workflows/api')
        ];
        this._sidebar.setNodes(sidebarNodes);
        this._sidebar.open();
    }

    openVersion(key: string) {
        this._workflows.openWorkflow(key, this.selectedVersion[key]).subscribe({
            next: sessionId => this.openSession(sessionId),
            error: err => this._toast.error(err.error)
        });
    }

    createAndOpenWorkflow() {
        this._workflows.createSession(this.newWorkflowName, this.newWorkflowGroup).subscribe({
            next: sessionId => this.openSession(sessionId),
            error: err => this._toast.error(err.error)
        });
    }

    openSession(sessionId: string) {
        this._router.navigate([`/views/workflows/sessions/${sessionId}`]);
    }

    terminateSession(sessionId: string) {
        this._workflows.terminateSession(sessionId).subscribe({
            next: () => {
                this._toast.success('Successfully terminated session', 'Terminate session');
                this.getSessions();
            },
            error: e => this._toast.error(e, 'Unable to terminate session'),
        });

    }

    toggleCollapse(groupName: string) {
        this.visibleGroups[groupName].update(b => !b);
    }

    confirmDelete(workflowId: string) {
        this.workflowToDelete = {id: workflowId, def: this.workflowDefs[workflowId]};
        this.showDeleteModal.set(true);
    }

    toggleDeleteModal() {
        this.showDeleteModal.update(b => !b);
    }

    deleteVersion(workflowId: string, version: string) {
        this._workflows.deleteVersion(workflowId, parseInt(version, 10)).subscribe({
            next: () => {
                this._toast.success('Successfully deleted workflow version ' + version, 'Delete Version');
                this.getWorkflowDefs();
            },
            error: e => this._toast.error(e.error, 'Unable to delete version')
        });
    }

    deleteWorkflow(workflowId: string) {
        this.showDeleteModal.set(false);
        this._workflows.deleteWorkflow(workflowId).subscribe({
            next: () => {
                this._toast.success('Successfully deleted workflow', 'Delete workflow');
                this.getWorkflowDefs();
            },
            error: e => this._toast.error(e.error, 'Unable to delete workflow')
        });
    }

    changeName(workflowId: string, name: string) {
        this._workflows.renameWorkflow(workflowId, name).subscribe({
            next: () => {
                this._toast.success('Successfully renamed workflow ', 'Rename Workflow');
                this.getWorkflowDefs();
            },
            error: e => this._toast.error(e.error, 'Unable to rename workflow')
        });
    }

    changeGroup(workflowId: string, groupName: string) {
        this._workflows.renameWorkflow(workflowId, null, groupName).subscribe({
            next: () => {
                this._toast.success('Successfully changed workflow group', 'Change Workflow Group');
                this.getWorkflowDefs();
            },
            error: e => this._toast.error(e.error, 'Unable to change workflow group')
        });
    }
}
