import {AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild} from '@angular/core';
import * as $ from 'jquery';
import * as ace from 'ace-builds'; // ace module ..
import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/theme-tomorrow';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})

//ace editor: see: https://medium.com/@ofir3322/create-an-online-ide-with-angular-6-nodejs-part-1-163a939a7929

export class EditorComponent implements OnInit, AfterViewInit {

  @ViewChild( 'editor' ) codeEditorElmRef: ElementRef;
  private codeEditor: ace.Ace.Editor;
  @Input() readonly ? = false;
  @Input() theme ? = 'tomorrow';
  @Input() lang ? = 'sql';
  @Input() code ?;
  @Input() height ? = '50px';

  THEME = 'ace/theme/' + this.theme;
  LANG = 'ace/mode/' + this.lang;

  constructor() {}

  ngOnInit() {
    this.initEditor();
  }

  ngAfterViewInit(): void {
    if(this.code) this.codeEditor.setValue(this.code);
    $('#editor-wrapper').height(this.height);
    this.codeEditor.resize();
  }

  initEditor () {
    const element = this.codeEditorElmRef.nativeElement;
    const editorOptions: Partial<ace.Ace.EditorOptions> = {
      highlightActiveLine: true,
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
    this.codeEditor.setTheme( this.THEME );
    this.codeEditor.getSession().setMode( this.LANG );
    this.codeEditor.setShowFoldWidgets( true ); // for the scope fold feature
    if( this.readonly === true ) {
      this.codeEditor.setReadOnly(true);
      // from https://stackoverflow.com/questions/32806060/is-there-a-programmatic-way-to-hide-the-cursor-in-ace-editor
      this.codeEditor.renderer.setShowGutter(false);
      // from https://stackoverflow.com/questions/28283344/is-there-a-way-to-hide-the-line-numbers-in-ace-editor
      this.codeEditor.setHighlightActiveLine(false);
    }
  }

  getCode(){
    return this.codeEditor.getValue();
  }

  getCodeWithoutComments() {
    let query = '';
    $('#editor').clone().find('.ace_comment').remove().end().find('.ace_line').each(function(){
      query = query + $(this).text()+'\n';
    });
    return query;
  }

  setCode ( code: string ) {
    if( this.codeEditor) this.codeEditor.setValue( code, 1 );
  }

}
