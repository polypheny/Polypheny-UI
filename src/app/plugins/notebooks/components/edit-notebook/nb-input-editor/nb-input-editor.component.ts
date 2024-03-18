import {AfterViewInit, Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild} from '@angular/core';
import {CellType} from '../notebook-wrapper';
import {EditorComponent} from '../../../../../components/editor/editor.component';

@Component({
  selector: 'app-nb-input-editor',
  templateUrl: './nb-input-editor.component.html',
  styleUrls: ['./nb-input-editor.component.scss']
})
export class NbInputEditorComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() type: CellType;
  @Input() nbLanguage: string; // cannot change while a notebook is open
  @Input() polyLanguage: 'cypher' | 'mql' | 'cql' | 'sql' | 'pig';
  @ViewChild('editor') editor: EditorComponent;

  editorLanguage = 'python';

  editorOptions = {
    minLines: 4,
    maxLines: 60,
    showLineNumbers: false,
    highlightGutterLine: false,
    highlightActiveLine: false,
    fontSize: '0.875rem'
  };


  constructor() {
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.editor.setScrollMargin(5, 5);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.type) {
      this.updateEditorLanguage();
    } else if (changes.polyLanguage) {
      this.updateEditorLanguage();
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

  private updateEditorLanguage() {
    switch (this.type) {
      case 'markdown':
        this.editorLanguage = 'markdown';
        break;
      case 'code':
        this.editorLanguage = this.nbLanguage;
        break;
      case 'poly':
        this.editorLanguage = this.polyLanguage;
        break;
      case 'raw':
        this.editorLanguage = 'python'; // could be anything
    }
  }

}
