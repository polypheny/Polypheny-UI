import {
    AfterViewInit,
    Component, ElementRef,
    EventEmitter,
    Input,
    OnInit,
    Output,
    ViewChild,
} from '@angular/core';
import {CellDisplayDataOutput, CellErrorOutput, NotebookCell} from '../../../../models/notebook.model';
import {default as AnsiUp} from 'ansi_up';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {KatexOptions, MarkdownService} from 'ngx-markdown';
import {NbMode} from '../edit-notebook.component';
import {NbInputEditorComponent} from '../nb-input-editor/nb-input-editor.component';
import {CellType} from '../notebook-wrapper';
import {ResultSet} from '../../../../../../components/data-view/models/result-set.model';
import {FormControl, FormGroup, Validators} from '@angular/forms';

@Component({
    selector: 'app-nb-cell',
    templateUrl: './nb-cell.component.html',
    styleUrls: ['./nb-cell.component.scss'],
})
export class NbCellComponent implements OnInit, AfterViewInit {
    @Input() cell: NotebookCell;
    @Input() isFocused: boolean;
    @Input() isFirst: boolean;
    @Input() isLast: boolean;
    @Input() isExecuting: boolean;
    @Input() mode: NbMode;
    @Input() selectedCellType: CellType; // not necessarily the type of this cell
    @Input() namespaces: string[];
    @Input() nbLanguage: string;
    @Output() modeChange = new EventEmitter<NbMode>();
    @Output() insert = new EventEmitter<boolean>(); // true: below, false: above
    @Output() move = new EventEmitter<boolean>(); // true: down, false: up
    @Output() duplicate = new EventEmitter<null>();
    @Output() execute = new EventEmitter<string>();
    @Output() changeType = new EventEmitter<Event>();
    @Output() delete = new EventEmitter<string>();
    @Output() selected = new EventEmitter<string>();
    @ViewChild('editor') editor: NbInputEditorComponent;
    @ViewChild('cellDiv') cellDiv: ElementRef;
    cellType: CellType = 'code';

    isMouseOver = false;
    resultVariable: string;
    resultIsTooLong = false;
    polyForm: FormGroup;
    resultSet: ResultSet;
    private ansi_up = new AnsiUp();
    mdSource = '';
    errorHtml: SafeHtml;
    isMdRendered = false;
    confirmingDeletion = false;
    sourceHidden = false;
    outputsHidden = false;
    manualExecution = false;

    // https://katex.org/docs/options.html
    public options: KatexOptions = {
        throwOnError: false,
        errorColor: '#f86c6b'
    };

    constructor(private _sanitizer: DomSanitizer,
                private _markdown: MarkdownService) {
    }

    ngOnInit(): void {
        this.updateCellType();
        this.ansi_up.escape_html = true; // prevent xss
        this.initForms();

        if (this.cellType === 'markdown') {
            this.isMdRendered = true;
            this.mdSource = Array.isArray(this.cell.source) ? this.cell.source.join('') : this.cell.source;
        } else if (this.cellType === 'poly') {
            this.renderResultSet();
        } else if (this.cellType === 'code') {
            const output = this.cell.outputs.find(o => o.output_type === 'error');
            if (output) {
                this.renderError(<CellErrorOutput>output);
            }
        }
        this.sourceHidden = this.cell.metadata.jupyter?.source_hidden;
        this.outputsHidden = this.cell.metadata.jupyter?.outputs_hidden;
        this.manualExecution = this.cell.metadata.polypheny?.manual_execution;
    }

    ngAfterViewInit(): void {
        this.editor.setCode(this.source);
        if (this.isFocused && this.mode === 'edit') {
            this.editor.focus();
        }
    }

    private initForms() {
        this.polyForm = new FormGroup({
            // default value should be equal to default value in NotebookWrapper when type is changed
            language: new FormControl(this.cell.metadata.polypheny?.language || 'sql'),
            namespace: new FormControl(this.cell.metadata.polypheny?.namespace || 'public'),
            variable: new FormControl(this.cell.metadata.polypheny?.result_variable || 'result', [
                Validators.pattern('[a-zA-Z_][a-zA-Z0-9_]*'), // first symbol can't be digit
                Validators.maxLength(30),
                Validators.required
            ]),
            expand: new FormControl(this.cell.metadata.polypheny?.expand_params || false),
        });
        if (this.cellType === 'poly') { // cell-type was already poly when loaded
            this.cell.metadata.polypheny.language = this.polyForm.value.language;
            this.cell.metadata.polypheny.namespace = this.polyForm.value.namespace;
            this.cell.metadata.polypheny.result_variable = this.polyForm.value.variable;
            this.cell.metadata.polypheny.expand_params = this.polyForm.value.expand;
        }
    }

