import {Component, OnInit, ViewChild} from '@angular/core';
import {NotebooksSidebarService} from '../../../services/notebooks-sidebar.service';
import {Content, FileContent, KernelSpec, KernelSpecs, SessionResponse} from '../../../models/notebooks-response.model';
import {NotebooksService} from '../../../services/notebooks.service';
import {Router} from '@angular/router';
import {ToastService} from '../../../../../components/toast/toast.service';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {ModalDirective} from 'ngx-bootstrap/modal';
import * as uuid from 'uuid';

@Component({
    selector: 'app-manage-notebook',
    templateUrl: './manage-notebook.component.html',
    styleUrls: ['./manage-notebook.component.scss']
})
export class ManageNotebookComponent implements OnInit {

    content: Content;
    sessions: SessionResponse[];
    availableKernels: KernelSpec[] = [];
    selectedSession: SessionResponse;
    statusText = 'No kernel running';
    renameFileForm: FormGroup;
    terminateSessionForm: FormGroup;
    connectSessionForm: FormGroup;
    createKernelForm: FormGroup;
    @ViewChild('renameFileModal', {static: false}) public renameFileModal: ModalDirective;
    @ViewChild('terminateSessionModal', {static: false}) public terminateSessionModal: ModalDirective;
    @ViewChild('connectSessionModal', {static: false}) public connectSessionModal: ModalDirective;
    @ViewChild('createKernelModal', {static: false}) public createKernelModal: ModalDirective;

    constructor(
        private _router: Router,
        public _sidebar: NotebooksSidebarService,
        private _notebooks: NotebooksService,
        private _toast: ToastService,) {
    }

    ngOnInit(): void {
        this.initForms();

        this._sidebar.onContentChange().subscribe(content => {
            this.content = content;
            this.renameFileForm.patchValue({name: this.content.name});
        });
        this._sidebar.onSessionsChange().subscribe(sessions => this.updateSessions(sessions));
        this._sidebar.onKernelSpecsChange().subscribe(specs => this.updateAvailableKernels(specs));
    }

    private initForms() {
        this.renameFileForm = new FormGroup({
            name: new FormControl('', [
                Validators.pattern('[a-zA-Z0-9_. \-]*[a-zA-Z0-9_\-]'), // last symbol can't be '.' or ' '
                Validators.maxLength(50),
                Validators.required
            ])
        });
        this.terminateSessionForm = new FormGroup({
            session: new FormControl('', Validators.required),
        });
        this.connectSessionForm = new FormGroup({
            session: new FormControl('', Validators.required),
        });
        this.createKernelForm = new FormGroup({
            kernel: new FormControl('', Validators.required),
        });
        this.terminateSessionForm.get('session').valueChanges.subscribe(val => this.updateSelectedSession(val));
        this.connectSessionForm.get('session').valueChanges.subscribe(val => this.updateSelectedSession(val));
    }

    deleteFile() {
        this._notebooks.deleteFile(this._sidebar.path).subscribe(res => {
                const path = this._sidebar.type === 'directory' ? this._sidebar.parentPath : this._sidebar.currentPath;
                this._router.navigate([this._sidebar.baseUrl].concat(path.split('/')));
            },
            err => {
                this._toast.error(err.error.message, `Could not delete ${this._sidebar.path}`);
            }
        );
    }

    duplicateFile() {
        this._notebooks.duplicateFile(this._sidebar.path, this._sidebar.currentPath).subscribe(res => this._sidebar.updateSidebar(),
            err => this._toast.error(err.error.message, `Could not duplicate ${this._sidebar.path}`));
    }

    renameFile() {
        if (!this.renameFileForm.valid) {
            return;
        }
        let fileName = this.renameFileForm.value.name;
        if (this.content.type === 'notebook' && !fileName.endsWith('.ipynb')) {
            fileName += '.ipynb';
        }
        const path = this._sidebar.type === 'directory' ? this._sidebar.parentPath : this._sidebar.currentPath;
        this._sidebar.moveFile(this._sidebar.path, path + '/' + fileName);
        this.renameFileModal.hide();
    }

    downloadFile() {
        this._notebooks.getContents(this._sidebar.path).subscribe(res => {
            const file = <FileContent>res;
            this.download(file.content, file.name, file.format);
        });
    }

    connect() {
        console.log('connecting...');
        this.connectSessionModal.hide();
        this.openSession(this.connectSessionForm.value.session);
    }

    create() {
        console.log('creating...');
        this.createKernelModal.hide();
        const id = '$' + uuid.v4(); // not session id, only for distinguishing multiple sessions for the same notebook
        this._notebooks.createSession(this.content.name + id, this.content.path + id,
            this.createKernelForm.value.kernel).subscribe(res => {
                this._sidebar.addSession(res);
                this.openSession(res.id);
                this._sidebar.updateSidebar();
        },
                err => this._toast.error(err.error.message, `Could not create session`));
    }

    terminateSession() {
        console.log('shut down...');
        this.deleteSession(this.terminateSessionForm.value.session);
        this.terminateSessionModal.hide();
    }

    terminateAllSessions() {
        console.log('shut down all...');
        const ids = this.sessions.map(session => session.id);
        for (const id of ids.slice(0, -1)) {
            console.log('false:', id);
            this.deleteSession(id, false);
        }
        console.log('true:', ids[ids.length-1]);
        this.deleteSession(ids[ids.length-1], true); // only update UI after the last deletion
        this.terminateSessionModal.hide();
    }

    private download(content: string, name: string, format: string) {
        let blob: Blob;
        if (format === 'base64') {
            // https://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript
            const byteCharacters = atob(content);
            const byteNumbers = new Array(byteCharacters.length);

            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            blob = new Blob([new Uint8Array(byteNumbers)], {type: 'application/octet-stream'});
        } else {
            blob = new Blob([content], {type: 'text/plain'});
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.style.display = 'none';

        a.click();
        URL.revokeObjectURL(url);
    }

    private deleteSession(id: string, update=true) {
        this._notebooks.deleteSession(id).subscribe(res => {
                if (update) {
                    this._sidebar.updateSidebar();
                }
            },
            err => {
                this._toast.error(err.error.message, `Could not shut down ${id}`);
            });
    }

    private updateSessions(sessions: SessionResponse[]) {
        if (this.content.type === 'notebook') {
            this.sessions = sessions.filter(session => session.path.startsWith(this.content.path));
            const s = this.sessions.length > 1 ? 's' : '';
            if (this.sessions.length > 0) {
                this.statusText = this.sessions.length + ' kernel' + s + ' running';
                this.connectSessionForm.patchValue({session: this.sessions[0].id});
                this.terminateSessionForm.patchValue({session: this.sessions[0].id});
            } else {
                this.statusText = 'No kernel running';
            }
        }
    }

    private openSession(sessionId: string) {
        const queryParams = {session: sessionId};
        this._router.navigate([this._sidebar.baseUrl].concat(this.content.path.split('/')), {queryParams});
    }

    private updateAvailableKernels(kernelSpecs: KernelSpecs) {
        if (kernelSpecs == null) {
            this.availableKernels = [];
        } else {
            this.availableKernels = Object.values(kernelSpecs.kernelspecs);
            this.createKernelForm.patchValue({kernel: kernelSpecs.default});
        }
    }

    private updateSelectedSession(sessionId: string) {
        this.selectedSession = this.sessions.find(session => session.id === sessionId);
    }

}
