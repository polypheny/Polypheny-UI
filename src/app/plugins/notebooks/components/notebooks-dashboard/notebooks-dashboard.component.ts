import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {NotebooksService} from '../../services/notebooks.service';
import {NotebooksContentService} from '../../services/notebooks-content.service';
import {ToastService} from '../../../../components/toast/toast.service';
import {interval, Subscription} from 'rxjs';
import {SessionResponse, StatusResponse} from '../../models/notebooks-response.model';
import {ModalDirective} from 'ngx-bootstrap/modal';

@Component({
    selector: 'app-notebooks-dashboard',
    templateUrl: './notebooks-dashboard.component.html',
    styleUrls: ['./notebooks-dashboard.component.scss']
})
export class NotebooksDashboardComponent implements OnInit, OnDestroy {
    @ViewChild('terminateSessionsModal') public terminateSessionsModal: ModalDirective;
    @ViewChild('terminateUnusedSessionsModal') public terminateUnusedSessionsModal: ModalDirective;
    @ViewChild('restartContainerModal') public restartContainerModal: ModalDirective;
    @ViewChild('destroyContainerModal') public destroyContainerModal: ModalDirective;
    @ViewChild('startContainerModal') public startContainerModal: ModalDirective;


    private subscriptions = new Subscription();
    sessions: SessionResponse[] = [];
    hasUnusedSessions = false;
    notebookPaths: string[] = [];
    isPreferredSession: boolean[] = [];
    deleting = false;
    serverStatus: StatusResponse;
    pluginLoaded = false;
    sessionSubscription = null;
    instances = [];

    constructor(private _notebooks: NotebooksService,
                private _content: NotebooksContentService,
                private _toast: ToastService) {
    }

    ngOnInit(): void {
        this.getServerStatus();
        this._notebooks.getDockerInstances().subscribe(
            res => {
                this.instances = <[]>res;
            },
            err => {
                console.log(err);
            }
        );
        this.getPluginStatus();

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
        this._notebooks.getDockerInstances().subscribe(
            res => {
                this.instances = <[]>res;
            },
            err => {
                console.log(err);
            }
        );
    }

    createContainer(id: number) {
        this._notebooks.createContainer(id).subscribe(
            res => this.startContainerModal.hide(),
            err => console.log(err),
        ).add(() => this.getServerStatus());
    }

    destroyContainer() {
        this._notebooks.destroyContainer().subscribe(
            res => this.destroyContainerModal.hide(),
            err => console.log(err),
        ).add(() => this.getServerStatus());
    }

    restartContainer() {
        this.serverStatus = null;
        this.restartContainerModal.hide();
        this._notebooks.restartContainer().subscribe(
            res => {
                this._toast.success('Successfully restarted the container.');
                this._content.updateSessions();
                this._content.update();
            },
            err => {
                this._toast.error('An error occurred while restarting the container!');
            }).add(() => this.getServerStatus());
    }

    getPluginStatus() {
        this._notebooks.getPluginStatus().subscribe(
            () => {
                this.pluginLoaded = true;
            }, () => {
                this.pluginLoaded = false;
                this._content.setAutoUpdate(false);
                this.subscriptions.unsubscribe();
            });
    }

    getServerStatus() {
        this._notebooks.getStatus().subscribe(
            res => {
                this.serverStatus = res
                this._content.updateAvailableKernels();
                this._content.updateSessions();
                this.subscribeToSessionChanges();
            },
            () => {
                this.serverStatus = null;
                this.unsubscribeFromSessionChanges();
                this._content.setAutoUpdate(false);
                this.getPluginStatus();
            });
    }

}
