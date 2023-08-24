import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {NotebooksService} from '../services/notebooks.service';
import {ToastService} from '../../../components/toast/toast.service';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {
    ActivatedRoute,
    ActivatedRouteSnapshot,
    CanDeactivate,
    Router,
    RouterStateSnapshot,
    UrlSegment
} from '@angular/router';
import {ModalDirective} from 'ngx-bootstrap/modal';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {mergeMap, tap} from 'rxjs/operators';
import {EMPTY, Observable, of, Subscription} from 'rxjs';
import {NotebooksSidebarService} from '../services/notebooks-sidebar.service';
import {NotebooksContentService} from '../services/notebooks-content.service';
import {KernelSpec, KernelSpecs, SessionResponse} from '../models/notebooks-response.model';
import {LoadingScreenService} from '../../../components/loading-screen/loading-screen.service';
import {ComponentCanDeactivate} from '../services/unsaved-changes.guard';
import {EditNotebookComponent} from './edit-notebook/edit-notebook.component';

@Component({
    selector: 'app-notebooks',
    templateUrl: './notebooks.component.html',
    styleUrls: ['./notebooks.component.scss']
})
export class NotebooksComponent implements OnInit, OnDestroy, CanDeactivate<ComponentCanDeactivate> {

    @ViewChild('addNotebookModal') public addNotebookModal: ModalDirective;
    @ViewChild('uploadNotebookModal') public uploadNotebookModal: ModalDirective;
    @ViewChild('createSessionModal') public createSessionModal: ModalDirective;
    @ViewChild('editNotebook') public editNotebook: EditNotebookComponent;
    @ViewChild('fileInput') fileInput: ElementRef;
    createFileForm: FormGroup;
    uploadFileForm: FormGroup;
    createSessionForm: FormGroup;
    inputFileName = 'Choose file(s)';
    editNotebookSession = '';
    availableKernels: KernelSpec[] = [];
    selectedSession: SessionResponse; // session selected in the createSessionModal
    private subscriptions = new Subscription();
    creating = false;
    loading = false;

    constructor(
        private _router: Router,
        private _route: ActivatedRoute,
        private _notebooks: NotebooksService,
        public _sidebar: NotebooksSidebarService,
        public _content: NotebooksContentService,
        private _toast: ToastService,
        private _settings: WebuiSettingsService,
        private _loading: LoadingScreenService) {
    }

    ngOnInit(): void {
        this._route.url.subscribe(url => {
            this.update(url);
        });
        this._route.queryParams.subscribe(params =>
            this.editNotebookSession = (params['session']?.length === 36) ? params['session'] : '');

        this.initForms();

        const sub1 = this._sidebar.onCurrentFileMoved().subscribe(
            to => {
                if (this.editNotebookSession === '') {
                    this._router.navigate([this._sidebar.baseUrl].concat(to.split('/')),);
                }
            }
        );
        const sub2 = this._sidebar.onAddButtonClicked().subscribe(() => this.addNotebookModal.show());
        const sub3 = this._sidebar.onUploadButtonClicked().subscribe(() => this.uploadNotebookModal.show());
        const sub4 = this._sidebar.onNotebookClicked().subscribe(([t, n, $e]) => this.notebookClicked(n));
        const sub5 = this._content.onInvalidLocation().subscribe(() => this.onPageNotFound());
        const sub6 = this._content.onKernelSpecsChange().subscribe(specs => this.updateAvailableKernels(specs));
        const sub7 = this._content.onServerUnreachable().subscribe(() => this.onServerUnreachable());

        this.subscriptions.add(sub1);
        this.subscriptions.add(sub2);
        this.subscriptions.add(sub3);
        this.subscriptions.add(sub4);
        this.subscriptions.add(sub5);
        this.subscriptions.add(sub6);
        this.subscriptions.add(sub7);

        this._content.updateAvailableKernels();
        this._content.updateSessions();
        this._content.setAutoUpdate(true);

        this._sidebar.open();
    }

    ngOnDestroy() {
        this._content.setAutoUpdate(false);
        this._sidebar.close();
        this.subscriptions.unsubscribe();
    }

    canDeactivate(component: ComponentCanDeactivate, currentRoute: ActivatedRouteSnapshot,
                  currentState: RouterStateSnapshot, nextState: RouterStateSnapshot): Observable<boolean> | boolean {
        const forced = nextState.root.queryParams?.forced;
        if (!forced && this.editNotebookSession && this.editNotebook && !this.editNotebook.canDeactivate()) {
            return this.editNotebook.confirmClose();
        }
        return true;
    }


