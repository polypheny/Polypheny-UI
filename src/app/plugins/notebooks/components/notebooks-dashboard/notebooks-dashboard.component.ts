import {Component, EventEmitter, inject, OnDestroy, OnInit, Output, ViewChild} from '@angular/core';
import {NotebooksService} from '../../services/notebooks.service';
import {NotebooksContentService} from '../../services/notebooks-content.service';
import {interval, Subscription} from 'rxjs';
import {SessionResponse, StatusResponse} from '../../models/notebooks-response.model';
import {ModalDirective} from 'ngx-bootstrap/modal';
import {ToasterService} from '../../../../components/toast-exposer/toaster.service';
import {cilMediaPlay, cilReload, cilTrash} from '@coreui/icons';
import {DockerInstanceInfo} from '../../../../models/docker.model';

@Component({
    selector: 'app-notebooks-dashboard',
    templateUrl: './notebooks-dashboard.component.html',
    styleUrls: ['./notebooks-dashboard.component.scss'],
    standalone: false
})
export class NotebooksDashboardComponent implements OnInit, OnDestroy {
    @Output() serverRunning = new EventEmitter<boolean>(false);

    @ViewChild('terminateSessionsModal') public terminateSessionsModal: ModalDirective;
    @ViewChild('terminateUnusedSessionsModal') public terminateUnusedSessionsModal: ModalDirective;
    @ViewChild('restartContainerModal') public restartContainerModal: ModalDirective;
    @ViewChild('destroyContainerModal') public destroyContainerModal: ModalDirective;
    @ViewChild('startContainerModal') public startContainerModal: ModalDirective;

    private readonly _notebooks = inject(NotebooksService);
    private readonly _content = inject(NotebooksContentService);
    private readonly _toast = inject(ToasterService);

    icons = {cilReload, cilTrash, cilMediaPlay};
    private subscriptions = new Subscription();
    sessions: SessionResponse[] = [];
    hasUnusedSessions = false;
    notebookPaths: string[] = [];
    isPreferredSession: boolean[] = [];
    creating = false;
    deleting = false;
    serverStatus: StatusResponse;
    pluginLoaded = false;
    sessionSubscription = null;
    instances: DockerInstanceInfo[] = [];
    connectedInstance: DockerInstanceInfo | null = null;

    constructor() {
    }

    ngOnInit(): void {
        this.getServerStatus();
        this._notebooks.getDockerInstances().subscribe({
            next: res => {
                this.instances = res;
            },
            error: err => {
                console.log(err);
            }
        });
        this.getPluginStatus();
        this.updateDockerInstanceInfo();

        const sub = interval(10000).subscribe(() => {
            this.getServerStatus();
        });
        this.subscriptions.add(sub);
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    subscribeToSessionChanges() {
        if (this.sessionSubscription !== null) {
            return;
        }
        this.sessionSubscription = this._content.onSessionsChange().subscribe(res => {
            this.updateSessions(res);
            this.hasUnusedSessions = res.some(session => session.kernel?.connections === 0);
        });
    }

    unsubscribeFromSessionChanges() {
        if (this.sessionSubscription !== null) {
            this.sessionSubscription.unsubscribe();
            this.sessionSubscription = null;
        }
    }

    terminateSessions(onlyUnused = false): void {
        this.deleting = true;
        this._content.deleteAllSessions(onlyUnused).subscribe().add(() => {
            this.deleting = false;
            this.terminateSessionsModal.hide();
            this.terminateUnusedSessionsModal.hide();
        });
    }

    updateSessions(sessions: SessionResponse[]) {
        this.sessions = sessions.slice().sort((a, b) => {
            if (a.path < b.path) {
                return -1;
            } else {
                return a.path > b.path ? 1 : 0;
            }
        });
        const paths = this.sessions.map(s => this._notebooks.getPathFromSession(s));
        this.notebookPaths = paths.map(p => p.replace('notebooks/', '')
        .replace(/\//g, '/\u200B')); // zero-width space => allow soft line breaks after '/'
        this.isPreferredSession = this.sessions.map((s, i) =>
            this._content.getPreferredSessionId(paths[i]) === s.id
        );
    }

    showStartContainerModal() {
        this._notebooks.getDockerInstances().subscribe({
            next: res => {
                this.instances = <[]>res;
            },
            error: err => {
                console.log(err);
            }
        });
    }

    createContainer(id: number) {
        this.creating = true;
        this._notebooks.createContainer(id).subscribe({
            next: res => {
                this.startContainerModal.hide();
                this.creating = false;
            },
            error: err => {
                this.creating = false;
                console.log(err);
            }
        }).add(() => {
            this.getServerStatus();
            this.updateDockerInstanceInfo();
        });
    }

    destroyContainer() {
        this._notebooks.destroyContainer().subscribe({
            next: res => this.destroyContainerModal.hide(),
            error: err => console.log(err),
        }).add(() => this.getServerStatus());
    }

    restartContainer() {
        this.serverStatus = null;
        this.serverRunning.emit(false);
        this.restartContainerModal.hide();
        this._notebooks.restartContainer().subscribe({
            next: () => {
                this._toast.success('Successfully restarted the container.');
                this._content.updateSessions();
                this._content.update();
            },
            error: err => {
                console.log('server restart error', err);
                this._toast.error('An error occurred while restarting the container!');
            }
        }).add(() => {
            this.getServerStatus();
            this.updateDockerInstanceInfo();
        });
    }

    getPluginStatus() {
        this._notebooks.getPluginStatus().subscribe({
            next: res => {
                this.pluginLoaded = true;
            }, error: () => {
                this.pluginLoaded = false;
                this._content.setAutoUpdate(false);
                this.subscriptions.unsubscribe();
            }
        });
    }

    getServerStatus() {
        this._notebooks.getStatus().subscribe({
            next: res => {
                this.serverRunning.emit(res != null);
                this.serverStatus = res;
                this._content.updateAvailableKernels();
                this._content.updateSessions();
                this.subscribeToSessionChanges();
            },
            error: () => {
                this.serverStatus = null;
                this.serverRunning.emit(false);
                this.unsubscribeFromSessionChanges();
                this._content.setAutoUpdate(false);
                this.getPluginStatus();
            }
        });
    }

    private updateDockerInstanceInfo() {
        this._notebooks.getDockerInstance().subscribe({
            next: res => this.connectedInstance = res
        });
    }

}
