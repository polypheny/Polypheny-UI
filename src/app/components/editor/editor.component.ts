import {
  AfterViewInit,
  Component,
  effect,
  ElementRef,
  inject,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  untracked,
  ViewChild
} from '@angular/core';
import * as ace from 'ace-builds'; // ace module ..
import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/mode-pgsql';
import 'ace-builds/src-noconflict/mode-java';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-markdown';
import 'ace-builds/src-noconflict/mode-pig';
import 'ace-builds/src-noconflict/theme-tomorrow';
import 'ace-builds/src-noconflict/ext-language_tools';
import {SidebarNode} from '../../models/sidebar-node.model';
import {CatalogService} from '../../services/catalog.service';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})

//ace editor: see: https://medium.com/@ofir3322/create-an-online-ide-with-angular-6-nodejs-part-1-163a939a7929

export class EditorComponent implements OnInit, AfterViewInit, OnChanges {

    public readonly _catalog = inject(CatalogService);

  @ViewChild('editor', {static: false}) codeEditorElmRef: ElementRef;
  private codeEditor: ace.Ace.Editor;
  @Input() readonly ? = false;
  @Input() theme ? = 'tomorrow';
  @Input() language ? = 'pgsql';
  @Input() initOptions ?: { [key: string]: any };
  @Input() autocomplete ? = true;
  @Input() useParentHeight ? = true;
  @Input() code ?;

  suggestions: string[] = [];
  private readonly supportedLanguages = ['pgsql', 'sql', 'java', 'python', 'markdown', 'pig'];

    constructor() {
    effect(() => {
      const catalog = this._catalog.listener();
      untracked(() => {
        const map = this.computeSuggestions(this._catalog.getSchemaTree('', true, 3));
        map.forEach((v, k) => {
          this.suggestions.push(v);
        });
      });
    });
  }

  ngOnInit() {

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.lang && !changes.lang.firstChange) {
      this.updateLanguage();
    }
    if (changes.autocomplete && !changes.autocomplete.firstChange) {
      this.updateAutocomplete();
    }
  }

  ngAfterViewInit(): void {
    this.initEditor();
    if (this.code) {
      this.codeEditor.setValue(this.code, -1);
    }
    this.codeEditor.resize();
  }

  blur() {
    this.codeEditor.blur();
  }

  focus() {
    this.codeEditor.focus();
  }

  initEditor() {
    const element = this.codeEditorElmRef.nativeElement;
    const editorOptions: Partial<ace.Ace.EditorOptions> = {
      highlightActiveLine: true
    };

    //from: https://github.com/angular-ui/ui-ace/issues/44
    //setting paths for ace editor dependencies
    const defaultPath = ace.config.get('basePath');
    // set your path here
    const path = defaultPath.indexOf('../node_modules/ace-builds/src-min-noconflict') === -1 ? './js/ace' : defaultPath;
    ace.config.set('basePath', path);
    ace.config.set('modePath', path);
    ace.config.set('themePath', path);
    ace.config.set('workerPath', path);

    this.codeEditor = ace.edit(element, editorOptions);
    this.codeEditor.setTheme('ace/theme/' + this.theme);
    this.updateLanguage();
    this.codeEditor.setShowFoldWidgets(true); // for the scope fold feature
    this.codeEditor.setShowPrintMargin(false); // https://stackoverflow.com/questions/14907184/is-there-a-way-to-hide-the-vertical-ruler-in-ace-editor
    if (this.readonly === true) {
      this.codeEditor.setReadOnly(true);
      // from https://stackoverflow.com/questions/32806060/is-there-a-programmatic-way-to-hide-the-cursor-in-ace-editor
      this.codeEditor.renderer.setShowGutter(false);
      // from https://stackoverflow.com/questions/28283344/is-there-a-way-to-hide-the-line-numbers-in-ace-editor
      this.codeEditor.setHighlightActiveLine(false);
    }
    if (this.autocomplete) {
      this.setAutocomplete();
    }
    if (this.initOptions) {
      this.codeEditor.setOptions(this.initOptions);
    }
  }

  getCode() {
    return this.codeEditor.getValue();
  }

  setCode(code: string) {
    if (this.codeEditor) {
      this.codeEditor.setValue(code, 1);
    }
  }

  // from: https://stackoverflow.com/questions/30041816/ace-editor-autocomplete-custom-strings
  setAutocomplete() {
    this.codeEditor.setOptions({enableLiveAutocompletion: true});
    const self = this;
    const staticWordCompleter = {
      getCompletions: function (editor, session, pos, prefix, callback) {
        const wordList = self.suggestions;
        callback(null, wordList.map(function (word) {
          return {
            caption: word,
            value: word,
            meta: 'static'
          };
        }));
      }
    };
    this.codeEditor['completers'].push(staticWordCompleter);
  }

  /**
   * Compute a map containing all schemas, tables and columns
   */
  computeSuggestions(tree: SidebarNode[]) {
    let map = new Map<string, string>();
    tree.forEach((v, k) => {
      map = this.suggestionBuilder(v, map);
    });
    return map;
  }

  /**
   * recursive function to build map with all schemas, tables and columns
   */
  suggestionBuilder(node: SidebarNode, map: Map<string, string>) {
    map.set(node.name, node.name);
    if (node.children.length > 0) {
      node.children.forEach((v, n) => {
        map = this.suggestionBuilder(v, map);
      });
    }
    return map;
  }

  /**
   * Change the syntax highlighting language to this.lang, if it is supported.
   * Otherwise, sql is used.
   */
  updateLanguage() {
    if (this.supportedLanguages.includes(this.language)) {
      this.codeEditor.getSession().setMode('ace/mode/' + this.language);
    } else {
      this.codeEditor.getSession().setMode('ace/mode/sql');

    }
  }

  updateAutocomplete() {
    if (this.autocomplete && !this.codeEditor['completers']) {
      this.setAutocomplete();
    } else {
      this.codeEditor.setOptions({enableLiveAutocompletion: this.autocomplete});
    }
  }

  setScrollMargin(top: number, bottom: number, left: number = 0, right: number = 0) {
    // https://groups.google.com/g/ace-discuss/c/LmMRaYnLzCk
    this.codeEditor.renderer.setScrollMargin(top, bottom, left, right);
  }

}
