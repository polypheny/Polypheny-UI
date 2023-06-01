import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {NotebooksService} from '../../services/notebooks.service';
import {ToastService} from '../../../../components/toast/toast.service';
import {WebuiSettingsService} from '../../../../services/webui-settings.service';
import {ActivatedRoute, Router, UrlSegment} from '@angular/router';
import {ModalDirective} from 'ngx-bootstrap/modal';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {finalize, mergeMap} from 'rxjs/operators';
import {EMPTY, Subscription} from 'rxjs';
import {NotebooksSidebarService} from '../../services/notebooks-sidebar.service';
import {NotebooksContentService} from '../../services/notebooks-content.service';

@Component({
    selector: 'app-notebooks',
    templateUrl: './notebooks.component.html',
    styleUrls: ['./notebooks.component.scss']
})
export class NotebooksComponent implements OnInit, OnDestroy {

    @ViewChild('addNotebookModal', {static: false}) public addNotebookModal: ModalDirective;
    @ViewChild('uploadNotebookModal', {static: false}) public uploadNotebookModal: ModalDirective;
    createFileForm: FormGroup;
    uploadFileForm: FormGroup;
    inputFileName = 'Choose file(s)';
    editNotebookSession = '';
    private subscriptions = new Subscription();

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
        console.log('init notebook');
        this._route.url.subscribe(url => {
            this.initForms();
            this.update(url);
        });
        this._route.queryParams.subscribe(params => this.updateSessionId(params['session']));

        this.initForms();

        const sub1 = this._sidebar.onCurrentFileMoved().subscribe(
            to => this._router.navigate([this._sidebar.baseUrl].concat(to.split('/')))
        );
        const sub2 = this._sidebar.onAddButtonClicked().subscribe(() => this.addNotebookModal.show());
        const sub3 = this._sidebar.onUploadButtonClicked().subscribe(() => this.uploadNotebookModal.show());
        const sub4 = this._content.onInvalidLocation().subscribe(() => this.onPageNotFound());

        this.subscriptions.add(sub1);
        this.subscriptions.add(sub2);
        this.subscriptions.add(sub3);
        this.subscriptions.add(sub4);

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
        });

        this.uploadFileForm = new FormGroup({
            files: new FormControl('',),
            fileList: new FormControl('', [Validators.required])
        });
    }

    private update(url: UrlSegment[]) {

        this._content.updateLocation(url);
    }

    private updateSessionId(id: string) {
        if (!id) {
            this.editNotebookSession = '';
            return;
        }
        if (this._content.isValidSessionId(id, true)) {
            this.editNotebookSession = id;
        } else {
            this.editNotebookSession = '';
            this._router.navigate([], {
                relativeTo: this._route,
                queryParams: null,
                replaceUrl: true
            });
        }
    }

    createFile() {
        if (!this.createFileForm.valid) {
            return;
        }
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
        const path = this._content.directoryPath;
        this._notebooks.createFileWithExtension(path, val.type, ext).pipe(
            mergeMap(res => val.name === '' ? EMPTY :
                this._notebooks.moveFile(res.path, path + '/' + fileName)
            ),
            finalize(() => {
                this._content.update();
                //this._sidebar.updateSidebar()
            })
        ).subscribe(res => {                              // after renaming file
        }, err => {
            this._toast.error(err.error.message, `Creation of '${fileName}' failed`);
        });
        this.addNotebookModal.hide();
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
                            this._toast.warn(`An error occurred while uploading ${file.name}`, 'File could not be uploaded');
                        });
                },
                false
            );
            reader.readAsDataURL(file);
        }
        this.uploadNotebookModal.hide();
    }

    private onPageNotFound() {
        this._router.navigate([this._sidebar.baseUrl, 'notebooks']);
    }
}
