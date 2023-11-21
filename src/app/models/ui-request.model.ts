import {SortState} from '../components/data-view/models/sort-state.model';
import {TableConstraint, UiColumnDefinition} from '../components/data-view/models/result-set.model';
import {Node} from '../views/querying/algebra/algebra.model';
import {EntityType} from './catalog.model';

export class RequestModel {
    type: string;
}


export abstract class UIRequest extends RequestModel {
    entityId: number;
    namespace: string;
    currentPage: number;
    data: Map<string, string>;
    filter: Map<string, string>;
    sortState: Map<string, SortState>;
    selectInterval: string;
}


export class EntityRequest extends UIRequest {
    type = 'EntityRequest';

    constructor(entityId: number, namespace: string, currentPage: number, filter: any = null, sortState: any = null) {
        super();
        this.entityId = entityId;
        this.namespace = namespace;
        this.currentPage = currentPage;
        this.filter = filter;
        this.sortState = sortState;
        return this;
    }
}

export class RelAlgRequest extends UIRequest {
    type = 'RelAlgRequest';
    topNode: Node;
    createView: boolean;
    analyze: boolean;
    tableType;
    string;
    viewName: string;
    store: string;
    freshness: string;
    interval;
    timeUnit: string;
    useCache: boolean;

    constructor(node: Node, cache: boolean, analyzeQuery: boolean, createView?: boolean, tableType?: string, viewName?: string, store?: string, freshness?: string, interval?, timeUnit?: string) {
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
    type = 'QueryRequest';
    query: string;
    analyze: boolean;
    language: string;
    namespace: string;
    cache: boolean;

    constructor(query: string, analyze: boolean, cache: boolean, lang: string, namespace: string) {
        super();
        this.query = query;
        this.analyze = analyze;
        this.cache = cache;
        this.language = lang;
        this.namespace = namespace;
        this.currentPage = 1;
        return this;
    }
}


export class GraphRequest extends QueryRequest {
    type = 'GraphRequest';
    private nodeIds: string[];
    private edgeIds: string[];

    constructor(namespace: string, nodeIds: Set<string>, edgeIds: Set<string>) {
        super('MATCH * RETURN *', false, false, 'CYPHER', namespace);
        this.nodeIds = Array.from(nodeIds);
        this.edgeIds = Array.from(edgeIds);
    }
}

export class QueryExplorationRequest extends UIRequest {
    query: string;
    analyze: boolean;
    cPage: number;

