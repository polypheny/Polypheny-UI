import {SortState} from '../components/data-view/models/sort-state.model';
import {TableConstraint, UiColumnDefinition} from '../components/data-view/models/result-set.model';
import {EntityType} from './catalog.model';
import {PlanType} from './information-page.model';

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

export class PolyAlgRequest extends UIRequest {
    type = 'PolyAlgRequest';
    polyAlg: string;
    model: DataModel;
    planType: PlanType;
    dynamicValues: string[];
    dynamicTypes: string[];
    noLimit = false; // TODO: handle queries with large results

    constructor(polyAlg: string, model: DataModel, planType: PlanType, dynamicValues = null, dynamicTypes = null) {
        super();
        this.polyAlg = polyAlg;
        this.model = model;
        this.planType = planType;
        this.dynamicValues = dynamicValues;
        this.dynamicTypes = dynamicTypes;
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

    constructor(namespace: string, nodeIds: Set<string>, edgeIds: Set<string>) {
        super('MATCH * RETURN *', false, false, 'CYPHER', namespace);
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

export enum DataModel {
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
