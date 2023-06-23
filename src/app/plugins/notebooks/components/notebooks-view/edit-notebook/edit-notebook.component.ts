import {
    Component, EventEmitter, HostListener,
    Input,
    OnChanges,
    OnDestroy,
    OnInit, Output,
    QueryList,
    SimpleChanges,
    ViewChild,
    ViewChildren
} from '@angular/core';
import {KernelSpec, NotebookContent, SessionResponse} from '../../../models/notebooks-response.model';
import {NotebooksService} from '../../../services/notebooks.service';
import {NotebooksSidebarService} from '../../../services/notebooks-sidebar.service';
import {ToastService} from '../../../../../components/toast/toast.service';
import {NotebookCell} from '../../../models/notebook.model';
import {ActivatedRoute, Router} from '@angular/router';
import {NotebooksContentService} from '../../../services/notebooks-content.service';
import {EMPTY, Observable, Subject, Subscription, timer} from 'rxjs';
import {NotebooksWebSocket} from '../../../services/notebooks-webSocket';
import {WebuiSettingsService} from '../../../../../services/webui-settings.service';
import {ModalDirective} from 'ngx-bootstrap/modal';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {NbCellComponent} from './nb-cell/nb-cell.component';
import {CellType, NotebookWrapper} from './notebook-wrapper';
import {delay, mergeMap, take, tap} from 'rxjs/operators';
import {LoadingScreenService} from '../../../../../components/loading-screen/loading-screen.service';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {CrudService} from '../../../../../services/crud.service';

@Component({
    selector: 'app-edit-notebook',
    templateUrl: './edit-notebook.component.html',
    styleUrls: ['./edit-notebook.component.scss']
})
export class EditNotebookComponent implements OnInit, OnChanges, OnDestroy {
    @Input() sessionId: string;
    @Output() openChangeSessionModal = new EventEmitter<{ name: string, path: string }>();
    path: string;
    name: string;
    nb: NotebookWrapper;
    session: SessionResponse;
    kernelSpec: KernelSpec;
    private socket: NotebooksWebSocket;
    private subscriptions = new Subscription();
    selectedCell: NotebookCell;
    selectedCellType = 'code';
    busyCellIds = new Set<string>();
    mode: NbMode = 'command';
    namespaces: string[] = [];
    private copiedCell: string; // stringified NotebookCell
    @ViewChild('deleteNotebookModal') public deleteNotebookModal: ModalDirective;
    @ViewChild('restartKernelModal') public restartKernelModal: ModalDirective;
    private executeAllAfterRestart = false;
    @ViewChild('overwriteNotebookModal') public overwriteNotebookModal: ModalDirective;
    @ViewChild('renameNotebookModal') public renameNotebookModal: ModalDirective;
    @ViewChild('closeNotebookModal') public closeNotebookModal: ModalDirective;
    @ViewChild('terminateKernelModal') public terminateKernelModal: ModalDirective;
    @ViewChild('terminateAllKernelsModal') public terminateAllKernelsModal: ModalDirective;
    @ViewChildren('nbCell') cellComponents: QueryList<NbCellComponent>;
    renameNotebookForm: FormGroup;
    closeNotebookForm: FormGroup;
    deleting = false;
    overwriting = false;
    closeNbSubject: Subject<boolean>;

    constructor(
        private _notebooks: NotebooksService,
        public _sidebar: NotebooksSidebarService,
        private _content: NotebooksContentService,
        private _toast: ToastService,
        private _router: Router,
        private _route: ActivatedRoute,
        private _settings: WebuiSettingsService,
        private _loading: LoadingScreenService,
        private _crud: CrudService) {
    }

