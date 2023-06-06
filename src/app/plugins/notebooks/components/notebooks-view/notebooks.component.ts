import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {NotebooksService} from '../../services/notebooks.service';
import {ToastService} from '../../../../components/toast/toast.service';
import {WebuiSettingsService} from '../../../../services/webui-settings.service';
import {ActivatedRoute, Router, UrlSegment} from '@angular/router';
import {ModalDirective} from 'ngx-bootstrap/modal';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {mergeMap, tap} from 'rxjs/operators';
import {EMPTY, Observable, of, Subscription} from 'rxjs';
import {NotebooksSidebarService} from '../../services/notebooks-sidebar.service';
import {NotebooksContentService} from '../../services/notebooks-content.service';
import {KernelSpec, KernelSpecs, SessionResponse} from '../../models/notebooks-response.model';

@Component({
    selector: 'app-notebooks',
    templateUrl: './notebooks.component.html',
    styleUrls: ['./notebooks.component.scss']
})
export class NotebooksComponent implements OnInit, OnDestroy {

    @ViewChild('addNotebookModal', {static: false}) public addNotebookModal: ModalDirective;
    @ViewChild('uploadNotebookModal', {static: false}) public uploadNotebookModal: ModalDirective;
    @ViewChild('createSessionModal', {static: false}) public createSessionModal: ModalDirective;
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
        private _settings: WebuiSettingsService) {
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

        this.subscriptions.add(sub1);
        this.subscriptions.add(sub2);
        this.subscriptions.add(sub3);
        this.subscriptions.add(sub4);
        this.subscriptions.add(sub5);
        this.subscriptions.add(sub6);

        this._content.updateAvailableKernels();
        this._content.updateSessions();

        this._sidebar.open();
    }

    ngOnDestroy() {
        this._sidebar.close();
        this.subscriptions.unsubscribe();
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
            files: new FormControl('',),
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
            canConnect: new FormControl(true)
        });
        this.createSessionForm.get('isNew').valueChanges.subscribe((isNew: boolean) => {
            console.log('isNew?', isNew);
            if (isNew) {
                console.log('kernel val:', this.createSessionForm.value.kernel);
                this.createSessionForm.patchValue({kernel: this.availableKernels[0].name});
            } else {
                console.log('session val:', this.createSessionForm.value.session);
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
            // kernel chooser modal (with connect ability)
            this.createSessionForm.patchValue({
                name: name,
                path: path,
                sessions: sessions,
                session: sessions[0].id,
                canConnect: true
            });
            this.createSessionModal.show();
        } else {
            this.loading = true;

            this._content.getSpecifiedKernel(path).pipe(
                mergeMap(res => {
                        if (res) {
                            console.log('kernel:', res.name);
                            return this.startAndOpenNotebook(name, path, res.name);
                        }
                        this.loading = false;
                        console.log('no kernel specified');
                        // kernel chooser modal (without connect ability)
                        this.createSessionForm.patchValue({
                            name: name,
                            path: path,
                            kernel: this.availableKernels[0].name,
                            isNew: true,
                            canConnect: false
                        });
                        this.createSessionModal.show();
                        return EMPTY;
                    }
                )
            ).subscribe(res => {
                },
                err => {
                    this._toast.error('Cannot open Notebook. The file might be corrupted.');
                    this.openManagePage(path);
                }
            ).add(() => this.loading = false);
        }
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

    private updateSessionId(id: string, path: string) {
        this.editNotebookSession = (id?.length === 36) ? id : '';
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
                    //return (val.name === '' ? EMPTY : this._notebooks.moveFile(res.path, path));
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
            this.creating = false;
        });
    }

    onFileChange(files) {
        if (files === null || files.length < 1) {
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
                            this._toast.warn(`An error occurred while uploading ${file.name}:\n${err.error}`, 'File could not be uploaded');
                        });
                },
                false
            );
            reader.readAsDataURL(file);
        }
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
        if (this.editNotebookSession === '') {
            this._router.navigate([this._sidebar.baseUrl, 'notebooks']);
        }
    }
}
