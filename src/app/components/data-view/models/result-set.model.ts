import {SortState} from './sort-state.model';
import {ColumnModel} from '../../../models/catalog.model';
import {NamespaceType} from '../../../models/ui-request.model';

/**
 * model for the result of a query coming from the server
 */

export interface FieldDefinition {
    name: string;
    dataType: string;
}

export class Result<D, H> {
    namespaceType: NamespaceType;
    namespaceName: string;
    namespaceId: number;
    data: D[];
    header: H[];
    error: string;
    language: string; //sql,mql,cql
}


export class RelationalResult extends Result<string[], UiColumnDefinition> {
    hasMoreRows: boolean;
    currentPage: number;
    highestPage: number;
    table: string;
    tableId: number;
    tables: string[];
    error: string;
    exception: ResultException;
    affectedRows: number;
    generatedQuery: string;
    type: string;//"table" or "view"


    constructor(error: string, generatedQuery = null, affectedRows = 0) {
        super();
        this.error = error;
        this.generatedQuery = generatedQuery;
        this.affectedRows = affectedRows;
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
    query: string;
}

export class DocumentResult extends Result<string, FieldDefinition> {
    query: string;
}

export class InfoSet extends RelationalResult {


    constructor(error: string, generatedQuery: any, affectedRows: number) {
        super(error, generatedQuery, affectedRows);
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
export class UiColumnDefinition implements FieldDefinition {
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

    static fromModel( column: ColumnModel, primaries: number[] ){
        return new UiColumnDefinition(
            column.name,
            primaries.includes(column.id),
            column.nullable,
            column.type.toString(),
            column.collectionsType == null ? null : column.collectionsType.toString(),
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
export class Index {
    constructor(
        private namespaceId: number,
        private entityId: number,
        private name: string,
        private storeUniqueName: string,
        private method: string,
        private columns: string[]
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
        super(namespaceId,entityId, entityName, fields);
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
    TABLE, CAROUSEL, CARD, GRAPH
}
