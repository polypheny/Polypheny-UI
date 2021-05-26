import {SortState} from '../components/data-view/models/sort-state.model';
import {DbColumn, TableConstraint} from '../components/data-view/models/result-set.model';
import {Node} from '../views/querying/relational-algebra/relational-algebra.model';

export class UIRequest {
  requestType = 'UIRequest';
  tableId: string;
  currentPage: number;
  data: Map<string, string>;
  filter: Map<string, string>;
  sortState: Map<string, SortState>;
}

export class TableRequest extends UIRequest {
  requestType = 'TableRequest';
  constructor ( tableId: string, currentPage: number, filter: any = null, sortState: any = null ) {
    super();
    this.tableId = tableId;
    this.currentPage = currentPage;
    this.filter = filter;
    this.sortState = sortState;
    return this;
  }
}

export class RelAlgRequest extends UIRequest {
  requestType = 'RelAlgRequest';
  topNode: Node;
  constructor( node: Node ) {
    super();
    this.topNode = node;
  }
}

export class QueryRequest extends UIRequest {
  requestType = 'QueryRequest';
  query: string;
  analyze: boolean;
  constructor ( query: string, analyze: boolean ) {
    super();
    this.query = query;
    this.analyze = analyze;
    return this;
  }
}

export class QueryExplorationRequest extends UIRequest {
  query: string;
  analyze: boolean;
  cPage: number;
  constructor ( query: string, analyze: boolean, cPage: number ) {
    super();
    this.query = query;
    this.analyze = analyze;
    this.cPage = cPage;
    return this;
  }
}

/**
 * Request to classify data
 */
export class ClassifyRequest{
  id: number;
  header: DbColumn[];
  classified: string[][];
  cPage: number;
  constructor ( id: number, header: DbColumn[], classified: string[][], cPage: number ) {
    this.id = id;
    this.header = header;
    this.classified = classified;
    this.cPage = cPage;
    return this;
  }
}

export class Exploration{
  id: number;
  header: DbColumn[];
  classified: string[][];

  constructor( id: number, header: DbColumn[], classified: string[][]) {
    this.id = id;
    this.header = header;
    this.classified = classified;

  }
}

export class ExploreTable extends UIRequest{
  id: number;
  header: DbColumn[];
  cPage: number;

  constructor( id: number, header: DbColumn[], cPage: number) {
    super();
    this.id = id;
    this.header = header;
    this.cPage = cPage;
  }
}


export class StatisticRequest extends UIRequest {
  constructor (){
    super();
    return this;
  }
}

export class SchemaTypeRequest extends UIRequest{
  constructor() {
    super();
    return this;
  }

}

export class DeleteRequest extends UIRequest {
  constructor ( tableId: string, data: any) {
    super();
    this.tableId = tableId;
    this.data = data;
  }
}

/**
 * @param tableId name of the table
 * @param data the new values for the row that should be updated
 * @param filter the previous values of the row, to find the row that should be updated
 */
export class UpdateRequest extends UIRequest {
  constructor ( tableId: string, data: any, filter: any ){
    super();
    this.tableId = tableId;
    this.data = data;
    this.filter = filter;
  }
}

export class SchemaRequest extends UIRequest {
  routerLinkRoot: string;
  views: boolean;
  /**
   * depth 1: schemas
   * depth 2: schemas + tables
   * depth 3: schemas + tables + columns
   */
  depth: number;
  /**
   * if show table is false, "table" will not be shown in left sidebar
   */
  showTable: boolean;
  schemaEdit: boolean;
  constructor( routerLinkRoot: string, views: boolean, depth: number, showTable: boolean, schemaEdit?: boolean ) {
    super();
    this.routerLinkRoot = routerLinkRoot;
    this.views = views;
    this.depth = depth;
    this.showTable = showTable;
    this.schemaEdit = schemaEdit || false;
  }
}

export class ColumnRequest extends UIRequest {
  oldColumn: DbColumn;
  newColumn: DbColumn;
  renameOnly: boolean;
  constructor( tableId: string, oldColumn: DbColumn = null, newColumn: DbColumn = null, renameOnly = false ) {
    super();
    this.tableId = tableId;
    this.oldColumn = oldColumn;
    this.newColumn = newColumn;
    this.renameOnly = renameOnly;
  }
}

/**
 * Edit or create a Table
 * used for request where you want to truncate/drop a table
 * and when you want to create a new table
 */
export class EditTableRequest {
  schema: string;
  table: string;
  action: string;//truncate / drop
  columns: DbColumn[];
  store: string;

  constructor(schema: string, table: string = null, action: string = null, columns: DbColumn[] = null, store: string = null) {
    this.schema = schema;
    this.table = table;
    this.action = action;
    this.columns = columns;
    this.store = store;
  }

  getAction() {
    return this.action;
  }
}

/**
 * Request to drop or create a constraint of a table
 */
export class ConstraintRequest {
  constructor ( private table: string, private constraint: TableConstraint ) {}
}

/**
 * Send request to either create or drop a schema
 */
export class Schema {
  private name: string;
  private type: string;//todo enum

  // fields for creation
  create = false;
  ifNotExists = true;
  authorization: string = null;

  //fields for deletion
  drop = false;
  ifExists = true;
  cascade = false;

  constructor( name: string, type: string ) {
    this.name = name;
    this.type = type;
  }
  setCreate( create: boolean ){
    this.create = create;
    return this;
  }
  setAuthorization( auth: string ){
    this.authorization = auth;
    return this;
  }
  setDrop( drop: boolean ){
    this.drop = drop;
    return this;
  }
  setCascade( cascade: boolean ){
    this.cascade = cascade;
    return this;
  }

}