    ngOnInit(): void {
        this.subscriptions.add(
            this._content.onSessionsChange().subscribe(sessions => this.updateSession(sessions))
        );
        this.subscriptions.add(
            this._content.onNamespaceChange().subscribe(namespaces => this.namespaces = namespaces)
        );
        this.initForms();

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
                if (!this.renameNotebookModal.isShown) {
                    this.renameNotebookForm.patchValue({name: this.name});
                }
                this._content.setPreferredSessionId(this.path, this.sessionId);
                this.connectToKernel();
                this.loadNotebook();
            }, err => {
                console.log('session does not exist!');
                this.closeEdit();

            });
        }
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
        this.nb?.closeSocket();
    }

    closeEdit() {
        this.nb?.closeSocket();
        this._router.navigate([], {
            relativeTo: this._route,
            queryParams: null,
            replaceUrl: true
        });
    }

    confirmClose(): Subject<boolean> | boolean {
        if (this.closeNotebookModal.isShown) {
            return false;
        }
        this.closeNbSubject = new Subject<boolean>();
        this.closeNotebookModal.config.keyboard = false;
        this.closeNotebookModal.config.backdrop = 'static';
        this.closeNotebookModal.show();
        return this.closeNbSubject;
    }

    // https://stackoverflow.com/questions/35922071/warn-user-of-unsaved-changes-before-leaving-page
    @HostListener('window:beforeunload')
    canDeactivate(): Observable<boolean> | boolean {
        const hasChanged = this.nb?.hasChangedSinceSave();
        return !hasChanged;
    }

    initForms() {
        this.renameNotebookForm = new FormGroup({
            name: new FormControl('', [
                Validators.pattern('[a-zA-Z0-9_. \-]*[a-zA-Z0-9_\-]'), // last symbol can't be '.' or ' '
                Validators.maxLength(50),
                Validators.required
            ])
        });
        this.closeNotebookForm = new FormGroup({
            saveChanges: new FormControl(true),
            shutDown: new FormControl(false)
        });
    }

    private updateSession(sessions: SessionResponse[]) {
        this.session = sessions.find(session => session.id === this.sessionId);
        if (!this.session) {
            this._toast.warn(`Kernel was closed`);
            return;
        }
        const path = this._notebooks.getPathFromSession(this.session);
        if (this.path !== path) {
            if (this.path) {
                const queryParams = {session: this.sessionId, forced: true};
                this._router.navigate([this._sidebar.baseUrl].concat(path.split('/')), {queryParams});
                this._toast.warn(`The path to the notebook has changed`, 'Info');
            }
            this.path = path;
            this.name = this.name = this._notebooks.getNameFromSession(this.session);

        }
    }

    private connectToKernel() {
        this.socket = new NotebooksWebSocket(this._settings, this.session.kernel.id);
    }

    private loadNotebook() {
        this._loading.show();
        this._content.getNotebookContent(this.path).subscribe(res => {
            if (res) {
                this.nb?.closeSocket();
                this.nb = new NotebookWrapper(res, this.busyCellIds, this.socket,
                    id => this.getCellComponent(id)?.renderMd(),
                    (id, output) => this.getCellComponent(id)?.renderError(output),
                    id => this.getCellComponent(id)?.renderResultSet());
                this.kernelSpec = this._content.getKernelspec(this.session.kernel.name);
                if (this.kernelSpec) {
                    this.nb.setKernelSpec(this.kernelSpec);
                    this.uploadNotebook(false);
                }
                if (this.nb.cells.length < 1) {
                    this.nb.insertCellByIdx(0, false);
                }
                this.selectCell(this.nb.cells[0].id);
                document.getElementById('notebook').focus();
            }
        }, error => {
            console.log('error while reading notebook', this.path);
        }).add(() => {
            this._loading.hide();
            if (!this.nb) {
                this._toast.error(`Could not read content of ${this.path}`);
                this.closeEdit();
            }
        });
    }


    closeNotebookCancelled() {
        this.closeNbSubject?.next(false);
        this.closeNbSubject?.complete();
        this.closeNbSubject = null;
        this.closeNotebookModal.hide();
    }


    deleteNotebook(): void {
        this.deleting = true;
        this.terminateSessions();
        this._notebooks.deleteFile(this.path).subscribe().add(() => {
            this._content.update();
            this.deleting = false;
            this.deleteNotebookModal.hide();
            this.closeEdit();
        });

    }

    closeNotebookSubmitted() {
        if (this.closeNotebookForm.value.saveChanges) {
            this.overwriteNotebook(true);
        }

        if (this.closeNotebookForm.value.shutDown) {
            this.terminateSession();
        }
        if (this.closeNbSubject) {
            this.nb?.closeSocket();
            this.closeNbSubject.next(true);
            this.closeNbSubject?.complete();
        } else {
            this.closeEdit();
        }
        this.closeNbSubject = null;
        this.closeNotebookModal.hide();
    }

    closeAndTerminate(terminateAll: boolean) {
        this.closeEdit();
        if (terminateAll) {
            this.terminateSessions();
            this.terminateAllKernelsModal.hide();
        } else {
            this.terminateSession();
            this.terminateKernelModal.hide();
        }
    }

    terminateSession() {
        this._content.deleteSession(this.sessionId).subscribe();
    }

    terminateSessions() {
        this._content.deleteSessions(this.path).subscribe();
    }

    rename() {
        if (!this.renameNotebookForm.valid) {
            return;
        }
        let fileName = this.renameNotebookForm.value.name;
        if (!fileName.endsWith('.ipynb')) {
            fileName += '.ipynb';
        }
        const dirPath = this._content.directoryPath;
        this._sidebar.moveFile(this.path, dirPath + '/' + fileName);
        this.renameNotebookModal.hide();
    }

    duplicateNotebook() {
        this._notebooks.duplicateFile(this.path, this._content.directoryPath).subscribe(res => this._content.update(),
            err => this._toast.error(err.error.message, `Could not duplicate ${this.path}`));
    }

    downloadNotebook() {
        this._content.downloadNotebook(this.nb.notebook, this.name);
    }


    executeSelected(advanceToNext = false) {
        this.selectedComponent?.updateSource();
        this.nb.executeCell(this.selectedCell);
        if (advanceToNext) {
            this.selectCellBelow();
        }
    }

    executeAboveSelected() {
        this.nb.executeCells(this.selectedCell, true, false);
    }

    executeSelectedAndBelow() {
        this.selectedComponent?.updateSource();
        this.nb.executeCells(this.selectedCell, false, true);
    }

    executeAll() {
        this.nb.executeAll();
    }

    renderMdCells() {
        this.nb.executeMdCells();
    }

    clearSelectedOutput() {
        this.selectedCell.outputs = [];
    }

    clearAllOutputs() {
        this.nb.clearAllOutputs();
    }

    /**
     * This first compares the modification times of when this notebook was loaded and the one on disk.
     * If they are not equal, the content of the one on disk is loaded and compared. This is only done now for
     * improved performance.If they differ, the overwriteNotebookModal is shown.
     * Otherwise, the notebook is uploaded.
     */
    uploadNotebook(showSuccessToast = true) {
        this._notebooks.getContents(this.path, false).pipe(
            mergeMap(res => {
                if (res.last_modified === this.nb.lastModifiedWhenLoaded) {
                    return this._notebooks.updateNotebook(this.path, this.nb.notebook);
                } else {
                    this.uploadNotebookWithDeepCompare();
                    return EMPTY;
                }
            })
        ).subscribe(res => {
            if (showSuccessToast) {
                this._toast.success('Saved notebook!');
            }
            this.nb.markAsSaved(res.last_modified);
        }, error => {
            this._toast.error('error while uploading notebook');
            console.log('upload error:', error);

        });
    }

    uploadNotebookWithDeepCompare(showSuccessToast = true) {
        this._notebooks.getContents(this.path, true).pipe(
            mergeMap(res => {
                if (this.nb.lastSaveDiffersFrom((<NotebookContent>res).content)) {
                    this.overwriteNotebookModal.show();  // show confirm dialog
                    return EMPTY;
                } else {
                    return this._notebooks.updateNotebook(this.path, this.nb.notebook);
                }
            })
        ).subscribe(res => {
            if (showSuccessToast) {
                this._toast.success('Saved notebook!');
            }
            this.nb.markAsSaved(res.last_modified);
        }, error => {
            this._toast.error('error while uploading notebook');
            console.log('upload error:', error);
        });
    }

    overwriteNotebook(showSuccessToast = true) {
        this.overwriting = true;
        this._notebooks.updateNotebook(this.path, this.nb.notebook).subscribe(res => {
            if (showSuccessToast) {
                this._toast.success('uploaded notebook!');
            }
            this.nb.markAsSaved(res.last_modified);
        }, error => {
            this._toast.error('error while uploading notebook');
            console.log('upload error:', error);
        }).add(() => {
            this.overwriteNotebookModal.hide();
            this.overwriting = false;
        });
    }

    revertNotebook() {
        this.loadNotebook();
        this._toast.success('Reverted Notebook!');
        this.overwriteNotebookModal.hide();

    }

    interruptKernel() {
        this._notebooks.interruptKernel(this.session.kernel.id).subscribe(res => {
        }, err => {
            this._toast.error('Unable to interrupt the kernel');
        });
    }

    requestRestart(executeAll: boolean = false) {
        this.executeAllAfterRestart = executeAll;
        this.restartKernelModal.show();
    }

    restartKernel() {
        this._notebooks.restartKernel(this.session.kernel.id).pipe(
            tap(res => this.nb.setKernelStatusBusy()),
            delay(1500) // time for the kernel to restart
        ).subscribe(res => {
            if (this.executeAllAfterRestart) {
                this.nb.executeAll();
            }
        }, err => {
            this._toast.error('Unable to restart the kernel');
            console.log(err);
        });
        this.restartKernelModal.hide();
    }

    insertCell(id: string, below: boolean, editMode = true) {
        const cell = this.nb.insertCell(id, below);
        timer(50).pipe(take(1)).subscribe(() => {
            // ensure enough time has passed for the cell to be added to DOM
            this.selectCell(cell.id, editMode, true);
        });
    }

    moveCell(oldIdx: number, below: boolean) {
        const newIdx = oldIdx + (below ? 1 : -1);
        if (newIdx >= 0 && newIdx < this.nb.cells.length) {
            moveItemInArray(this.nb.cells, oldIdx, newIdx);
        }
    }

    duplicateCell(id: string) {
        const cell = this.nb.duplicateCell(id);
        timer(50).pipe(take(1)).subscribe(() => {
            this.selectCell(cell.id, false, true);
        });
    }

    copySelectedCell() {
        this.selectedComponent?.updateSource();
        this.copiedCell = JSON.stringify(this.selectedCell);
    }

    pasteCopiedCell(below: boolean = true) {
        if (this.copiedCell) {
            const copyCell = this.nb.insertCopyOfCell(this.copiedCell, this.selectedCell, below);
            timer(50).pipe(take(1)).subscribe(() => {
                this.selectCell(copyCell.id, false, true);
            });
        }
    }

    deleteCell(id: string) {
        if (this.nb.cells.length > 1) {
            const cellBelow = this.nb.cellBelow(id);
            this.nb.deleteCell(id);
            if (cellBelow) {
                this.selectCell(cellBelow.id, false);
            } else {
                this.selectCell(this.nb.cells[this.nb.cells.length - 1].id, false);
            }
        }
    }

    selectCell(id: string, editMode = false, ignoreFocusLoss = false) {
        const unselectId = this.selectedCell?.id;
        if (id !== unselectId) {
            this.selectedCell = this.nb.getCell(id);
            if (this.selectedCell) {
                this.selectedCellType = this.nb.getCellType(this.selectedCell);
                if (editMode) {
                    this.mode = 'edit'; // if component does not yet exist
                    this.selectedComponent?.editMode();
                }
            }
        }
    }

    selectCellAbove(editMode = false) {
        const cellAbove = this.nb.cellAbove(this.selectedCell.id);
        if (cellAbove) {
            this.selectCell(cellAbove.id, editMode);
        }
    }

    selectCellBelow(editMode = false) {
        const cellBelow = this.nb.cellBelow(this.selectedCell.id);
        if (cellBelow) {
            this.selectCell(cellBelow.id, editMode);
        }
    }


    keyDown(event: KeyboardEvent) {
        const modifiers: number = +event.altKey + +event.ctrlKey + +event.shiftKey;
        if (this.mode === 'edit') {
            this.handleEditModeKey(event, modifiers);
        } else if (!(event.target as HTMLElement).classList.contains('no-command-hotkey')) {
            this.handleCommandModeKey(event, modifiers);
        }

    }

    private handleEditModeKey(event: KeyboardEvent, modifiers: number) {
        if (modifiers > 0) {
            switch (event.key.toLowerCase()) {
                case 'enter':
                    this.handleModifiedEnter(event, modifiers);
                    break;
                case 's':
                    if (event.ctrlKey && modifiers === 1) {
                        event.preventDefault();
                        this.uploadNotebook();
                    }
                    break;
            }
        } else {
            switch (event.key.toLowerCase()) {
                case 'escape':
                    this.selectedComponent?.commandMode();
                    document.getElementById('notebook').focus();
                    break;
            }
        }

    }

    private handleCommandModeKey(event: KeyboardEvent, modifiers: number) {
        console.log(event);
        if (modifiers > 0) {
            switch (event.key.toLowerCase()) {
                case 'enter':
                    this.handleModifiedEnter(event, modifiers);
                    break;
                case 's':
                    if (event.ctrlKey && modifiers === 1) {
                        event.preventDefault();
                        this.uploadNotebook();
                    }
                    break;
                case 'v':
                    if (event.shiftKey && modifiers === 1) {
                        event.preventDefault();
                        this.pasteCopiedCell(false);
                        break;
                    }
            }

        } else {
            switch (event.key.toLowerCase()) {
                case 'enter':
                    event.preventDefault();
                    this.selectedComponent?.editMode();
                    break;
                case 'a':
                    event.preventDefault();
                    this.insertCell(this.selectedCell.id, false, false);
                    break;
                case 'b':
                    event.preventDefault();
                    this.insertCell(this.selectedCell.id, true, false);
                    break;
                case 'm':
                    event.preventDefault();
                    this.setCellType('markdown');
                    break;
                case 'y':
                    event.preventDefault();
                    this.setCellType('code');
                    break;
                case 'p':
                    event.preventDefault();
                    this.setCellType('poly');
                    break;
                case 's':
                    event.preventDefault();
                    this.uploadNotebook();
                    break;
                case 'c':
                    event.preventDefault();
                    this.copySelectedCell();
                    break;
                case 'v':
                    event.preventDefault();
                    this.pasteCopiedCell(true);
                    break;
                case 'x':
                    event.preventDefault();
                    this.copySelectedCell();
                    this.deleteCell(this.selectedCell.id);
                    break;
                case 'arrowup':
                    event.preventDefault();
                    this.selectCellAbove();
                    break;
                case 'arrowdown':
                    event.preventDefault();
                    this.selectCellBelow();
                    break;
            }
        }
    }

    private handleModifiedEnter(event: KeyboardEvent, modifiers: number) {
        if (modifiers > 1) {
            return;
        }
        event.preventDefault();
        this.executeSelected();
        if (event.altKey) {
            this.insertCell(this.selectedCell.id, true);
        } else if (event.ctrlKey) {
            if (this.mode === 'edit') {
                this.selectedComponent?.commandMode();
                document.getElementById('notebook').focus();
            }
        } else if (event.shiftKey) {
            if (this.nb.getCellIndex(this.selectedCell.id) === this.nb.cells.length - 1) {
                this.insertCell(this.selectedCell.id, true, false);
            } else {
                this.selectCellBelow();
            }
        }
    }

    onTypeChange(event: Event) {
        const type: CellType = <CellType>(event.target as HTMLOptionElement).value;
        this.setCellType(type);
    }

    setCellType(type: CellType) {
        const oldType = this.selectedCell.cell_type;
        if (oldType === 'markdown') {
            this.selectedComponent.isMdRendered = false;
        }
        this.nb.changeCellType(this.selectedCell, type);
        this.selectedCellType = type;
        this.selectedComponent.updateCellType();
    }

    getPreviewText(cell: NotebookCell) {
        const source = Array.isArray(cell.source) ? cell.source[0] : cell.source.split('\n', 2)[0];
        return source?.slice(0, 50);
    }


    drop(event: CdkDragDrop<string[]>) {
        // https://material.angular.io/cdk/drag-drop/overview
        console.log('moving', event.previousIndex, 'to', event.currentIndex);
        moveItemInArray(this.nb.cells, event.previousIndex, event.currentIndex);
    }


    identify(index, item: NotebookCell) {
        // https://stackoverflow.com/questions/42108217/how-to-use-trackby-with-ngfor
        return item.id;
    }

    private getCellComponent(id: string): NbCellComponent {
        return this.cellComponents.find(c => {
            return c.id === id;
        });
    }

    private get selectedComponent(): NbCellComponent {
        return this.cellComponents.find(c => {
            return c.id === this.selectedCell.id;
        });
    }
}

export type NbMode = 'edit' | 'command';
