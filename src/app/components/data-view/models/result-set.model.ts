import {SortState} from './sort-state.model';

/**
 * model for the result of a query coming from the server
 */

export class ResultSet {
  header: DbColumn[];
  data: string[][];
  hasMoreRows: boolean;
  currentPage: number;
  highestPage: number;
  table: string;
  tables: string[];
  error: string;
  exception: ResultException;
  affectedRows: number;
  generatedQuery: string;
  type: string;//"table" or "view"
  namespaceName: string;
  namespaceType = 'RELATIONAL';//"relational" or "document"
  language: string; //sql,mql,cql
  explorerId: number;
  classificationInfo: string;
  includesClassificationInfo: boolean;
  classifiedData: string[][];
  isConvertedToSql: boolean;

  constructor(error: string, generatedQuery = null, affectedRows = 0) {
    this.error = error;
    this.generatedQuery = generatedQuery;
    this.affectedRows = affectedRows;
  }
}

export class InfoSet extends ResultSet {


  constructor(error: string, generatedQuery: any, affectedRows: number) {
    super(error, generatedQuery, affectedRows);
  }
}

/**
 * model with classified data coming form server
 */
export class ExploreSet {
  header: DbColumn[];
  dataAfterClassification: String[];
  exploreManagerId;
  graph: String;
}

export class ExplorColSet {
  [column: string]: {}
}

export class SelectedColSet {
  [column: string]: {
    selected: string
  }
}

export class DashboardSet {

  availableAdapter: {};
  availableSchemas: {};
  catalogPersistent: boolean;
  numberOfCommits: number;
  numberOfRollbacks: number;
  numberOfQueries: number;
  numberOfWorkloads: number;

}

/**
 * model for statistics coming from the server
 */
export class StatisticSet {
  // error: string;
  [column: string]: {
    type: string[],
    min: null,
    max: null,
    check: string[],
    sort: string
  }

  constructor() {
    // this.error = error;
  }
}

export class StatisticTableSet {
  table: null;
  calls: TableCallSet;
  numberOfRows: null;
  alphabeticColumn: StatisticColumnSet;
  numericalColumn: StatisticColumnSet;
  temporalColumn: StatisticColumnSet;
  tableType: string;

  constructor() {
  }
}

export class TableCallSet {
  numberOfSelects: number;
  numberOfInserts: number;
  numberOfDeletes: number;
  numberOfUpdates: number;

  constructor() {
  }
}


export class StatisticColumnSet {

  [column: string]: {
    column: null,
    min: null,
    max: null,
    uniqueValues: null,
    full: null,
  }

  constructor() {
  }
}

/**
 * model for filtered options coming from user input
 */
export class FilteredUserInput {
  [column: string]: {}
}

export class DashboardData {
  column: {};

  constructor() {
  }
}

/**
 * Model for a column of a table
 */
export class DbColumn {
  //for both
  name: string;
  physicalName: string;

  //for the data-table
  sort: SortState;
  dataType: string;
  collectionsType: string;
  filter: string;

  //for editing columns
  primary: boolean;
  unique: boolean;
  nullable: boolean;
  precision: number;
  scale: number;
  defaultValue: any;
  dimension: number;
  cardinality: number;

  //for data sources
  as: string;

  constructor(
      name: string, primary: boolean = null, nullable: boolean = null, type: string = null, collectionsType: string = null, precision: number = null, scale: number, defaultValue: string = null, dimension: number = -1, cardinality: number = -1, as = null) {
    this.name = name;
    this.primary = primary;
    this.nullable = nullable;
    this.dataType = type;
    this.collectionsType = collectionsType;
    this.precision = precision;
    this.scale = scale;
    this.defaultValue = defaultValue;
    this.dimension = dimension;
    this.cardinality = cardinality;
    this.as = as;
  }

  static fromJson(obj) {
    return new DbColumn(obj.name, obj.primary, obj.nullable, obj.dataType, obj.collectionsType, obj.precision, obj.scale, obj.defaultValue, obj.dimension, obj.cardinality, obj.as);
  }
}

export interface PolyType {
  name: string;
  signatures: number;
}

/**
 * model for constraints of a table
 */
export class TableConstraint {
  name: string;
  type: string;
  deferrable: boolean;
  initially_deferred: boolean;
  columns: string[] = [];

  constructor(name: string, type: string = null, deferrable: boolean = null, initially_deferred: boolean = null) {
    this.name = name;
    this.type = type;
    this.deferrable = deferrable;
    this.initially_deferred = initially_deferred;
  }

  /**
   * add a column to a constraint (that possibly consists of multiple columns)
   */
  addColumn(col: string) {
    this.columns.push(col);
  }
}

/**
 * SQL Index of a table
 */
export class Index {
  constructor(
      private schema: string,
      private table: string,
      private name: string,
      private storeUniqueName: string,
      private method: string,
      private columns: string[]
  ) {
  }
}

export class AvailableIndexMethod {
  name: string;
  displayName: string;
}

/**
 * Status of an import or export operation
 */
export interface Status {
  context: string;
  totalRows: number;
  currentRow: number;
  status: number;
}

/**
 * Exception in a result message
 */
export interface ResultException {
  detailMessage: string;
  message: string;
  stackTrace: StackTrace[];
  cause: ResultException;
}

/**
 * Stacktrace in a ResultException
 */
export interface StackTrace {
  declaringClass: string;
  methodName: string;
  fileName: string;
  lineNumber: number;
}

export class PartitioningRequest {
  constructor(
      public schemaName: string = '',
      public tableName: string = '',
      public method: string = 'NONE',//enum in Java
      public numPartitions: number = 2,
      public column = ''
  ) {
  }
}

export class PartitionFunctionModel {
  title: string;
  description: string;
  columnNames: string[];
  rows: PartitionFunctionColumn[][];
  error: string;
  generatedQuery: string;
}

export class PartitionFunctionColumn {
  type: FieldType;
  mandatory: boolean;
  modifiable: boolean;
  value: string;
  options: string[];
}

/**
 * What kind of type to render in the UI, e.g. a number input, a select menu etc.
 */
export enum FieldType {
  STRING = 'STRING',
  INTEGER = 'INTEGER',
  LIST = 'LIST',
  LABEL = 'LABEL'
}

export class ModifyPartitionRequest {
  constructor(
      public schemaName: string,
      public tableName: string,
      public partitions: string[],
      public storeUniqueName: string
  ) {
  }
}

/**
 * How a ResultSet should be displayed
 */
export enum DataPresentationType {
  TABLE, CAROUSEL, CARD, GRAPH
}
