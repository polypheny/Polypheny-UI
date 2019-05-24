import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import {TableConfig} from '../../components/data-table/table-config';
import * as ace from 'ace-builds'; // ace module ..
import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/theme-tomorrow';
import {CrudService, QueryRequest, UIRequest} from '../../services/crud.service';
import {ResultSet} from '../../components/data-table/models/result-set.model';
import {SqlHistory} from './sql-history.model';
import {KeyValue} from '@angular/common';

const THEME = 'ace/theme/tomorrow';
const LANG = 'ace/mode/sql';

//ace editor: see: https://medium.com/@ofir3322/create-an-online-ide-with-angular-6-nodejs-part-1-163a939a7929

@Component({
  selector: 'app-sql-console',
  templateUrl: './sql-console.component.html',
  styleUrls: ['./sql-console.component.scss']
})
export class SqlConsoleComponent implements OnInit {

  @ViewChild( 'editor' ) codeEditorElmRef: ElementRef;
  private codeEditor: ace.Ace.Editor;

  myForm: FormGroup;
  languages = ['SQL', 'PgSql', 'MS-SQL'];
  debugOptionsCollapsed = true;
  //history: SqlHistory[] = [];
  history: Map<string, SqlHistory> = new Map<string, SqlHistory>();
  readonly MAXHISTORY = 10;//maximum items in history

  resultSet: ResultSet;
  tableConfig: TableConfig = {
    create: false,
    update: false,
    delete: false,
    sort: false,
    search: false
  };

  data = [
    ['a', 'b', 'c', 'd', 'e', 'f'],
    ['a', 'b', 'c', 'd', 'e', 'f']
  ];
  config:TableConfig = {
    create:false
  };

  constructor( private formBuilder: FormBuilder, private _crud: CrudService ) {}

  ngOnInit() {
    this.initEditor();
    this.myForm = this.formBuilder.group({
      lang: 'SQL'
    });

    SqlHistory.fromJson( localStorage.getItem( 'sql-history' ), this.history );
  }

  initEditor () {
    const element = this.codeEditorElmRef.nativeElement;
    const editorOptions: Partial<ace.Ace.EditorOptions> = {
      highlightActiveLine: true,
      minLines: 15,
      maxLines: Infinity
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
    this.codeEditor.setTheme( THEME );
    this.codeEditor.getSession().setMode( LANG );
    this.codeEditor.setShowFoldWidgets( true ); // for the scope fold feature
  }

  submitQuery () {
    const query = this.codeEditor.getValue();
    this.addToHistory( query );

    this._crud.anyQuery( new QueryRequest( query ) ).subscribe(
        res => {
            const result: ResultSet = <ResultSet> res;
            this.resultSet = result;
        }, err => {
          this.resultSet = new ResultSet( err.message );
    });
  }

  addToHistory ( query: string ):void {
    if ( this.history.size >= this.MAXHISTORY ) {
      let h: SqlHistory = new SqlHistory( '' );
      this.history.forEach( ( val, key ) => {
        if ( val.time < h.time ) h = val;
      });
      this.history.delete( h.query );
    }
    const newHistory = new SqlHistory( query );
    this.history.set ( newHistory.query, newHistory );

    localStorage.setItem( 'sql-history', JSON.stringify( Array.from( this.history.values() )));
  }

  applyHistory ( query: string, run:boolean ) {
    this.codeEditor.setValue( query );
    if ( run ) {
      this.submitQuery();
    }
  }

  //from: https://stackoverflow.com/questions/52793944/angular-keyvalue-pipe-sort-properties-iterate-in-order
  orderHistory ( a: KeyValue<string, SqlHistory>, b: KeyValue<string, SqlHistory> ) {
    return a.value.time > b.value.time ? -1 : ( b.value.time > a.value.time ? 1 : 0 );
  }

}
