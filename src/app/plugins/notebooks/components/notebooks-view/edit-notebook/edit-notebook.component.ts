import {Component, Input, OnInit} from '@angular/core';
import {NotebookContent, SessionResponse} from '../../../models/notebooks-response.model';
import {NotebooksService} from '../../../services/notebooks.service';
import {NotebooksSidebarService} from '../../../services/notebooks-sidebar.service';
import {ToastService} from '../../../../../components/toast/toast.service';
import {Notebook} from '../../../models/notebook.model';
import {Router} from '@angular/router';

@Component({
    selector: 'app-edit-notebook',
    templateUrl: './edit-notebook.component.html',
    styleUrls: ['./edit-notebook.component.scss']
})
export class EditNotebookComponent implements OnInit {
    @Input() sessionId: string;
    content: NotebookContent;
    nb: Notebook;
    path: string;
    session: SessionResponse;

    constructor(
        private _notebooks: NotebooksService,
        public _sidebar: NotebooksSidebarService,
        private _toast: ToastService,
        private _router: Router) {
    }

    ngOnInit(): void {
        this.path = this._sidebar.path;
        this.updateContent();
        this._sidebar.onSessionsChange().subscribe(sessions => this.updateSession(sessions));
    }

    closeEdit() {
        this._router.navigate([this._sidebar.baseUrl].concat(this.path.split('/')));
    }

    private updateSession(sessions: SessionResponse[]) {
            this.session = sessions.find(session => session.id === this.sessionId);
            if (!this.session) {
                console.error('could not find session!');
            }
    }

    private updateContent() {
        this._notebooks.getContents(this.path, true).subscribe(res => {
            this.content = <NotebookContent>res;
            this.nb = this.content.content;
        });
    }

}
