import {Component, effect, inject, OnDestroy, OnInit, signal, WritableSignal} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {ToasterService} from '../../../../components/toast-exposer/toaster.service';
import {LeftSidebarService} from '../../../../components/left-sidebar/left-sidebar.service';
import {WorkflowsService} from '../../services/workflows.service';
import {SessionModel, WorkflowDefModel, WorkflowModel} from '../../models/workflows.model';
import {SidebarNode} from '../../../../models/sidebar-node.model';
import {retry} from 'rxjs';
import {WebuiSettingsService} from '../../../../services/webui-settings.service';

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
    readonly _settings = inject(WebuiSettingsService);

    public route = signal(null);

    workflowDefs: Record<string, WorkflowDefModel>;
    workflowDefsCount = 0;
    sortedGroups: { groupName: string, defs: { id: string, def: WorkflowDefModel }[] }[];
    visibleGroups: Record<string, WritableSignal<boolean>> = {};
    sessions: SessionModel[] = [];
    userSessions: SessionModel[] = [];
    apiSessions: SessionModel[] = [];
    selectedVersion: Record<string, number> = {};
    newWorkflowName = '';
    newWorkflowGroup = '';
    uploadWorkflowName = '';
    uploadWorkflowGroup = '';
    uploadedWorkflow: WorkflowModel = null;

    showDeleteModal = signal(false);
    workflowToDelete: { id: string, def: WorkflowDefModel } = null;

    showCopyModal = signal(false);
    workflowToCopy: { id: string, version: string } = null;
    copyWorkflowName = '';
    copyWorkflowGroup = '';

    protected readonly Object = Object;

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
                    selectedVersion[key] = Math.max(...Object.keys(value.versions).map(versionId => parseInt(versionId, 10)));
                });
                this.selectedVersion = selectedVersion;
            }
        });
    }

    private getSessions() {
        this._workflows.getSessions().subscribe({
            next: res => {
                this.sessions = Object.values(res).sort((a, b) =>
                    new Date(b.lastInteraction).getTime() - new Date(a.lastInteraction).getTime()
                );
                this.userSessions = this.sessions.filter(s => s.type === 'USER_SESSION');
                this.apiSessions = this.sessions.filter(s => s.type === 'API_SESSION');
            }
        });
    }

    private initSidebar() {
        const sidebarNodes: SidebarNode[] = [
            new SidebarNode(0, 'Dashboard', null, '/views/workflows/dashboard'),
            new SidebarNode(1, 'Sessions', null, '/views/workflows/sessions'),
            new SidebarNode(2, 'API', null, '/views/workflows/api'),
            new SidebarNode(3, 'Jobs', null, '/views/workflows/jobs')
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

    toggleCopyModal() {
        this.showCopyModal.update(b => !b);
    }

    copyWorkflow() {
        this.showCopyModal.set(false);
        this._workflows.copyWorkflow(this.workflowToCopy.id, parseInt(this.workflowToCopy.version, 10),
            this.copyWorkflowName, this.copyWorkflowGroup).subscribe({
            next: () => {
                this._toast.success('Successfully copied workflow', 'Copy Workflow');
                this.getWorkflowDefs();
            },
            error: e => this._toast.error(e.error, 'Unable to copy workflow')
        });
    }

    openCopyModal(id: string, version: string) {
        if (this.showCopyModal()) {
            return;
        }
        this.workflowToCopy = {id, version};
        this.copyWorkflowName = this.workflowDefs[id].name + '_copy';
        this.copyWorkflowGroup = this.workflowDefs[id].group;
        this.showCopyModal.set(true);
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

    onFileChange(files: any[]) {
        if (!files || files.length === 0) {
            this.uploadedWorkflow = null;
            return;
        }
        const file = files[0];
        if (!(this.uploadWorkflowName?.length > 0)) {
            this.uploadWorkflowName = file.name.replace(/(_v\d+)?(\.json)?$/, '');
        }

        const reader = new FileReader();
        reader.onload = () => {
            try {
                this.uploadedWorkflow = JSON.parse(reader.result as string) as WorkflowModel;
            } catch (error) {
                this._toast.error('Invalid JSON file: ' + error);
            }
        };
        reader.onerror = () => this._toast.error('Error reading file');
        reader.readAsText(file);
    }

    importWorkflow() {
        this._workflows.importWorkflow(this.uploadWorkflowName, this.uploadWorkflowGroup, this.uploadedWorkflow).subscribe({
            next: () => {
                this.uploadWorkflowName = '';
                this.uploadWorkflowGroup = '';
                this._toast.success('Successfully uploaded workflow "' + this.uploadWorkflowName + '"', 'Upload Successful');
                this.getWorkflowDefs();
            },
            error: err => this._toast.error(err.error)
        });
    }

    exportVersion(workflowId: string, version: string) {
        this._workflows.getWorkflow(workflowId, parseInt(version, 10)).subscribe({
            next: workflow => {
                const blob = new Blob([JSON.stringify(workflow, null, 2)], {type: 'application/json'});
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = this.workflowDefs[workflowId].name + '_v' + version;
                a.click();
                URL.revokeObjectURL(a.href);
            },
            error: err => this._toast.error(err.error)
        });
    }
}
