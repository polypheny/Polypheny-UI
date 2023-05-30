import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {NotebooksService} from '../../services/notebooks.service';
import {ToastService} from '../../../../components/toast/toast.service';
import {WebuiSettingsService} from '../../../../services/webui-settings.service';
import {ActivatedRoute, Router, UrlSegment} from '@angular/router';
import {ModalDirective} from 'ngx-bootstrap/modal';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {finalize, mergeMap} from 'rxjs/operators';
import {EMPTY} from 'rxjs';
import {NotebooksSidebarService} from '../../services/notebooks-sidebar.service';

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

    constructor(
        private _router: Router,
        private _route: ActivatedRoute,
        private _notebooks: NotebooksService,
        public _sidebar: NotebooksSidebarService,
        private _toast: ToastService,
        private _settings: WebuiSettingsService) {
    }

    ngOnInit(): void {
        this._route.url.subscribe(url => {
            this.initForms();
            this.update(url);
        });
        this._route.queryParams.subscribe(params => this.updateSessionId(params['session']));

        this.initForms();

        this._sidebar.onCurrentFileMoved().subscribe(
            to => this._router.navigate([this._sidebar.baseUrl].concat(to.split('/')))
        );
        this._sidebar.onAddButtonClicked().subscribe(() => this.addNotebookModal.show());
        this._sidebar.onUploadButtonClicked().subscribe(() => this.uploadNotebookModal.show());
        this._sidebar.onInvalidLocation().subscribe(() => this.onPageNotFound());
        this._sidebar.open();

        this.update(this._route.snapshot.url);
        this.updateSessionId(this._route.snapshot.queryParams['session']);
    }

    ngOnDestroy() {
        this._sidebar.close();
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

        this._sidebar.update(url);
    }

    private updateSessionId(id: string) {
        console.log('updating session...', id);
        if (this._sidebar.isValidSessionId(id, this._sidebar.path)) {
            console.log('valid');
            this.editNotebookSession = id;
        } else {
            console.log('invalid');
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
        this._notebooks.createFileWithExtension(this._sidebar.currentPath, val.type, ext).pipe(
            mergeMap(res => val.name === '' ? EMPTY :
                this._notebooks.moveFile(res.path, this._sidebar.currentPath + '/' + fileName)
            ),
            finalize(() => this._sidebar.updateSidebar())
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
                    this._notebooks.updateFile(this._sidebar.currentPath + '/' + file.name, base64, 'base64', 'file')
                        .subscribe(res => {
                            this._sidebar.updateSidebar();
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
