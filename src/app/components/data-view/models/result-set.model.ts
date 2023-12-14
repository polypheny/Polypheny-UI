import {SortState} from './sort-state.model';
import {ColumnModel, EntityType} from '../../../models/catalog.model';
import {DataModel} from '../../../models/ui-request.model';
import {Pair} from '../../json/json-editor.component';

/**
 * model for the result of a query coming from the server
 */

export interface FieldDefinition {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue: string;
}

export class Result<D, H extends FieldDefinition | UiColumnDefinition> {
  dataModel: DataModel;
  namespace: string;
  query: string;
  data: D[];
  header: H[];
  exception: ResultException;
  error: string;
  language: QueryLanguage;
  hasMore: boolean;
  currentPage: number;
  highestPage: number;
  affectedTuples: number;
}


export class RelationalResult extends Result<string[], UiColumnDefinition> {
  table: string;
  tableId: number;
  tables: string[];
  error: string;
  type: EntityType;//"table" or "view"

  constructor(error: string, affectedRows = 0) {
    super();
    this.error = error;
    this.affectedTuples = affectedRows;
  }
}

export class RelationalExploreResult extends RelationalResult {
  explorerId: number;
  classificationInfo: string;
  includesClassificationInfo: boolean;
  classifiedData: string[][];
  isConvertedToSql: boolean;
}

export class GraphResult extends Result<string[], FieldDefinition> {

}

export class DocumentResult extends Result<string, FieldDefinition> {

}

export enum QueryLanguage {
  MQL = 'mql',
  MONGO = 'mongo',
  SQL = 'sql',
  CYPHER = 'cypher',
  CQL = 'cql'
}


export class InfoSet extends RelationalResult {


  constructor(error: string, generatedQuery: any, affectedRows: number) {
    super(error, affectedRows);
  }
}

/**
 * model with classified data coming form server
 */
export class ExploreSet {
  header: UiColumnDefinition[];
  dataAfterClassification: string[];
  exploreManagerId: number;
  graph: string;
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

  availableAdapter: { string: Pair };
  availableNamespaces: {};
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
export class UiColumnDefinition implements FieldDefinition {
  //for both
  name: string;
  id: number;
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
      id: number,
      name: string,
      primary: boolean = null,
      nullable: boolean = null,
      type: string = null,
      collectionsType: string = null,
      precision: number = null,
      scale: number,
      defaultValue: string = null,
      dimension: number = -1,
      cardinality: number = -1,
      as = null) {
    this.id = id;
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

  static fromModel(column: ColumnModel, primaries: number[]) {
    return new UiColumnDefinition(
        column.id,
        column.name,
        primaries.includes(column.id),
        column.nullable,
        column.type.name,
        column.collectionsType == null ? null : column.collectionsType.name,
        column.precision,
        column.scale,
        column.defaultValue,
        column.dimension,
        column.cardinality);
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
  id: number;
  name: string;
  type: string;
  deferrable: boolean;
  initially_deferred: boolean;
  columns: string[] = [];

  constructor(id: number, name: string = null, type: string = null, deferrable: boolean = null, initially_deferred: boolean = null) {
    this.id = id;
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
export class IndexModel {
  constructor(
      private namespaceId: number,
      private entityId: number,
      private name: string,
      private storeUniqueName: string,
      private method: string,
      private columnIds: number[]
  ) {
  }
}

export class EntityMeta {
  constructor(
      namespaceId: number,
      entityId: number,
      entityName: string,
      fields: number[] = []
  ) {
  }
}

export class PlacementMeta extends EntityMeta {
  constructor(
      namespaceId: number,
      entityId: number,
      entityName: string,
      private adapterId: number,
      private method: string,
      fields: number[]
  ) {
    super(namespaceId, entityId, entityName, fields);
  }
}

export class IndexMethodModel {
  name: string;
  displayName: string;

  constructor(name: string, displayName: string) {
    this.name = name;
    this.displayName = displayName;
  }
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

export class PathAccessRequest {
  constructor(
      public name: string,
      public directoryName: string,
  ) {
  }
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
  TABLE = 'TABLE',
  CARD = 'CARD',
  GRAPH = 'GRAPH'
}
