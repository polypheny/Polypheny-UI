import {Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import {TableConfig} from '../../components/data-table/table-config';
import * as ace from 'ace-builds'; // ace module ..
import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/theme-tomorrow';
import {CrudService} from '../../services/crud.service';
import {ResultSet} from '../../components/data-table/models/result-set.model';
import {SqlHistory} from './sql-history.model';
import {KeyValue} from '@angular/common';
import * as $ from 'jquery';
import {QueryRequest} from '../../models/ui-request.model';
import {SidebarNode} from '../../models/sidebar-node.model';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {InformationObject, InformationPage} from '../../models/information-page.model';
import {TreeNode } from 'angular-tree-component';
import {BreadcrumbService} from '../../components/breadcrumb/breadcrumb.service';

const THEME = 'ace/theme/tomorrow';
const LANG = 'ace/mode/sql';

//ace editor: see: https://medium.com/@ofir3322/create-an-online-ide-with-angular-6-nodejs-part-1-163a939a7929

@Component({
  selector: 'app-sql-console',
  templateUrl: './sql-console.component.html',
  styleUrls: ['./sql-console.component.scss']
})
export class SqlConsoleComponent implements OnInit, OnDestroy {

  @ViewChild( 'editor' ) codeEditorElmRef: ElementRef;
  private codeEditor: ace.Ace.Editor;

  myForm: FormGroup;
  languages = ['SQL', 'PgSql', 'MS-SQL'];
  debugOptionsCollapsed = true;
  history: Map<string, SqlHistory> = new Map<string, SqlHistory>();
  readonly MAXHISTORY = 20;//maximum items in history

  resultSets: ResultSet[];
  debug: InformationPage;
  debugId: string;//current debug id

  tableConfig: TableConfig = {
    create: false,
    update: false,
    delete: false,
    sort: false,
    search: false
  };

  constructor(
    private formBuilder: FormBuilder,
    private _crud: CrudService,
    private _leftSidebar: LeftSidebarService,
    private _breadcrumb: BreadcrumbService
  ) {
    //when leaving the page, close a debugger
    const self = this;
    window.onbeforeunload = function(e) {
      if( self.debugId ){
        self._crud.closeDebugger( self.debugId ).subscribe();
      }
    };
  }

  ngOnInit() {
    this.initEditor();
    this.initWebsocket();
    this.loadDebugPages();
    this.myForm = this.formBuilder.group({
      lang: 'SQL'
    });

    SqlHistory.fromJson( localStorage.getItem( 'sql-history' ), this.history );
  }

  ngOnDestroy(){
    this._leftSidebar.clearAction();
    this._crud.closeDebugger( this.debugId ).subscribe();
  }

  //when leaving the page


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
    //remove comments from query before sending it to the server
    let query = '';
    $('#sql-editor .ace_content').clone().find('.ace_comment').remove().end().find('.ace_line').each(function(){
      query = query + $(this).text()+'\n';
    });

    this.addToHistory( this.codeEditor.getValue() );
    this._leftSidebar.setNodes([]);
    //close the previous debugger
    if( this.debugId ){
      this._crud.closeDebugger( this.debugId ).subscribe(
        res => {},
        err => {}
      );
    }
    this.debug = null;

    this._crud.anyQuery( new QueryRequest( query ) ).subscribe(
        res => {
          this.resultSets = <ResultSet[]> res;
        }, err => {
          this.resultSets = [new ResultSet( err.message )];
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

  initWebsocket() {
    this._crud.onSocketEvent().subscribe(
      msg => {

        //if msg contains nodes of the sidebar
        if(Array.isArray( msg )){
          const sidebarNodes: SidebarNode[] = <SidebarNode[]> msg;
          //set debugId to close it when leaving the page.
          if(sidebarNodes.length > 0 ){
            const split = sidebarNodes[0].routerLink.split('/');
            this.debugId = split[0];
          }
          this._leftSidebar.setNodes(sidebarNodes);
          if(sidebarNodes.length > 0) this._leftSidebar.open();
          else this._leftSidebar.close();
        }

        //if msg contains a notification of a changed information object
        else if( msg.type ){
          if(this.debug){
            const group = this.debug.groups[msg.informationGroup];
            if( group != null ){
              group.informationObjects[msg.id] = <InformationObject> msg;
            }
          }
        }
      },
      err => {
        this._leftSidebar.setError('Lost connection with the server.');
      });
  }

  loadDebugPages() {
    this._leftSidebar.setAction( ( node: TreeNode ) => {
      const split = node.data.routerLink.split('/');
      const debugId = split[0];
      const debugPage = split[1];
      if( debugId !== undefined && debugPage !== undefined ){
        this._crud.getDebugPage( debugId, debugPage ).subscribe(
          res => {
            this.debug = <InformationPage> res;
            node.setIsActive(true);
          }, err => {
            console.log(err);
          }
        );
      }
    });
  }

}