    onFocus(event: MouseEvent) {
        if (!this.isFocused) {
            const target = event.target as HTMLElement;
            if (!target.classList.contains('no-select-cell')) {
                this.selected.emit(this.cell.id);
            }
        }
    }

    onEditorFocus() {
        this.editMode();
    }

    onEditorBlur() {
        this.commandMode();
    }

    editMode() {
        if (this.mode === 'edit') {
            return;
        }
        this.isMdRendered = false;
        this.editor.focus();
        this.mode = 'edit';
        this.modeChange.emit(this.mode);
        this.setSourceHidden(false);
    }

    commandMode() {
        this.editor.blur();
        this.mode = 'command';
        this.modeChange.emit(this.mode);
    }


    onMouseEnter() {
        this.isMouseOver = true;

    }

    onMouseLeave() {
        this.isMouseOver = false;
        this.updateSource();
    }

    executeCell() {
        this.updateSource();
        this.execute.emit(this.id);
    }

    updateSource() {
        if (!this.isMdRendered) {
            this.cell.source = this.editor.getCode();
        }
    }

    renderMd() {
        this.mdSource = Array.isArray(this.cell.source) ? this.cell.source.join('') : this.cell.source;
        if (!this.mdSource) {
            this.mdSource = 'Empty Markdown Cell';
        }
        this.isMdRendered = true;
    }

    renderError(output: CellErrorOutput) {
        if (output) {
            this.errorHtml = this._sanitizer.bypassSecurityTrustHtml(this.ansi_up.ansi_to_html(output.traceback.join('\n')));
        }
    }

    renderResultSet() {
        if (this.cellType === 'poly') {
            const output = <CellDisplayDataOutput>this.cell.outputs.find(o => o.output_type === 'display_data'
                && (<CellDisplayDataOutput>o).data['application/json']);
            if (output) {
                const jsonResult = <ResultSet>(output.data['application/json']);
                if (jsonResult.data?.length > 1000) {
                    this.resultIsTooLong = true;
                    jsonResult.data = jsonResult.data.slice(0, 1000);
                } else {
                    this.resultIsTooLong = false;
                }
                    this.resultVariable = output.metadata.polypheny?.result_variable;
                this.resultSet = jsonResult;
            } else {
                this.resultSet = null;
            }
        }
    }

    deleteCell() {
        if (!this.confirmingDeletion) {
            this.confirmingDeletion = true;
            return;
        }
        this.delete.emit(this.id);
    }

    resetDeleteConfirm() {
        this.confirmingDeletion = false;
    }

    onReady() {
        const images = document.querySelectorAll('.nb-markdown img');
        for (let i = 0; i < images.length; i++) {
            const image = images[i] as HTMLElement;
            image.style.maxWidth = '100%';
        }

        const tables = document.querySelectorAll('.nb-markdown table');
        for (let i = 0; i < tables.length; i++) {
            const table = tables[i] as HTMLElement;
            table.classList.add('table', 'table-hover', 'table-striped', 'table-borderless'); //'table table-hover table-striped table-borderless'
        }
    }

    updateCellType() {
        if (this.cell.metadata.polypheny?.cell_type === 'poly') {
            this.cellType = 'poly';
        } else {
            this.cellType = this.cell.cell_type;
        }
        this.manualExecution = this.cell.metadata.polypheny?.manual_execution;
        this.sourceHidden = this.cell.metadata.jupyter?.source_hidden;
        this.outputsHidden = this.cell.metadata.jupyter?.outputs_hidden;
    }

    changedNamespace() {
        this.cell.metadata.polypheny.namespace = this.polyForm.value.namespace;
    }

    changedLanguage() {
        this.cell.metadata.polypheny.language = this.polyForm.value.language;
    }

    changedVariableName() {
        this.cell.metadata.polypheny.result_variable = this.polyForm.valid ? this.polyForm.value.variable : '';
    }

    toggledExpansion() {
        this.cell.metadata.polypheny.expand_params = this.polyForm.value.expand;
    }

    toggledManual() {
        this.manualExecution = !this.manualExecution;
        if (!this.cell.metadata.polypheny) {
            this.cell.metadata.polypheny = {};
        }
        this.cell.metadata.polypheny.manual_execution = this.manualExecution;
    }

    setSourceHidden(hide: boolean) {
        this.sourceHidden = hide;
        if (!this.cell.metadata.jupyter) {
            this.cell.metadata.jupyter = {};
        }
        this.cell.metadata.jupyter.source_hidden = hide;
    }

    setOutputsHidden(hide: boolean) {
        this.outputsHidden = hide;
        if (!this.cell.metadata.jupyter) {
            this.cell.metadata.jupyter = {};
        }
        this.cell.metadata.jupyter.outputs_hidden = hide;
    }

    get source(): string {
        return (typeof this.cell.source === 'string') ?
            this.cell.source : this.cell.source.join('/n');
    }


    get id(): string {
        return this.cell.id;
    }
}
