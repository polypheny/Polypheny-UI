import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {NotebooksService} from '../../../services/notebooks.service';
import {NotebooksContentService} from '../../../services/notebooks-content.service';
import {ToastService} from '../../../../../components/toast/toast.service';
import {Subscription} from 'rxjs';
import {SessionResponse} from '../../../models/notebooks-response.model';
import {ModalDirective} from 'ngx-bootstrap/modal';

@Component({
    selector: 'app-notebooks-dashboard',
    templateUrl: './notebooks-dashboard.component.html',
    styleUrls: ['./notebooks-dashboard.component.scss']
})
export class NotebooksDashboardComponent implements OnInit, OnDestroy {
    @ViewChild('terminateSessionsModal', {static: false}) public terminateSessionsModal: ModalDirective;

    private subscriptions = new Subscription();
    sessions: SessionResponse[] = [];
    notebookPaths: string[] = [];
    isPreferredSession: boolean[] = [];
    deleting = false;

    constructor(private _notebooks: NotebooksService,
                private _content: NotebooksContentService,
                private _toast: ToastService) {
    }

    ngOnInit(): void {
        const sub1 = this._content.onSessionsChange().subscribe(res => this.updateSessions(res));
        this.subscriptions.add(sub1);
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    terminateSessions(): void {
        this.deleting = true;
        this._notebooks.deleteSessionsByResponse(this.sessions).subscribe().add(() => {
            this._content.updateSessions();
            this.deleting = false;
            this.terminateSessionsModal.hide();
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

}
