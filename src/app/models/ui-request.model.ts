import {SortState} from '../components/data-table/models/sort-state.model';
import {DbColumn, TableConstraint} from '../components/data-table/models/result-set.model';

export class UIRequest {
  tableId: string;
  currentPage: number;
  data: Map<string, string>;
  filter: Map<string, string>;
  sortState: Map<string, SortState>;
  query: string;
  views: boolean;
}

export class TableRequest extends UIRequest {
  constructor ( tableId: string, currentPage: number, filter: any = null, sortState: any = null ) {
    super();
    this.tableId = tableId;
    this.currentPage = currentPage;
    this.filter = filter;
    this.sortState = sortState;
    return this;
  }
}

export class QueryRequest extends UIRequest {
  constructor ( query: string ) {
    super();
    this.query = query;
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

  constructor( routerLinkRoot: string, views: boolean ) {
    super();
    this.routerLinkRoot = routerLinkRoot;
    this.views = views;
  }
}

export class ColumnRequest extends UIRequest {
  oldColumn: DbColumn;
  newColumn: DbColumn;
  constructor( tableId: string, oldColumn: DbColumn = null, newColumn: DbColumn = null ) {
    super();
    this.tableId = tableId;
    this.oldColumn = oldColumn;
    this.newColumn = newColumn;
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
  constructor ( schema:string, table:string = null, action:string = null, columns:DbColumn[] = null) {
    this.schema = schema;
    this.table = table;
    this.action = action;
    this.columns = columns;
  }
  getAction () {
    return this.action;
  }
}

/**
 * Request to drop or create a constraint of a table
 */
export class ConstraintRequest {
  constructor ( private table: string, private constraint: TableConstraint ) {}
}