    private initForms() {
        this.createFileForm = new FormGroup({
            name: new FormControl('', [
                Validators.pattern('([a-zA-Z0-9_. \-]*[a-zA-Z0-9_\-])?'), // last symbol can't be '.' or ' '
                Validators.maxLength(50)]),
            type: new FormControl('notebook'),
            ext: new FormControl('.txt'),
            kernel: new FormControl('')
        });

        this.uploadFileForm = new FormGroup({
            fileList: new FormControl('', [Validators.required])
        });

        this.createSessionForm = new FormGroup({
            isNew: new FormControl(false),
            session: new FormControl(''),
            kernel: new FormControl(''),
            sessions: new FormControl([]),
            // Variables that cannot be set directly by the user:
            name: new FormControl('', [Validators.required]),
            path: new FormControl('', [Validators.required]),
            canConnect: new FormControl(true),
            canManage: new FormControl(true)
        });
        this.createSessionForm.get('isNew').valueChanges.subscribe((isNew: boolean) => {
            if (isNew) {
                this.createSessionForm.patchValue({kernel: this.availableKernels[0].name});
            } else {
                this.createSessionForm.patchValue({session: this.createSessionForm.value.sessions[0].id});
            }
        });
        this.createSessionForm.get('session').valueChanges.subscribe(sessionId =>
            this.selectedSession = this.createSessionForm.value.sessions.find(session => session.id === sessionId));
    }

    private update(url: UrlSegment[]) {
        this._content.updateLocation(url);
    }

    /**
     * A notebook in the sidebar was clicked
     */
    private notebookClicked(node) {
        const path = node.data.id;
        const name = node.data.name;
        const sessions = this._content.getSessionsForNotebook(path);

        if (sessions.length > 0) {
            this._content.clearNbCache(); // cache is only useful if the specified kernel is not known
            const preferredId = this._content.getPreferredSessionId(path);
            if (sessions.find(s => s.id === preferredId)) {
                // open last used session
                this.openSession(preferredId, path);
                return;
            }
            this.openConnectOrCreateSessionModal(name, path, sessions);
        } else {
            this._loading.show();

            this._content.getSpecifiedKernel(path).pipe(
                mergeMap(res => {
                    if (res) {
                        return this.startAndOpenNotebook(name, path, res.name);
                    }

                    this._loading.hide();
                    this.openCreateSessionModal(name, path);
                    return EMPTY;
                }
                        )
            ).subscribe(
                res => {
                },
                err => {
                    console.log(err);
                    this._toast.error('Failed to open Notebook. The file might be corrupted or does no longer exist.');
                    this.openManagePage(path);
                }
            ).add(() => this._loading.hide());
        }
    }

    private openConnectOrCreateSessionModal(name: string, path: string, sessions: SessionResponse[], canManage = true) {
        this.createSessionForm.patchValue({
            name: name,
            path: path,
            sessions: sessions,
            session: sessions[0].id,
            canConnect: true,
            canManage: canManage
        });
        this.selectedSession = sessions[0];
        this.createSessionModal.show();
    }

    private openCreateSessionModal(name: string, path: string, canManage = true) {
        if (this.availableKernels.length === 0){
            this._toast.warn("No kernels are available.  Is the Jupyter container running?");
            return;
        }
        this.createSessionForm.patchValue({
            name: name,
            path: path,
            kernel: this.availableKernels[0].name,
            isNew: true,
            canConnect: false,
            canManage: canManage
        });
        this.createSessionModal.show();

    }

    /**
     * createSessionModal 'open' button was clicked
     */
    openNotebookClicked() {
        const val = this.createSessionForm.value;
        if (val.isNew) {
            this.creating = true;
            this.startAndOpenNotebook(val.name, val.path, val.kernel).subscribe().add(() => {
                this.createSessionModal.hide();
                this.creating = false;
            });
        } else {
            this.openSession(val.session, val.path);
            this.createSessionModal.hide();
        }

    }

    openManagePage(path: string) {
        this._router.navigate([this._sidebar.baseUrl].concat(path.split('/')));
        this.createSessionModal.hide();
    }

