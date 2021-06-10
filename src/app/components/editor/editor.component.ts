import {AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild} from '@angular/core';
import * as ace from 'ace-builds'; // ace module ..
import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/mode-java';
import 'ace-builds/src-noconflict/theme-tomorrow';
import 'ace-builds/src-noconflict/ext-language_tools';
import {CrudService} from '../../services/crud.service';
import {SchemaRequest} from '../../models/ui-request.model';
import {SidebarNode} from '../../models/sidebar-node.model';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})

//ace editor: see: https://medium.com/@ofir3322/create-an-online-ide-with-angular-6-nodejs-part-1-163a939a7929

export class EditorComponent implements OnInit, AfterViewInit {

  @ViewChild( 'editor', {static: false}) codeEditorElmRef: ElementRef;
  private codeEditor: ace.Ace.Editor;
  @Input() readonly ? = false;
  @Input() theme ? = 'tomorrow';
  @Input() lang ? = 'sql';
  @Input() code ?;

  suggestions: string[] = [];

  constructor( private _crud: CrudService ) {
    this._crud.getSchema( new SchemaRequest( '', true, 3 , true) ).subscribe(
      res => {
        const map = this.computeSuggestions( <SidebarNode[]> res );
        map.forEach((v, k) => {
          this.suggestions.push( v );
        });
      }
    );
  }

  ngOnInit() {

  }

  ngAfterViewInit(): void {
    this.initEditor();
    if(this.code) this.codeEditor.setValue(this.code, -1);
    this.codeEditor.resize();
  }

  initEditor () {
    const element = this.codeEditorElmRef.nativeElement;
    const editorOptions: Partial<ace.Ace.EditorOptions> = {
      highlightActiveLine: true
    };

    //from: https://github.com/angular-ui/ui-ace/issues/44
    //setting paths for ace editor dependencies
    const defaultPath = ace.config.get( 'basePath' );
    // set your path here
    const path = defaultPath.indexOf( '../node_modules/ace-builds/src-min-noconflict' ) === -1 ? './js/ace' : defaultPath;
    ace.config.set( 'basePath', path );
    ace.config.set( 'modePath', path );
    ace.config.set( 'themePath', path );
    ace.config.set( 'workerPath', path );

    this.codeEditor = ace.edit( element, editorOptions );
    this.codeEditor.setTheme( 'ace/theme/' + this.theme );
    this.codeEditor.getSession().setMode( 'ace/mode/' + this.lang );
    this.codeEditor.setShowFoldWidgets( true ); // for the scope fold feature
    this.codeEditor.setShowPrintMargin(false); // https://stackoverflow.com/questions/14907184/is-there-a-way-to-hide-the-vertical-ruler-in-ace-editor
    if( this.readonly === true ) {
      this.codeEditor.setReadOnly(true);
      // from https://stackoverflow.com/questions/32806060/is-there-a-programmatic-way-to-hide-the-cursor-in-ace-editor
      this.codeEditor.renderer.setShowGutter(false);
      // from https://stackoverflow.com/questions/28283344/is-there-a-way-to-hide-the-line-numbers-in-ace-editor
      this.codeEditor.setHighlightActiveLine(false);
    }
    this.setAutocomplete();
  }

  getCode(){
    return this.codeEditor.getValue();
  }

  setCode ( code: string ) {
    if( this.codeEditor) {this.codeEditor.setValue( code, 1 );}
  }

  // from: https://stackoverflow.com/questions/30041816/ace-editor-autocomplete-custom-strings
  setAutocomplete(){
    this.codeEditor.setOptions({ enableLiveAutocompletion: true });
    const self = this;
    const staticWordCompleter = {
      getCompletions: function( editor, session, pos, prefix, callback ){
        const wordList = self.suggestions;
        callback(null, wordList.map(function(word) {
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
  computeSuggestions( tree: SidebarNode[] ){
    let map = new Map<string, string>();
    tree.forEach( ( v, k ) => {
      map = this.suggestionBuilder( v, map );
    });
    return map;
  }

  /**
   * recursive function to build map with all schemas, tables and columns
   */
  suggestionBuilder( node: SidebarNode, map: Map<string, string> ){
    map.set( node.name, node.name );
    if( node.children.length > 0 ){
      node.children.forEach( (v, n) => {
        map = this.suggestionBuilder( v, map );
      });
    }
    return map;
  }

}
