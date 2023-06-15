import {
    AfterViewInit,
    Component, ElementRef,
    EventEmitter,
    Input,
    OnInit,
    Output,
    ViewChild,
} from '@angular/core';
import {CellErrorOutput, NotebookCell} from '../../../../models/notebook.model';
import {default as AnsiUp} from 'ansi_up';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {KatexOptions, MarkdownService} from 'ngx-markdown';
import {NbMode} from '../edit-notebook.component';
import {NbInputEditorComponent} from '../nb-input-editor/nb-input-editor.component';
import {CellType} from '../notebook-wrapper';

@Component({
    selector: 'app-nb-cell',
    templateUrl: './nb-cell.component.html',
    styleUrls: ['./nb-cell.component.scss'],
})
export class NbCellComponent implements OnInit, AfterViewInit {
    @Input() cell: NotebookCell;
    @Input() isFocused: boolean;
    @Input() isExecuting: boolean;
    @Input() mode: NbMode;
    @Input() selectedCellType: CellType;
    @Output() modeChange = new EventEmitter<NbMode>();
    @Output() insert = new EventEmitter<boolean>(); // true: below, false: above
    @Output() execute = new EventEmitter<string>();
    @Output() changeType = new EventEmitter<Event>();
    @Output() delete = new EventEmitter<string>();
    @Output() selected = new EventEmitter<string>();
    @ViewChild('editor') editor: NbInputEditorComponent;
    @ViewChild('cellDiv') cellDiv: ElementRef;

    isMouseOver = false;
    private ansi_up = new AnsiUp();
    mdSource = '';
    errorHtml: SafeHtml;
    isMdRendered = false;
    confirmingDeletion = false;

    // https://katex.org/docs/options.html
    public options: KatexOptions = {
        throwOnError: false,
        errorColor: '#f86c6b'
    };

    constructor(private _sanitizer: DomSanitizer,
                private _markdown: MarkdownService) {
    }

    ngOnInit(): void {
        this.ansi_up.escape_html = true; // prevent xss
        if (this.cell.cell_type === 'markdown') {
            this.isMdRendered = true;
            this.mdSource = Array.isArray(this.cell.source) ? this.cell.source.join('') : this.cell.source;
        }
    }

    ngAfterViewInit(): void {
        this.editor.setCode(this.source);
        if (this.isFocused && this.mode === 'edit') {
            this.editor.focus();
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
        this.isMdRendered = true;

    }

    renderError(output: CellErrorOutput) {
        if (output) {
            this.errorHtml = this._sanitizer.bypassSecurityTrustHtml(this.ansi_up.ansi_to_html(output.traceback.join('\n')));
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

    get source(): string {
        return (typeof this.cell.source === 'string') ?
            this.cell.source : this.cell.source.join('/n');
    }

    get id(): string {
        return this.cell.id;
    }


    onReady() {
        const elements = document.querySelectorAll('.nb-markdown img');
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i] as HTMLElement;
            element.style.maxWidth = '100%';
        }
    }
}