    openChangeSessionModal(name: string, path: string) {
        const sessions = this._content.getSessionsForNotebook(path);

        if (sessions.length > 0) {
            this.openConnectOrCreateSessionModal(name, path, sessions, false);
        } else {
            this.openCreateSessionModal(name, path, false);
        }
    }


    createFile() {
        if (!this.createFileForm.valid) {
            return;
        }
        this.creating = true;
        const val = this.createFileForm.value;
        let fileName = val.name;
        let ext = '.ipynb';
        if (val.type === 'notebook' && !fileName.endsWith(ext)) {
            fileName += ext;
        } else if (val.type === 'file') {
            if (!val.ext.startsWith('.')) {
                this.createFileForm.patchValue({ext: '.' + val.ext});
                val.ext = '.' + val.ext;
            }
            ext = val.ext === '.' ? '' : val.ext;
            fileName += ext;
        }
        let path = this._content.directoryPath + '/' + fileName;
        let name = fileName;
        this._notebooks.createFileWithExtension(this._content.directoryPath, val.type, ext).pipe(
            mergeMap(res => {
                if (val.name === '') {
                    name = res.name;
                    path = res.path;
                    return of({});
                }
                return this._notebooks.moveFile(res.path, path);
            }
                    ), mergeMap(res => {
                        if (val.type !== 'notebook') {
                            return EMPTY;
                        }
                        return this.startAndOpenNotebook(name, path, val.kernel);
                    })
        ).subscribe(res => {
        }, err => {
            this._toast.error(err.error.message, `Creation of '${fileName}' failed`);
        }).add(() => {
            if (val.type !== 'notebook') {
                this._content.update(); // update for notebook happens automatically when navigating
            }
            this.addNotebookModal.hide();
            this.createFileForm.patchValue({name: '', type: 'notebook', ext: '.txt'});
            this.creating = false;
        });
    }

    /**
     * File(s) in upload file input changed
     */
    onFileChange(files) {
        if (files == null || files.length < 1) {
            if (this.fileInput) {
                this.fileInput.nativeElement.value = '';
            }
            this.inputFileName = 'Choose file(s)';
        } else if (files.length === 1) {
            this.inputFileName = files[0].name;
        } else {
            this.inputFileName = files.length + ' files';
        }
        this.uploadFileForm.patchValue({fileList: files});
    }


    uploadFile() {
        if (!this.uploadFileForm.valid) {
            return;
        }
        for (const file of this.uploadFileForm.value.fileList) {
            const reader = new FileReader();
            reader.addEventListener(
                'load',
                (event) => {
                    const base64 = event.target.result.toString().split('base64,', 2)[1];
                    this._notebooks.updateFile(this._content.directoryPath + '/' + file.name, base64, 'base64', 'file')
                        .subscribe(res => {
                            this._content.update();
                        }, err => {
                            this._toast.error(`An error occurred while uploading ${file.name}:\n${err.error}`, 'File could not be uploaded');
                        });
                },
                false
            );
            reader.readAsDataURL(file);
        }
        this.onFileChange(null);
        this.uploadNotebookModal.hide();
    }

    /**
     * Create a new session with the specified kernel and navigate to its edit page
     */
    private startAndOpenNotebook(name: string, path: string, kernel: string): Observable<SessionResponse> {
        return this._notebooks.createSession(name, path, kernel, true).pipe(
            tap(res => {
                this._content.addSession(res);
                this.openSession(res.id, path);
            }
               )
        );
    }

    private openSession(sessionId: string, path: string) {
        const queryParams = {session: sessionId};
        this._router.navigate([this._sidebar.baseUrl].concat(path.split('/')), {queryParams});
    }

    private updateAvailableKernels(kernelSpecs: KernelSpecs) {
        if (kernelSpecs == null) {
            this.availableKernels = [];
        } else {
            this.availableKernels = Object.values(kernelSpecs.kernelspecs);
            this.createFileForm.patchValue({kernel: kernelSpecs.default});
        }
    }

    private onPageNotFound() {
        let queryParams = {};
        if (!this.editNotebook) {
            queryParams = {forced: true};
        }
        this._router.navigate([this._sidebar.baseUrl, 'notebooks'], {queryParams});
    }

    private onServerUnreachable() {
        if (!this._content.isRoot) {
            this._toast.error('Jupyter Server seems to be offline.');
            this._router.navigate([this._sidebar.baseUrl, 'notebooks']);
        }
    }
}
