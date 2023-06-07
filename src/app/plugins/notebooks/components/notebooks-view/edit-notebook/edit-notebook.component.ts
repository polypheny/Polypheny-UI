import {Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild} from '@angular/core';
import {NotebookContent, SessionResponse} from '../../../models/notebooks-response.model';
import {NotebooksService} from '../../../services/notebooks.service';
import {NotebooksSidebarService} from '../../../services/notebooks-sidebar.service';
import {ToastService} from '../../../../../components/toast/toast.service';
import {NotebookWrapper} from '../../../models/notebook.model';
import {ActivatedRoute, Router} from '@angular/router';
import {NotebooksContentService} from '../../../services/notebooks-content.service';
import {Subscription} from 'rxjs';
import {NotebooksWebSocket} from '../../../services/notebooks-webSocket';
import {WebuiSettingsService} from '../../../../../services/webui-settings.service';
import * as uuid from 'uuid';
import {ModalDirective} from 'ngx-bootstrap/modal';

@Component({
    selector: 'app-edit-notebook',
    templateUrl: './edit-notebook.component.html',
    styleUrls: ['./edit-notebook.component.scss']
})
export class EditNotebookComponent implements OnInit, OnChanges, OnDestroy {
    @Input() sessionId: string;
    path: string;
    name: string;
    nb: NotebookWrapper;
    session: SessionResponse;
    private socket: NotebooksWebSocket;
    private subscriptions = new Subscription();
    @ViewChild('deleteNotebookModal', {static: false}) public deleteNotebookModal: ModalDirective;
    deleting = false;

    constructor(
        private _notebooks: NotebooksService,
        public _sidebar: NotebooksSidebarService,
        private _content: NotebooksContentService,
        private _toast: ToastService,
        private _router: Router,
        private _route: ActivatedRoute,
        private _settings: WebuiSettingsService) {
    }

    ngOnInit(): void {
        this.subscriptions.add(
            this._content.onSessionsChange().subscribe(sessions => this.updateSession(sessions))
        );

    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.sessionId) {
            // Handle changes to sessionId
            this._notebooks.getSession(this.sessionId).subscribe(session => {
                this.session = session;
                this.path = this._notebooks.getPathFromSession(session);
                this.name = this._notebooks.getNameFromSession(session);
                const urlPath = this._route.snapshot.url.map(segment => decodeURIComponent(segment.toString())).join('/');
                if (this.path !== urlPath) {
                    console.log('path does not match url');
                    this.closeEdit();
                    return;
                }
                this._content.setPreferredSessionId(this.path, this.sessionId);
                this.loadNotebook();
                this.connectToKernel();
            }, err => {
                console.log('session does not exist!');
                this.closeEdit();

            });
        }
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }

    closeEdit() {
        this._router.navigate([], {
            relativeTo: this._route,
            queryParams: null,
            replaceUrl: true
        });
    }

    deleteNotebook(): void {
        this.deleting = true;
        const ids = this._content.getSessionsForNotebook(this.path).map(s => s.id);
        this._notebooks.deleteSessions(ids).subscribe().add(() => {
            this._content.removeSessions(ids);
        });
        this._notebooks.deleteFile(this.path).subscribe().add(() => {
            this._content.update();
            this.deleting = false;
            this.deleteNotebookModal.hide();
            this.closeEdit();
        });

    }

    private updateSession(sessions: SessionResponse[]) {
        this.session = sessions.find(session => session.id === this.sessionId);
        if (!this.session) {
            this._toast.error(`The session was closed`); // TODO: save notebook
            this.closeEdit();
            return;
        }
        const path = this._notebooks.getPathFromSession(this.session);
        if (this.path !== path) {
            if (this.path) {
                this._toast.warn(`The path to the notebook has changed`, 'Info');
            }
            this.path = path;
            const queryParams = {session: this.sessionId};
            this._router.navigate([this._sidebar.baseUrl].concat(path.split('/')), {queryParams});

        }
    }

    private loadNotebook() {
        this._notebooks.getContents(this.path, true).subscribe(res => {
            if (res.type === 'notebook') {
                this.nb = new NotebookWrapper(<NotebookContent>res);
            }
        }, error => {
            console.log('error while reading notebook', this.path);
        }).add(() => {
            if (!this.nb) {
                this._toast.error(`Could not read content of ${this.path}`);
                this.closeEdit();
            }
        });
    }

    private connectToKernel() {
        console.log('connecting...');
        this.socket = new NotebooksWebSocket(this._settings, this.session.kernel.id);
        this.socket.onMessage().subscribe(msg => {
            console.log('received message:', msg);
        }, err => {
            console.log('received error: ' + err);
        }, () => {
            this.socket = null;
        });
    }


    sendCode(code: string) {
        const id = uuid.v4();
        const msg = {
            uuid: id,
            type: 'code',
            content: code
        };
        this.socket.sendMessage(msg);
    }

}
