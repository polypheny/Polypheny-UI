import {
    Component,
    EventEmitter,
    HostListener,
    inject,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
    QueryList,
    SimpleChanges,
    ViewChild,
    ViewChildren
} from '@angular/core';
import {KernelSpec, NotebookContent, SessionResponse} from '../../models/notebooks-response.model';
import {NotebooksService} from '../../services/notebooks.service';
import {NotebooksSidebarService} from '../../services/notebooks-sidebar.service';
import {NotebookCell} from '../../models/notebook.model';
import {ActivatedRoute, Router} from '@angular/router';
import {NotebooksContentService} from '../../services/notebooks-content.service';
import {EMPTY, Observable, Subject, Subscription, timer} from 'rxjs';
import {NotebooksWebSocket} from '../../services/notebooks-webSocket';
import {ModalDirective} from 'ngx-bootstrap/modal';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {NbCellComponent} from './nb-cell/nb-cell.component';
import {CellType, NotebookWrapper,PresentType} from './notebook-wrapper';
import {delay, mergeMap, take, tap} from 'rxjs/operators';
import {LoadingScreenService} from '../../../../components/loading-screen/loading-screen.service';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {ToasterService} from '../../../../components/toast-exposer/toaster.service';
import {WebuiSettingsService} from '../../../../services/webui-settings.service';

@Component({
    selector: 'app-edit-notebook',
    templateUrl: './edit-notebook.component.html',
    styleUrls: ['./edit-notebook.component.scss']
})
export class EditNotebookComponent implements OnInit, OnChanges, OnDestroy {
    private readonly _notebooks = inject(NotebooksService);
    public readonly _sidebar = inject(NotebooksSidebarService);
    private readonly _content = inject(NotebooksContentService);

    private readonly _toast = inject(ToasterService);
    private readonly _router = inject(Router);
    private readonly _route = inject(ActivatedRoute);
    private readonly _loading = inject(LoadingScreenService);

    private readonly _settings = inject(WebuiSettingsService);

    @Input() sessionId: string;
    @Output() openChangeSessionModal = new EventEmitter<{ name: string, path: string }>();
    path: string;
    name: string;
    nb: NotebookWrapper;
    session: SessionResponse;
    kernelSpec: KernelSpec;
    private subscriptions = new Subscription();
    selectedCell: NotebookCell;
    selectedCellType: CellType = 'code';
    selectedPresentType: string='skip';
    showOutput:boolean=true;
    busyCellIds = new Set<string>();
    mode: NbMode = 'command';
    namespaces: string[] = [];
    expand = false;
    persentShowFlag=false;
    backgroundColor:string="#000";
    color:string="#fff";
    docVisible = false;
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
    inserting = false;
    closeNbSubject: Subject<boolean>;

