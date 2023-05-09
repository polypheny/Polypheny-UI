import {Component, OnDestroy, OnInit} from '@angular/core';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {ToastService} from '../../components/toast/toast.service';
import {SidebarNode} from '../../models/sidebar-node.model';
import {NotebooksService} from '../../services/notebooks.service';
import {FormControl, FormGroup} from '@angular/forms';
import {Observable} from 'rxjs';

@Component({
    selector: 'app-notebooks',
    templateUrl: './notebooks.component.html',
    styleUrls: ['./notebooks.component.scss']
})
export class NotebooksComponent implements OnInit, OnDestroy {

    requestGetForm: FormGroup;
    requestGetText = '';

    createSessionForm: FormGroup;
    createSessionText = '';

    manageKernelForm: FormGroup;
    manageKernelText = '';

    createFileForm: FormGroup;
    createFileText = '';

    manageFileForm: FormGroup;
    manageFileText = '';

    requestSubmitted = false;

    constructor(
        private _notebooks: NotebooksService,
        private _leftSidebar: LeftSidebarService,
        private _toast: ToastService) {
    }

    ngOnInit(): void {
        this.initForms();
        const nodes = [
            new SidebarNode('filesHeading', 'Files', '', '').asSeparator()
        ];
        this._leftSidebar.setNodes(nodes);
        this._leftSidebar.open();
    }

    ngOnDestroy() {
        this._leftSidebar.close();
    }

    initForms() {
        this.requestGetForm = new FormGroup({
            request: new FormControl('sessions'),
            path: new FormControl(''),
        });

        this.createSessionForm = new FormGroup({
            name: new FormControl(''),
            path: new FormControl(''),
            kernel: new FormControl('python3'),
        });

        this.manageKernelForm = new FormGroup({
            action: new FormControl('interrupt'),
            id: new FormControl(''),
        });

        this.createFileForm = new FormGroup({
            name: new FormControl('example'),
            path: new FormControl('work'),
            type: new FormControl('notebook'),
            ext: new FormControl('.txt'),
        });

        this.manageFileForm = new FormGroup({
            path: new FormControl('work/Untitled.ipynb'),
            action: new FormControl('move'),
            arg: new FormControl('work/My Notebook.ipynb'),
        });
    }

    sendGetRequest() {
        if (this.requestGetForm.valid) {
            this.requestSubmitted = true;
            const val = this.requestGetForm.value;
            console.log(val);

            let selected$: Observable<any>;
            switch (val.request) {
                case 'contents':
                    selected$ = this._notebooks.getContents(val.path);
                    break;
                case 'kernelspecs':
                    selected$ = this._notebooks.getKernelspecs();
                    break;
                case 'session':
                    selected$ = this._notebooks.getSession(val.path);
                    break;
                case 'sessions':
                    selected$ = this._notebooks.getSessions();
                    break;
                case 'kernels':
                    selected$ = this._notebooks.getKernels();
                    break;
            }
            selected$.subscribe(res => {
                console.log(res);
                this.requestGetText = JSON.stringify(res, null, 4);
            }, err => {
                console.log('Error:' + err);
                this.requestGetText = 'Something went wrong';
            });
        } else {
            this._toast.warn('invalid form', 'warning');
        }
        this.requestSubmitted = false;
    }

    createSession() {
        if (this.createSessionForm.valid) {
            this.requestSubmitted = true;
            const val = this.createSessionForm.value;
            this._notebooks.createSession(val.name, val.path, val.kernel).subscribe(res => {
                console.log(res);
                this.createSessionText = JSON.stringify(res, null, 4);
            }, err => {
                console.log('Error in createSession:' + err);
                this.createSessionText = 'Something went wrong';
            });
        } else {
            this._toast.warn('invalid form', 'warning');
        }
        this.requestSubmitted = false;
    }

    createFile() {
        if (this.createFileForm.valid) {
            this.requestSubmitted = true;
            const val = this.createFileForm.value;
            let selected$: Observable<any>;
            if (val.type === 'file') {
                selected$ = this._notebooks.createFileWithExtension(val.path, val.type, val.ext);
            } else {
                selected$ = this._notebooks.createFile(val.path, val.type);
            }

            selected$.subscribe(res => {
                console.log(res);
                this.createFileText = JSON.stringify(res, null, 4);
            }, err => {
                console.log('Error in createFile:' + err);
                this.createFileText = 'Something went wrong';
            });
        } else {
            this._toast.warn('invalid form', 'warning');
        }
        this.requestSubmitted = false;
    }

    manageKernel() {
        if (this.manageKernelForm.valid) {
            this.requestSubmitted = true;
            const val = this.manageKernelForm.value;

            let selected$: Observable<any>;
            switch (val.action) {
                case 'interrupt':
                    selected$ = this._notebooks.interruptKernel(val.id);
                    break;
                case 'restart':
                    selected$ = this._notebooks.restartKernel(val.id);
                    break;
                case 'deleteSession':
                    selected$ = this._notebooks.deleteSession(val.id);
                    break;
            }
            selected$.subscribe(res => {
                console.log(res);
                this.manageKernelText = JSON.stringify(res, null, 4);
            }, err => {
                console.log('Error:' + err);
                this.manageKernelText = 'Something went wrong';
            });
        } else {
            this._toast.warn('invalid form', 'warning');
        }
        this.requestSubmitted = false;
    }

    manageFile() {
        if (this.manageFileForm.valid) {
            this.requestSubmitted = true;
            const val = this.manageFileForm.value;

            let selected$: Observable<any>;
            switch (val.action) {
                case 'move':
                    selected$ = this._notebooks.moveFile(val.path, val.arg);
                    break;
                case 'upload':
                    selected$ = this._notebooks.updateFile(val.path, val.arg, 'text');
                    break;
                case 'delete':
                    selected$ = this._notebooks.deleteFile(val.path);
                    break;
            }
            selected$.subscribe(res => {
                console.log(res);
                this.manageFileText = JSON.stringify(res, null, 4);
            }, err => {
                console.log('Error:' + err);
                this.manageFileText = 'Something went wrong';
            });
        } else {
            this._toast.warn('invalid form', 'warning');
        }
        this.requestSubmitted = false;
    }

}
