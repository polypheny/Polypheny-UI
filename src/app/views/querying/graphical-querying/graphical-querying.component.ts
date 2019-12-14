import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import * as $ from 'jquery';
import 'jquery-ui/ui/widget';
import 'jquery-ui/ui/widgets/sortable';
import 'jquery-ui/ui/widgets/draggable';
import {CrudService} from '../../../services/crud.service';
import {ResultSet, StatisticSet} from '../../../components/data-table/models/result-set.model';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {ToastService} from '../../../components/toast/toast.service';
import {EditTableRequest, QueryRequest, SchemaRequest, StatisticRequest} from '../../../models/ui-request.model';
import {SidebarNode} from '../../../models/sidebar-node.model';
import {ForeignKey, Uml} from '../../uml/uml.model';

@Component({
  selector: 'app-graphical-querying',
  templateUrl: './graphical-querying.component.html',
  styleUrls: ['./graphical-querying.component.scss'],
  encapsulation: ViewEncapsulation.None // new elements in sortable should have margin as well
})
export class GraphicalQueryingComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('editorGenerated', {static: false}) editorGenerated;
  generatedSQL;
  resultSet: ResultSet;
  filterSet = new StatisticSet();
  selectedColumn = {};
  loading = false;
  whereCounter = 0;


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
    this._leftSidebar.setSchema( new SchemaRequest( 'views/graphical-querying/', false, 3 ));
    this._leftSidebar.setAction( (node) => {
      if( ! node.isActive && node.isLeaf ){
        this.addCol(node.data);
        node.setIsActive(true, true);
      }
      else if (node.isActive && node.isLeaf ){
        node.setIsActive( false, true );
        this.removeCol( node.data.id );
      }
    });

    this.initGraphicalQuerying();

  }

  ngAfterViewInit() {
    this.generateSQL();
  }

  ngOnDestroy() {
    this._leftSidebar.close();
    // this._leftSidebar.reset();
  }

  initGraphicalQuerying() {
    const self = this;

    $('#selectBox').sortable({
      stop: function (e, ui) {
        self.generateSQL();
      },
      cursor: 'grabbing',
      containment: 'parent',
      tolerance: 'pointer'
    });

    $('#selectBox').on('click', 'div span.del', function() {
      const id = $(this).parent().attr('data-id');
      self.removeCol( id );
    });
  }

  removeCol ( colId: string ) {
    const data = colId.split('.');
    const tableId = data[0] + '.' + data[1];
    const tableCounter = this.tables.get( tableId );
    if( tableCounter === 1 ){
      this.tables.delete( tableId );
    } else {
      this.tables.set( tableId, tableCounter - 1 );
    }
    this.columns.delete( colId );

    $(`#selectBox [data-id="${colId}"]`).remove();
    this._leftSidebar.setInactive( colId );
    this.generateJoinConditions(); // re-generate join conditions
    this.generateSQL();
  }

  updatedFilter(update: Object){
    console.log(update);

    if(update['updateType'] === 'minmax'){
      console.log('im in first minmax');
      console.log(update);
      console.log(update['updateType']);
        if (this.filterSet.hasOwnProperty(update['name'])) {
            this.filterSet[update['name']]['min'] = update['event']['value'];
            this.filterSet[update['name']]['max'] = update['event']['highValue'];
        } else {
            this.filterSet[update['name']] = {
                min: update['event']['value'],
                max: update['event']['highValue'],
                type: [],
                check: []
            };
        }
    }
    if(update['updateType'] === 'check'){

        if (this.filterSet.hasOwnProperty(update['name'])) {
            if(this.filterSet[update['name']]['check'].includes(update['event'])){
              this.filterSet[update['name']]['check'].splice(this.filterSet[update['name']]['check'].indexOf(update['event']), 1);
            }else{
              this.filterSet[update['name']]['check'].push(update['event']);
            }
        } else {
            this.filterSet[update['name']] = {
                min: null,
                max: null,
                type: [],
                check: [update['event']]
            };
        }
    }


    console.log(this.filterSet);
    this.generateSQL();
  }

  generateSQL() {
    this.whereCounter = 0;

    if( this.columns.size === 0 ){
      this.editorGenerated.setCode( '' );
      return;
    }

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

    //to only show filters for selected tables/cols
    this.selectedCol(cols);

    //only for one table atm
    if (Object.keys(this.filterSet).length !== 0 && tables.length !== 0 && counter === 0){
      for (const col of cols){
        console.log(col);
        if(this.filterSet[col]){
          const data = this.filterSet[col];
          if (data['min']){
            sql += this.connectWheres() + col + ' >= ' + data['min'];
          }
          if (data['max']){
            sql += this.connectWheres() + col + ' <= ' + data['max'];
          }
          if (data['check'].length > 0){
            if (data['check'].length > 1){
              let checkData = [];
              for(let i = 0; i < data['check'].length; i++){
                if (isNaN(+data['check'][i])){
                  checkData[i] = '\'' + data['check'][i] + '\'';
                }else{
                  checkData[i] = +data['check'][i];
                }
              }
              sql += this.connectWheres() + col + ' IN ' + '(' + checkData + ')';
              checkData = [];
            }else{
              if (isNaN(+data['check'])){
                sql += this.connectWheres() + col + ' = ' + '\'' + data['check'] + '\'';
              }else{
                sql += this.connectWheres() + col + ' = ' +  +data['check'];
              }

            }
          }
        }
      }
    }
    this.generatedSQL = sql;
    this.editorGenerated.setCode( sql );
  }

  selectedCol(col: {}){
    this.selectedColumn = {
      column: col
    };
    console.log('in my selectedCol');
    console.log(this.selectedColumn);
  }

  connectWheres(){
    if(this.whereCounter === 0){
      this.whereCounter += 1;
      return "\nWHERE ";
    }else {
      return "\nAND ";
    }
  }

  executeQuery () {
    console.log("executeQuery Start");
    this.loading = true;
    this._crud.anyQuery( new QueryRequest( this.editorGenerated.getCode(), false ) ).subscribe(
      res => {
        const result = <ResultSet>res;
        this.resultSet = result[0];
        this.loading = false;
      }, err => {
        this._toast.toast('server error', 'Unknown error on the server.', 10, 'bg-danger');
        this.loading = false;
      }
    );
  }


  addCol(data){
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
    this.generateSQL();
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
