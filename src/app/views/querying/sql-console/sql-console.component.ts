import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import { FormBuilder } from '@angular/forms';
import {TableConfig} from '../../../components/data-table/table-config';
import {CrudService} from '../../../services/crud.service';
import {ResultSet} from '../../../components/data-table/models/result-set.model';
import {SqlHistory} from './sql-history.model';
import {KeyValue} from '@angular/common';
import {QueryRequest} from '../../../models/ui-request.model';
import {SidebarNode} from '../../../models/sidebar-node.model';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {InformationObject, InformationPage} from '../../../models/information-page.model';
import {TreeNode } from 'angular-tree-component';
import {BreadcrumbService} from '../../../components/breadcrumb/breadcrumb.service';

@Component({
  selector: 'app-sql-console',
  templateUrl: './sql-console.component.html',
  styleUrls: ['./sql-console.component.scss']
})
export class SqlConsoleComponent implements OnInit, OnDestroy {

  @ViewChild( 'editor' ) codeEditor;

  history: Map<string, SqlHistory> = new Map<string, SqlHistory>();
  readonly MAXHISTORY = 20;//maximum items in history

  resultSets: ResultSet[];
  queryAnalysis: InformationPage;
  analyzerId: string;//current analyzer id
  analyzeQuery = true;
  showingAnalysis = false;
  websocketSubscription;

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
    //when leaving the page, close the queryAnalyzer
    const self = this;
    window.onbeforeunload = function(e) {
      if( self.analyzerId ){
        self._crud.closeAnalyzer( self.analyzerId ).subscribe();
      }
    };
    this.initWebsocket();
  }

  ngOnInit() {
    this.loadAnalyzerPages();
    SqlHistory.fromJson( localStorage.getItem( 'sql-history' ), this.history );
  }

  ngOnDestroy(){
    this._leftSidebar.close();
    this._crud.closeAnalyzer( this.analyzerId ).subscribe();
    this.websocketSubscription.unsubscribe();
  }

  submitQuery () {

    this.addToHistory( this.codeEditor.getCode() );
    this._leftSidebar.setNodes([]);
    if( this.analyzeQuery ) this._leftSidebar.open();
    else this._leftSidebar.close();
    //close the previous analyzer
    if( this.analyzerId ){
      this._crud.closeAnalyzer( this.analyzerId ).subscribe(
        res => {},
        err => {}
      );
    }
    this.queryAnalysis = null;

    this._crud.anyQuery( new QueryRequest( this.codeEditor.getCodeWithoutComments(), this.analyzeQuery ) ).subscribe(
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
    this.codeEditor.setCode( query );
    if ( run ) {
      this.submitQuery();
    }
  }

  //from: https://stackoverflow.com/questions/52793944/angular-keyvalue-pipe-sort-properties-iterate-in-order
  orderHistory ( a: KeyValue<string, SqlHistory>, b: KeyValue<string, SqlHistory> ) {
    return a.value.time > b.value.time ? -1 : ( b.value.time > a.value.time ? 1 : 0 );
  }

  initWebsocket() {
    this.websocketSubscription = this._crud.onSocketEvent().subscribe(
      msg => {

        //if msg contains nodes of the sidebar
        if(Array.isArray( msg )){
          const sidebarNodes: SidebarNode[] = <SidebarNode[]> msg;
          //set analyzerId to close it when leaving the page.
          if(sidebarNodes.length > 0 ){
            const split = sidebarNodes[0].routerLink.split('/');
            this.analyzerId = split[0];
          }
          sidebarNodes.unshift( new SidebarNode( 'sql-console', 'sql-console', 'fa fa-keyboard-o', '' ) );
          this._leftSidebar.setNodes(sidebarNodes);
          if(sidebarNodes.length > 0) {
            this._leftSidebar.open();
            const split = sidebarNodes[0].routerLink.split('/');
            const analyzerId = split[0];
            const analyzerPage = split[1];
          }
          else {
            this._leftSidebar.close();
          }
        }

        //if msg contains a notification of a changed information object
        else if( msg.type ){
          if(this.queryAnalysis){
            const group = this.queryAnalysis.groups[msg.informationGroup];
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

  loadAnalyzerPages() {
    this._leftSidebar.setAction( ( node: TreeNode ) => {
      if( node.data.id === 'sql-console' ){
        //this.queryAnalysis = null;
        this.showingAnalysis = false;
        node.setIsActive( true );
        return;
      }
      const split = node.data.routerLink.split('/');
      const analyzerId = split[0];
      const analyzerPage = split[1];
      if( analyzerId !== undefined && analyzerPage !== undefined ){
        this._crud.getAnalyzerPage( analyzerId, analyzerPage ).subscribe(
          res => {
            this.queryAnalysis = <InformationPage> res;
            this.showingAnalysis = true;
            node.setIsActive(true);
          }, err => {
            console.log(err);
          }
        );
      }
    });
  }

}
