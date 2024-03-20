import {DataModel} from '../../models/ui-request.model';
import {
    DocumentResult,
    FieldDefinition,
    GraphResult,
    QueryLanguage,
    RelationalResult,
    Result,
    ResultException,
    UiColumnDefinition
} from './models/result-set.model';
import {EntityType} from '../../models/catalog.model';

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
