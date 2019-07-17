import {AfterViewInit, Component, OnDestroy, OnInit, ViewEncapsulation} from '@angular/core';
import * as $ from 'jquery';
import 'jquery-ui/ui/widget';
import 'jquery-ui/ui/widgets/sortable';
import 'jquery-ui/ui/widgets/draggable';
import {LogicalOperators, RelationalAlgebra} from './relational-algebra/relational-algebra.model';
import {CrudService} from '../../services/crud.service';
import {ResultSet} from '../../components/data-table/models/result-set.model';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {ToastService} from '../../components/toast/toast.service';
import {EditTableRequest, QueryRequest, SchemaRequest} from '../../models/ui-request.model';
import {SidebarNode} from '../../models/sidebar-node.model';
import {ForeignKey, Uml} from '../uml/uml.model';


@Component({
  selector: 'app-graphical-querying',
  templateUrl: './graphical-querying.component.html',
  styleUrls: ['./graphical-querying.component.scss'],
  encapsulation: ViewEncapsulation.None // new elements in sortable should have margin as well
})
export class GraphicalQueryingComponent implements OnInit, AfterViewInit, OnDestroy {

  generatedSQL;
  relAlg: RelationalAlgebra;
  resultSet: ResultSet;

  //fields for the graphical query generation
  schemas = new Map<string, string>();//schemaName, schemaName
  tables = new Map<string, number>();//tableName, number of columns of this table
  columns = new Map<string, SidebarNode>();//columnId, columnName
  umlData = new Map<string, Uml>();//schemaName, uml
  joinConditions = new Map<string, JoinCondition>();//id of column, generated query

  constructor(
    private _crud: CrudService,
    private _leftSidebar: LeftSidebarService,
    private _toast: ToastService
  ) {}

  ngOnInit() {

    this.initRelAlg();

    this._leftSidebar.setSchema( new SchemaRequest( 'views/graphical-querying/', false, 3 ));
    this._leftSidebar.setAction( (node) => false );

    this.generateSQL();

    this.initGraphicalQuerying();

  }

  ngAfterViewInit() { }

  ngOnDestroy() {
    RelationalAlgebra.resetId();
    this._leftSidebar.close();
  }

  initGraphicalQuerying() {
    const self = this;

    $('#selectBox').sortable({
      stop: function (e, ui) {
        self.generateSQL();
      }
    });

    $('#selectBox').on('click', 'div span.del', function() {
      const id = $(this).parent().attr('data-id');
      const data = id.split('.');
      const tableId = data[0] + '.' + data[1];
      const tableCounter = self.tables.get( tableId );
      if( tableCounter === 1 ){
        self.tables.delete( tableId );
      } else {
        self.tables.set( tableId, tableCounter - 1 );
      }
      self.columns.delete( id );

      self.generateJoinConditions(); // re-generate join conditions
      $(this).parent().remove();
    });

    $('#sqlInput').keyup(function () {
      self.generateSQL();
    });
  }

  generateSQL() {
    if( this.columns.size === 0 ) return;

    let sql = 'SELECT ';
    const cols = [];
    $('#selectBox').find('.dbCol').each( (i, el) => {
      cols.push( $(el).attr('data-id') );
    });
    sql += cols.join(', ');
    sql += '\nFROM ';
    const tables = [];
    this.tables.forEach( (v, k) => {
      tables.push( k );
    });
    sql += tables.join(', ');

    //get join conditions
    let counter = 0;
    const joinConditions = [];
    this.joinConditions.forEach((v, k) => {
      if( v.active ){
        counter ++;
        joinConditions.push( v.condition );
      }
    });
    if( counter > 0 ){
      sql += '\nWHERE ' + joinConditions.join(' AND ');
    }

    sql = sql + '\n' + $('#sqlInput').val();
    this.generatedSQL = sql;
  }

  executeQuery () {
    this._crud.anyQuery( new QueryRequest( this.generatedSQL, false ) ).subscribe(
      res => {
        const result = <ResultSet>res;
        this.resultSet = result[0];
      }, err => {
        this._toast.toast('server error', 'Unknown error on the server.', 10, 'bg-danger');
      }
    );
  }

  onTreeDrop(event){
    //const treeElement: SidebarNode = event.element.data;
    const data = event.element.data;
    const treeElement = new SidebarNode( data.id, data.name, null, null );

    if( this.columns.get( treeElement.id ) !== undefined ){
      //skip if already in select list
      return;
    } else {
      this.columns.set( treeElement.id, treeElement );
    }

    if( this.tables.get( treeElement.getTable() ) !== undefined ){
      this.tables.set( treeElement.getTable(), this.tables.get(treeElement.getTable()) + 1 );
    }else{
      this.tables.set( treeElement.getTable(), 1 );
    }
    
    if( this.schemas.get( treeElement.getSchema() ) === undefined ){
      this.schemas.set( treeElement.getSchema(), treeElement.getSchema() );
      this._crud.getUml( new EditTableRequest( treeElement.getSchema())).subscribe(
        res => {
          const uml = <Uml> res;
          this.umlData.set(treeElement.getSchema(), uml);
          this.generateJoinConditions();
        }, err => {
          this._toast.toast('server error', 'Could not get foreign keys of the schema '+treeElement.getSchema(), 10, 'bg-danger');
        }
      );
    }else{
      this.generateJoinConditions();
    }
    $('#selectBox').append(`<div class="btn btn-secondary btn-sm dbCol" data-id="${treeElement.id}">${treeElement.getColumn()} <span class="del">&times;</span></div>`).sortable('refresh');
    //$('#selectBox').append(`<div class="btn-group btn-group-sm dbCol"><button class="btn btn-primary" data-id="${treeElement.id}">${treeElement.name}</button><button class="btn btn-primary del">&times;</button></div>`).sortable('refresh');
    this.generateSQL();
  }

  /**
   * Create a RelAlg node to start with
   */
  initRelAlg(){
    this.relAlg = new RelationalAlgebra( LogicalOperators.LogicalAggregate, null );
  }

  toggleCondition( con: JoinCondition ){
    con.toggle();
    this.generateSQL();
  }

  /**
   * Generate the needed join conditions
   */
  generateJoinConditions () {
    this.joinConditions.clear();
    this.umlData.forEach( (uml, key ) => {
      uml.foreignKeys.forEach( ( fk: ForeignKey, key2 ) => {
        const fkId = fk.fkTableSchema + '.' + fk.fkTableName + '.' + fk.fkColumnName;
        const pkId = fk.pkTableSchema + '.' + fk.pkTableName + '.' + fk.pkColumnName;
        if ( this.tables.get( fk.pkTableSchema + '.' + fk.pkTableName ) !== undefined &&
             this.tables.get( fk.fkTableSchema + '.' + fk.fkTableName ) !== undefined ){
          this.joinConditions.set( fkId + pkId, new JoinCondition( fkId + ' = ' + pkId ) );
        }
      });
    });
  }

  /**
   * Parse the RelAlg tree and send it to the backend.
   */
  executeRelAlg () {
    this._crud.executeRelAlg( this.relAlg.forCrud() ).subscribe(
      res => {
        this.resultSet = <ResultSet> res;
      }, err => {
        this._toast.toast('server error', 'Could not execute relational algebra', 10, 'bg-danger');
        console.log(err);
      }
    );
  }

}

class JoinCondition {
  condition: string;
  active: boolean;
  constructor ( condition: string ) {
    this.condition = condition;
    this.active = true;
  }
  toggle(){
    this.active = !this.active;
  }
}
