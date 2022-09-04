import {SortState} from '../components/data-view/models/sort-state.model';
import {DbColumn, TableConstraint} from '../components/data-view/models/result-set.model';
import {Node} from '../views/querying/relational-algebra/relational-algebra.model';

export class UIRequest {
  requestType = 'UIRequest';
  tableName: string;
  currentPage: number;
  data: Map<string, string>;
  filter: Map<string, string>;
  sortState: Map<string, SortState>;
}

export class TableRequest extends UIRequest {
  requestType = 'TableRequest';
  constructor ( tableName: string, currentPage: number, filter: any = null, sortState: any = null ) {
    super();
    this.tableName = tableName;
    this.currentPage = currentPage;
    this.filter = filter;
    this.sortState = sortState;
    return this;
  }
}

export class RelAlgRequest extends UIRequest {
  requestType = 'RelAlgRequest';
  topNode: Node;
  createView: boolean;
  analyze: boolean;
  tableType; string;
  viewName: string;
  store: string;
  freshness: string;
  interval;
  timeUnit: string;
  useCache: boolean;

  constructor( node: Node, cache: boolean, analyzeQuery: boolean, createView?: boolean, tableType?: string, viewName?: string, store?: string, freshness?: string, interval?, timeUnit?: string ) {
    super();
    this.topNode = node;
    this.useCache = cache;
    this.analyze = analyzeQuery;
    this.createView = createView || false;
    this.tableType = tableType || 'table';
    this.viewName = viewName || 'viewName';
    this.store = store || null;
    this.freshness = freshness || null;
    this.interval = interval || null;
    this.timeUnit = timeUnit || null;
  }
}

export class QueryRequest extends UIRequest {
  requestType = 'QueryRequest';
  query: string;
  analyze: boolean;
  language: string;
  database: string;
  cache: boolean;
  constructor ( query: string, analyze: boolean, cache: boolean, lang: string, database: string ) {
    super();
    this.query = query;
    this.analyze = analyze;
    this.cache = cache;
    this.language = lang;
    this.database = database;
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
  constructor (tableName?: string ){
    super();
    this.tableName = tableName || null;
    return this;
  }
}

export class MonitoringRequest extends UIRequest{
  constructor() {
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
  constructor ( tableName: string, data: any) {
    super();
    this.tableName = tableName;
    this.data = data;
  }
}

/**
 * @param tableName name of the table
 * @param data the new values for the row that should be updated
 * @param filter the previous values of the row, to find the row that should be updated
 */
export class UpdateRequest extends UIRequest {
  constructor ( tableName: string, data: any, filter: any ){
    super();
    this.tableName = tableName;
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
  tableType: string;
  constructor( tableName: string, oldColumn: DbColumn = null, newColumn: DbColumn = null, renameOnly = false, tableType:string = 'table' ) {
    super();
    this.tableName = tableName;
    this.oldColumn = oldColumn;
    this.newColumn = newColumn;
    this.renameOnly = renameOnly;
    this.tableType = tableType;
  }
}

export class TriggerRequest extends UIRequest {
  schema: string;
  tableName: string;

  constructor( schema: string, tableName: string ) {
    super();
    this.schema = schema;
    this.tableName = tableName;
  }
}

export class DropTriggerRequest extends UIRequest {
  schema: string;
  triggerName: string;

  constructor( schema: string, triggerName: string ) {
    super();
    this.schema = schema;
    this.triggerName = triggerName;
  }
}

export class MaterializedRequest extends UIRequest{
  constructor(tableName: string) {
    super();
    this.tableName = tableName;
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
  tableType: string;

  constructor(schema: string, table: string = null, action: string = null, columns: DbColumn[] = null, store: string = null, tableType: string = null) {
    this.schema = schema;
    this.table = table;
    this.action = action;
    this.columns = columns;
    this.store = store;
    this.tableType = tableType || 'TABLE';
  }

  getAction() {
    return this.action;
  }
}

export class EditCollectionRequest {
  database: string;
  collection: string;
  action: string;
  store: string;

  constructor(database: string, collection: string = null, action: string = null, store: string = null) {
    this.database = database;
    this.collection = collection;
    this.action = action;
    this.store = store;
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