    constructor(query: string, analyze: boolean, cPage: number) {
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
export class ClassifyRequest {
    id: number;
    header: UiColumnDefinition[];
    classified: string[][];
    cPage: number;

    constructor(id: number, header: UiColumnDefinition[], classified: string[][], cPage: number) {
        this.id = id;
        this.header = header;
        this.classified = classified;
        this.cPage = cPage;
        return this;
    }
}

export class Exploration {
    id: number;
    header: UiColumnDefinition[];
    classified: string[][];

    constructor(id: number, header: UiColumnDefinition[], classified: string[][]) {
        this.id = id;
        this.header = header;
        this.classified = classified;

    }
}


export class PluginEntity {
    id: string;
    stringPath: string;
    status: boolean;
    imagePath: string;
    categories: string[];
    version: string;
}

export enum PluginStatus {
    UNLOADED = 'UNLOADED',
    LOADED = 'LOADED',
    ACTIVE = 'ACTIVE'
}

export class ExploreTable extends UIRequest {
    id: number;
    header: UiColumnDefinition[];
    cPage: number;

    constructor(id: number, header: UiColumnDefinition[], cPage: number) {
        super();
        this.id = id;
        this.header = header;
        this.cPage = cPage;
    }
}


export class StatisticRequest extends UIRequest {
    constructor(entityId?: number) {
        super();
        this.entityId = entityId || null;
        return this;
    }
}

export class MonitoringRequest extends UIRequest {
    constructor(selectInterval?: string) {
        super();
        this.selectInterval = selectInterval || null;
        return this;
    }
}

export class DeleteRequest extends UIRequest {
    constructor(entityId: number, data: any) {
        super();
        this.entityId = entityId;
        this.data = data;
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
    dataModels: NamespaceType[];

    constructor(routerLinkRoot: string, views: boolean, depth: number, showTable: boolean, schemaEdit?: boolean, dataModels: NamespaceType[] = [NamespaceType.RELATIONAL, NamespaceType.DOCUMENT, NamespaceType.GRAPH]) {
        super();
        this.routerLinkRoot = routerLinkRoot;
        this.views = views;
        this.depth = depth;
        this.showTable = showTable;
        this.schemaEdit = schemaEdit || false;
        this.dataModels = dataModels;
    }
}

export class ColumnRequest extends UIRequest {
    oldColumn: UiColumnDefinition;
    newColumn: UiColumnDefinition;
    renameOnly: boolean;
    tableType: string;

    constructor(entityId: number, oldColumn: UiColumnDefinition = null, newColumn: UiColumnDefinition = null, renameOnly = false, tableType: string = 'table') {
        super();
        this.entityId = entityId;
        this.oldColumn = oldColumn;
        this.newColumn = newColumn;
        this.renameOnly = renameOnly;
        this.tableType = tableType;
    }
}

export class MaterializedRequest extends UIRequest {
    constructor(entityId: number) {
        super();
        this.entityId = entityId;
    }
}

export enum NamespaceType {
    DOCUMENT = 'DOCUMENT',
    RELATIONAL = 'RELATIONAL',
    GRAPH = 'GRAPH'
}


/**
 * Edit or create a Table
 * used for request where you want to truncate/drop a table
 * and when you want to create a new table
 */
export class EditTableRequest {
    namespaceId: number;
    entityId: number;
    entityName: string;
    action: string;//truncate / drop
    columns: UiColumnDefinition[];
    storeId: number;
    tableType: EntityType;

    constructor(namespaceId: number, entityId: number = null, entityName: string = null, action: string = null, columns: UiColumnDefinition[] = null, storeId: number = null, tableType: EntityType = EntityType.ENTITY) {
        this.namespaceId = namespaceId;
        this.entityId = entityId;
        this.entityName = entityName;
        this.action = action;
        this.columns = columns;
        this.storeId = storeId;
        this.tableType = EntityType.ENTITY;
    }

    getAction() {
        return this.action;
    }
}

export class EditCollectionRequest {
    namespaceId: number;
    entityName: string;
    entityId: number;
    action: string;
    store: string;

    constructor(namespaceId: number, entityName: string = null, entityId: number = null, action: string = null, store: string = null) {
        this.namespaceId = namespaceId;
        this.entityName = entityName;
        this.entityId = entityId;
        this.action = action;
        this.store = store;
    }
}

/**
 * Request to drop or create a constraint of a table
 */
export class ConstraintRequest {
    constructor(private entityId: number, private constraint: TableConstraint) {
    }
}

export enum Method {
    ADD = 'ADD',
    DROP = 'DROP',
    MODIFY = 'MODIFY',
    TRUNCATE = 'TRUNCATE'
}

export class RegisterRequest extends RequestModel {
    type = 'RegisterRequest';
    source: string;
    payload: string;


    constructor(source: string, payload: string) {
        super();
        this.source = source;
        this.payload = payload;
    }
}


/**
 * Send request to either create or drop a schema
 */
export class Namespace {
    private name: string;
    private type: string;//todo enum
    private store: string;

    // fields for creation
    create = false;
    ifNotExists = true;
    authorization: string = null;

    //fields for deletion
    drop = false;
    ifExists = true;
    cascade = false;

    constructor(name: string, type: string, store: string) {
        this.name = name;
        this.type = type;
        this.store = store;
    }

    setCreate(create: boolean) {
        this.create = create;
        return this;
    }

    setAuthorization(auth: string) {
        this.authorization = auth;
        return this;
    }

    setDrop(drop: boolean) {
        this.drop = drop;
        return this;
    }

    setCascade(cascade: boolean) {
        this.cascade = cascade;
        return this;
    }
}