    constructor() {
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
            this._notebooks.getSession(this.sessionId).subscribe({
                next: session => {
                    this.session = session;
                    this.path = this._notebooks.getPathFromSession(session);
                    this.name = this._notebooks.getNameFromSession(session);
                    const urlPath = 'notebooks/' + this._route.snapshot.url.map(segment => decodeURIComponent(segment.toString())).join('/');
                    if (this.path !== urlPath) {
                        this.closeEdit(true);
                        return;
                    }
                    if (!this.renameNotebookModal.isShown) {
                        this.renameNotebookForm.patchValue({name: this.name});
                    }
                    this._content.setPreferredSessionId(this.path, this.sessionId);
                    this.loadNotebook();
                }, error: () => {
                    this.closeEdit();
                }
            });
        }
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
        this.nb?.closeSocket();
        this._sidebar.deselect();
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
            shutDown: new FormControl(true)
        });
    }

    private updateSession(sessions: SessionResponse[]) {
        this.session = sessions.find(session => session.id === this.sessionId);
        if (!this.session) {
            this._toast.warn(`Kernel was closed.`);
            return;
        }
        const path = this._notebooks.getPathFromSession(this.session);
        if (this.path !== path) {
            if (this.path) {
                const queryParams = {session: this.sessionId, forced: true};
                this._router.navigate([this._sidebar.baseUrl].concat(path.split('/')), {queryParams});
                this._toast.warn(`The path to the notebook has changed.`, 'Info');
            }
            this.path = path;
            this.name = this.name = this._notebooks.getNameFromSession(this.session);

        }
    }

    private loadNotebook() {
        this._loading.show();
        if (this.nb) {
            this.nb.closeSocket();
            this.nb = null;
        }
        this._content.getNotebookContent(this.path, this.nb == null).subscribe(res => {
            if (res) {
                this.nb = new NotebookWrapper(res, this.busyCellIds,
                    new NotebooksWebSocket(this.session.kernel.id, this._settings),
                    id => this.getCellComponent(id)?.renderMd(),
                    (id, output) => this.getCellComponent(id)?.renderError(output),
                    (id, output) => this.getCellComponent(id)?.renderStream(output),
                    id => this.getCellComponent(id)?.renderResultSet());
             
                this.expand = this.nb.isExpansionAllowed();
                this.kernelSpec = this._content.getKernelspec(this.session.kernel.name);
                this.backgroundColor=res.content.metadata.persentation?.backgroundColor||'#000';
                this.color=res.content.metadata.persentation?.textColor||'#fff';
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
        }).add(() => {
            this._loading.hide();
            if (!this.nb) {
                this._toast.error(`Could not read content of ${this.path}.`);
                this.closeEdit(true);
            }
        });
    }

    /**
     * Close the edit component and navigate to the parent directory of this notebook.
     * @param forced if true, no confirmation dialog will appear if there are unsaved changes
     */
    closeEdit(forced = false) {
        this.nb?.closeSocket();
        const queryParams = forced ? {forced: true} : null;
        this._router.navigate([this._sidebar.baseUrl].concat(this._content.directoryPath.split('/')),
            {queryParams});
    }

    /**
     * Open the close notebook dialog and return a subject to subscribe to the dialog result.
     * If the dialog is already open, return false.
     * @return a boolean Subject that emits true if the close operation is confirmed and false when aborted
     */
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


    closeNotebookCancelled() {
        this.closeNbSubject?.next(false);
        this.closeNbSubject?.complete();
        this.closeNbSubject = null;
        this._sidebar.deselect();
        this.closeNotebookModal.hide();
    }


    deleteNotebook(): void {
        this.deleting = true;
        this.terminateSessions();
        this.closeEdit(true);
        this._notebooks.deleteFile(this.path).subscribe().add(() => {
            this._content.update();
            this.deleting = false;
            this.deleteNotebookModal.hide();
        });

    }

    closeNotebookSubmitted() {
        if (this.closeNotebookForm.value.saveChanges) {
            this.overwriteNotebook(true);
        }

        if (this.session && this.closeNotebookForm.value.shutDown) {
            this.terminateSession();
        }
        if (this.closeNbSubject) {
            this.nb?.closeSocket();
            this.closeNbSubject.next(true);
            this.closeNbSubject?.complete();
        } else {
            this.closeEdit(true);
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
        this._notebooks.duplicateFile(this.path, this._content.directoryPath).subscribe(() => this._content.update(),
            err => this._toast.error(err.error.message, `Could not duplicate ${this.path}.`));
    }

    downloadNotebook() {
        this._content.downloadNotebook(this.nb.notebook, this.name);
    }

    exportNotebook() {
        if (this.nb.hasChangedSinceSave()) {
            this._toast.warn('Please save your changes first before exporting the notebook.', 'Info');
            return;
        }
        this._notebooks.getExportedNotebook(this.path, this.kernelSpec?.name).subscribe(res => {
                this._content.downloadNotebook(res.content, 'exported_' + this.name);
            },
            () => {
                this._toast.warn('Unable to export the notebook.');
            });
    }

    trustNotebook() {
        this.nb.trustAllCells();
    }


    executeSelected(advanceToNext = false) {
        this.selectedComponent?.updateSource();
        this.nb.executeCell(this.selectedCell);
        if (advanceToNext) {
            if (this.nb.getCellIndex(this.selectedCell.id) === this.nb.cells.length - 1) {
                this.insertCell(this.selectedCell.id, true, true);
            } else {
                this.selectCellBelow(false);
                this.forceCommandMode();
            }
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
        this.selectedCell.execution_count = null;
    }

    clearAllOutputs() {
        this.nb.clearAllOutputs();
    }

    toggleExpansion() {
        this.expand = !this.expand;
        this.nb.setExpansionAllowed(this.expand);
        this._toast.success('Variable expansion has been ' + (this.expand ? 'activated' : 'deactivated') + '.');
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
                    this.uploadNotebookWithDeepCompare(showSuccessToast);
                    return EMPTY;
                }
            })
        ).subscribe(res => {
            if (showSuccessToast) {
                this._toast.success('Notebook was saved.');
            }
            this.nb.markAsSaved(res.last_modified);
        }, () => {
            this._toast.error('An error occurred while uploading the notebook.');

        });
    }

    /**
     * Checks whether the content of the notebook that is stored on disk has changed compared
     * to when it was loaded. If true, the overwriteNotebookModal is shown. Otherwise, the notebook is uploaded.
     */
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
                this._toast.success('Notebook was saved.');
            }
            this.nb.markAsSaved(res.last_modified);
        }, () => {
            this._toast.error('An error occurred while uploading the notebook.');
        });
    }

    /**
     * Upload to notebook without confirmation.
     * The previous version is overwritten.
     */
    overwriteNotebook(showSuccessToast = true) {
        this.overwriting = true;
        this._notebooks.updateNotebook(this.path, this.nb.notebook).subscribe(res => {
            if (showSuccessToast) {
                this._toast.success('Notebook was saved.');
            }
            this.nb?.markAsSaved(res.last_modified);
        }, () => {
            this._toast.error('An error occurred while uploading the notebook.');
        }).add(() => {
            this.overwriteNotebookModal.hide();
            this.overwriting = false;
        });
    }

    revertNotebook() {
        this.loadNotebook();
        this._toast.success('Notebook was reverted.');
        this.overwriteNotebookModal.hide();

    }

    changeTheme(event:string){
        this.nb.changeTheme(event);
    }
    changeColor(event:string){
        this.nb.changeColor(event);
    }
    interruptKernel() {
        this._notebooks.interruptKernel(this.session.kernel.id).subscribe(() => {
        }, () => {
            this._toast.error('Unable to interrupt the kernel.');
        });
    }

    requestRestart(executeAll: boolean = false) {
        this.executeAllAfterRestart = executeAll;
        this.restartKernelModal.show();
    }

    restartKernel() {
        this._notebooks.restartKernel(this.session.kernel.id).pipe(
            tap(() => this.nb.setKernelStatusBusy()),
            delay(2500) // time for the kernel to restart
        ).subscribe(() => {
            this.nb.requestExecutionState();
            if (this.executeAllAfterRestart) {
                this.nb.executeAll();
            }
        }, () => {
            this._toast.error('Unable to restart the kernel.');
        });
        this.restartKernelModal.hide();
    }
    toggleDocDemo() {
        this.docVisible = !this.docVisible;
      }
    
      handleDocChange(event: any) {
        this.docVisible = event;
      }
    insertCell(id: string, below: boolean, editMode = true) {
        if (this.inserting) {
            return;
        }
        const cell = this.nb.insertCell(id, below);
        this.inserting = true;
        timer(50).pipe(take(1)).subscribe(() => {
            // ensure enough time has passed for the cell to be added to DOM
            this.selectCell(cell.id, editMode);
            if (!editMode) {
                this.forceCommandMode();
            }
            timer(100).pipe(take(1)).subscribe(() => this.inserting = false); // prevent spam
        });
    }

    moveCell(oldIdx: number, below: boolean) {
        const newIdx = oldIdx + (below ? 1 : -1);
        if (newIdx >= 0 && newIdx < this.nb.cells.length) {
            moveItemInArray(this.nb.cells, oldIdx, newIdx);
        }
    }

    duplicateCell(id: string) {
        this.getCellComponent(id)?.updateSource();
        const cell = this.nb.duplicateCell(id);
        timer(50).pipe(take(1)).subscribe(() => {
            this.selectCell(cell.id, false);
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
                this.selectCell(copyCell.id, false);
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
        } else {
            this.insertCell(id, false, false);
            this.deleteCell(id);
        }
    }

    selectCell(id: string, editMode = false) {
        const unselectId = this.selectedCell?.id;
        if (id !== unselectId) {
            this.selectedComponent?.editor?.blur();
            this.selectedCell = this.nb.getCell(id);
            this.selectedPresentType=this.nb.getCellPresent(this.selectedCell);
            this.showOutput=this.nb.getCellShowOutput(this.selectedCell);
            if (this.selectedCell) {
                this.selectedCellType = this.nb.getCellType(this.selectedCell);
                this.scrollCellIntoView(id);
                if (editMode) {
                    this.mode = 'edit'; // if component does not yet exist
                    this.selectedComponent?.editMode();
                    this.selectedComponent?.editor?.focus();
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

    persentShow(){
        this.persentShowFlag=true;
    }
    persentDisable(){
        this.persentShowFlag=false;
    }

    private scrollCellIntoView(id) {
        // https://stackoverflow.com/a/37829643
        const element = document.getElementById(id); // id of the scroll to element
        if (!element) {
            return;
        }

        if (element.getBoundingClientRect().bottom > window.innerHeight - 50) {
            element.scrollIntoView({behavior: 'smooth', block: 'end', inline: 'nearest'});
        } else if (element.getBoundingClientRect().top < 100) {
            element.scrollIntoView({behavior: 'smooth', block: 'start', inline: 'nearest'});
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
                    this.forceCommandMode();
                    break;
            }
        }

    }

    private handleCommandModeKey(event: KeyboardEvent, modifiers: number) {
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
        if (event.altKey) {
            this.executeSelected();
            this.insertCell(this.selectedCell.id, true, true);
        } else if (event.ctrlKey) {
            this.executeSelected();
            if (this.mode === 'edit') {
                this.forceCommandMode();
            }
        } else if (event.shiftKey) {
            this.executeSelected(true);
        }
    }

    private forceCommandMode() {
        this.selectedComponent?.commandMode();
        document.getElementById('notebook').focus();
    }

    onTypeChange(event: Event) {
        const type: CellType = <CellType>(event.target as HTMLOptionElement).value;
        this.setCellType(type);
    }
    onPresentChange(event: Event) {
        const type: PresentType = <PresentType>(event.target as HTMLOptionElement).value;
        this.selectedPresentType = type;
        this.nb.changeCellPresent(this.selectedCell, type);
        this.selectedComponent.updatePresentType();

    }
    
    toggleCellShowOutput() {
        this.showOutput=this.nb.toggleCellShowOutput(this.selectedCell);

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
