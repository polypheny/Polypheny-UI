import {DataModel} from '../../models/ui-request.model';
import {
    DocumentResult,
    FieldDefinition,
    GraphResult,
    QueryLanguage,
    QueryType,
    RelationalResult,
    Result,
    ResultException,
    UiColumnDefinition
} from './models/result-set.model';
import {EntityType, isSignedIdentityInteger} from '../../models/catalog.model';

export enum Freshness {
    UPDATE = 'UPDATE',
    INTERVAL = 'INTERVAL',
    MANUAL = 'MANUAL'
}

export enum TimeUnits {
    MILLISECONDS = 'milliseconds',
    SECONDS = 'seconds',
    MINUTES = 'minutes',
    HOURS = 'hours',
    DAYS = 'days'
}

export enum ViewType {
    VIEW = 'VIEW',
    MATERIALIZED = 'MATERIALIZED'
}

export class CombinedResult {
    dataModel: DataModel;
    namespace: string;
    query: string;
    queryType: QueryType;
    data: string[][];
    header: FieldDefinition[] | UiColumnDefinition[];
    exception: ResultException;
    error: string;
    language: QueryLanguage;
    hasMore: boolean;
    currentPage: number;
    highestPage: number;
    entityName: string;
    entityId: number;
    entites: string[];
    affectedTuples: number;
    type: EntityType;//"table" or "view"

    static fromRelational(relational: RelationalResult): CombinedResult {
        const res = new CombinedResult();
        res.header = relational.header;
        res.data = relational.data;
        res.namespace = relational.namespace;
        res.dataModel = relational.dataModel;
        res.currentPage = relational.currentPage;
        res.highestPage = relational.highestPage;
        res.type = relational.type;
        res.queryType = relational.queryType;
        res.error = relational.error;
        res.hasMore = relational.hasMore;
        res.entityId = relational.tableId;
        res.entityName = relational.table;
        res.affectedTuples = relational.affectedTuples;
        res.language = relational.language;
        res.query = relational.query;

        return res;
    }

    static fromDocument(doc: DocumentResult): CombinedResult {
        const res = new CombinedResult();
        res.header = doc.header;
        res.data = doc.data.map(t => new Array(t));
        res.namespace = doc.namespace;
        res.dataModel = doc.dataModel;
        res.currentPage = doc.currentPage;
        res.highestPage = doc.highestPage;
        res.error = doc.error;
        res.hasMore = doc.hasMore;
        res.language = doc.language;
        res.query = doc.query;
        res.queryType = doc.queryType;

        return res;
    }

    static fromGraph(graph: GraphResult): CombinedResult {
        const res = new CombinedResult();
        res.header = graph.header;
        res.data = graph.data;
        res.namespace = graph.namespace;
        res.dataModel = graph.dataModel;
        res.currentPage = graph.currentPage;
        res.highestPage = graph.highestPage;
        res.error = graph.error;
        res.hasMore = graph.hasMore;
        res.language = graph.language;
        res.query = graph.query;
        res.queryType = graph.queryType;

        return res;
    }

    static from(result: Result<any, any>) {
        if (result instanceof CombinedResult) {
            return result;
        }

        switch (result.dataModel) {
            case DataModel.DOCUMENT:
                return CombinedResult.fromDocument(result);
            case DataModel.RELATIONAL:
                return CombinedResult.fromRelational(result as RelationalResult);
            case DataModel.GRAPH:
                return CombinedResult.fromGraph(result);
            default:
                return CombinedResult.fromRelational(result as RelationalResult);
        }
    }
}

export function createTupleFormData(
    header: ReadonlyArray<FieldDefinition | UiColumnDefinition>,
    values: ReadonlyMap<string, string | number | boolean | File | null>,
    dirty: ReadonlyMap<string, boolean>,
    entityId: number
): FormData {
    const formData = new FormData();
    for (const column of header) {
        const value = values.get(column.name);
        if (!dirty.get(column.name) || value == null || column.identity?.mode === 'ALWAYS') {
            continue;
        }
        if (column.identity) {
            const integer = String(value).trim();
            if (integer === '') {
                continue;
            }
            if (!isSignedIdentityInteger(integer)) {
                throw new Error(`Enter a signed 64-bit integer for ${column.name}.`);
            }
            formData.append(column.name, integer);
        } else {
            formData.append(column.name, value instanceof File ? value : String(value));
        }
    }
    formData.append('entityId', String(entityId));
    return formData;
}

export function createUpdateTupleFormData(
    header: ReadonlyArray<FieldDefinition | UiColumnDefinition>,
    row: readonly string[],
    values: ReadonlyMap<string, string | number | boolean | File | null>,
    entityId: number
): FormData | null {
    const formData = new FormData();
    const oldValues = new Map<string, string>();
    let hasUpdates = false;
    header.forEach((column, index) => {
        oldValues.set(column.name, row[index]);
        const value = values.get(column.name);
        if (value !== undefined && column.identity?.mode !== 'ALWAYS') {
            formData.append(column.name, value instanceof File ? value : JSON.stringify(value));
            hasUpdates = true;
        }
    });
    if (!hasUpdates) {
        return null;
    }
    formData.append('entityId', String(entityId));
    formData.append('oldValues', JSON.stringify(Object.fromEntries(oldValues)));
    return formData;
}
