import {AfterViewInit, Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild} from '@angular/core';
import {CellType} from '../notebook-wrapper';
import {EditorComponent} from '../../../../../../components/editor/editor.component';

@Component({
    selector: 'app-nb-input-editor',
    templateUrl: './nb-input-editor.component.html',
    styleUrls: ['./nb-input-editor.component.scss']
})
export class NbInputEditorComponent implements OnInit, OnChanges {
    @Input() type: CellType;
    @ViewChild('codeEditor') codeEditor: EditorComponent;
    @ViewChild('mdEditor') mdEditor: EditorComponent;


    constructor() {
    }

    ngOnInit(): void {
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.type?.previousValue) {
            //console.log('try to change...', changes.type);
            //this.changeEditor(changes.type.previousValue, changes.type.currentValue);
        }
    }

    setCode(code: string) {
        this.editor.setCode(code);
    }

    getCode(): string {
        return this.editor.getCode();
    }

    focus() {
        this.editor.focus();
    }

    blur() {
        this.editor.blur();
    }

    /*private changeEditor(oldType: CellType, newType: CellType) {
        console.log('changing from', oldType, 'to', newType);
        const code = this.getEditor(oldType).getCode();
        this.getEditor(newType).setCode(code);
    }*/

    private getEditor(type: CellType): EditorComponent {
        return this.codeEditor;
        /*switch (type) {
            case 'code':
                return this.codeEditor;
            case 'markdown':
                return this.mdEditor;
            default:
                return this.codeEditor;
        }*/
    }

    get editor(): EditorComponent {
        return this.getEditor(this.type);
    }

}
