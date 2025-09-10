import {SortState} from './sort-state.model';
import {ColumnModel, EntityType} from '../../../models/catalog.model';
import {DataModel, Method} from '../../../models/ui-request.model';
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
    queryType: QueryType;
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
    xid?: string;
    isRolledBack?: boolean;
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

export enum QueryType {
    DDL = 'DDL',
    DML = 'DML',
    DQL = 'DQL'
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

export interface TableStatistics {
    tableId: number;
    tableName: string;
    entityType: EntityType;
    numberOfRows: number;
    calls: TableCallSet;
    columns: StatisticColumn[];
}

export interface StatisticColumn {
    columnId: number;
    columnName: string;
    type: string;
    full: boolean;
    uniqueValues: PolyValue[];

    // NumericalStatisticColumn
    count?: PolyValue;
    min?: PolyValue;
    max?: PolyValue;
    minCache?: PolyValue[];
    maxCache?: PolyValue[];

    // AlphabeticStatisticColumn
    uniqueValuesCache?: PolyValue[];
    cacheFull?: boolean;

    // TemporalStatisticColumn (in addition to min, max, minCache, maxCache)
    temporalType: string;
}

export interface PolyValue {
    '@type': string;
    value: number | string | boolean;
}

export interface TableCallSet {
    numberOfSelects: number;
    numberOfInserts: number;
    numberOfDeletes: number;
    numberOfUpdates: number;
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
    namespaceId: number;
    entityId: number;
    entityName: string;
    fields: number[];

    constructor(
        namespaceId: number,
        entityId: number,
        entityName: string,
        fields: number[] = []
    ) {
        this.namespaceId = namespaceId;
        this.entityId = entityId;
        this.entityName = entityName;
        this.fields = fields;
    }
}

export class PlacementFieldsModel {
    namespaceId: number;
    entityId: number;
    adapterName: string;
    method: Method;
    fieldNames: string[];

    constructor(
        namespaceId: number,
        entityId: number,
        adapterName: string,
        method: Method,
        fieldNames: string[]
    ) {
        this.namespaceId = namespaceId;
        this.entityId = entityId;
        this.adapterName = adapterName;
        this.method = method;
        this.fieldNames = fieldNames;
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
