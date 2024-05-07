import {EventEmitter, inject, Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {WebuiSettingsService} from './webui-settings.service';
import {EntityMeta, IndexModel, ModifyPartitionRequest, PartitionFunctionModel, PartitioningRequest, PathAccessRequest, PlacementFieldsModel} from '../components/data-view/models/result-set.model';
import {webSocket} from 'rxjs/webSocket';
import {ColumnRequest, ConstraintRequest, DeleteRequest, EditCollectionRequest, EditTableRequest, EntityRequest, ExploreTable, GraphRequest, MaterializedRequest, Method, MonitoringRequest, Namespace, PolyAlgRequest, QueryRequest, RelAlgRequest, StatisticRequest} from '../models/ui-request.model';
import {AutoDockerResult, AutoDockerStatus, CreateDockerResponse, DockerInstanceInfo, DockerSettings, HandshakeInfo, InstancesAndAutoDocker, UpdateDockerResponse} from '../models/docker.model';
import {ForeignKey, Uml} from '../views/uml/uml.model';
import {Validators} from '@angular/forms';
import {AdapterModel} from '../views/adapters/adapter.model';
import {QueryInterface} from '../views/query-interfaces/query-interfaces.model';
import {AlgNodeModel, Node} from '../views/querying/algebra/algebra.model';
import {WebSocket} from './webSocket';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {PolyAlgRegistry} from '../components/polyalg/models/polyalg-registry';
import {PlanNode} from '../components/polyalg/models/polyalg-plan.model';


@Injectable({
    providedIn: 'root'
})
export class CrudService {
    private readonly _http = inject(HttpClient);
    private readonly _settings = inject(WebuiSettingsService);

    private enabledPlugins: [string] = null;
    private enabledRequestFired: number = null;
    private REQUEST_DELAY: number = 1000 * 20;


    constructor() {
        this.initWebSocket();
        setInterval(() => this.socket.next('keepalive'), 10_000);
    }

    public connected = false;
    private reconnected = new EventEmitter<boolean>();
    private httpUrl = this._settings.getConnection('crud.rest');
    private httpOptions = {headers: new HttpHeaders({'Content-Type': 'application/json'})};
    private httpOptionsPart = {headers: new HttpHeaders({'Content-Type': 'multipart/form-data'})};
    private socket;

    // rendering routerLinks from string might not be possible:7
    // https://www.intertech.com/Blog/angular-4-case-study-caution-about-binding-html-content-using-innerhtml/
    // workarounds:
    // https://stackoverflow.com/questions/44613069/angular4-routerlink-inside-innerhtml-turned-to-lowercase

    getEntityData(socket: WebSocket, data: EntityRequest): boolean {
        return socket.sendMessage(data);
    }

    getGraph(socket: WebSocket, data: GraphRequest): boolean {
        return socket.sendMessage(data);
    }

    insertTuple(formData: FormData) {
        return this._http.post(`${this.httpUrl}/insertTuple`, formData, {reportProgress: true, observe: 'events'});
    }

    /**
     * @param socket Socket object that is used to send the query
     * @param query Any query that should be executed on the server
     */
    anyQuery(socket: WebSocket, query: QueryRequest): boolean {
        return socket.sendMessage(query);
    }

    /**
     * @param query will be converted in the back end to return an initial table for exploration
     */
    createInitialExploreQuery(query) {
        return this._http.post(`${this.httpUrl}/createInitialExploreQuery`, query, this.httpOptions);
    }

    getEnabledPlugins(): string[] {
        if (this.enabledRequestFired === null) {
            this.enabledRequestFired = Date.now() - (this.REQUEST_DELAY + 100);
        }
        if (this.enabledPlugins === null) {
            const today = Date.now();
            if ((this.enabledRequestFired + this.REQUEST_DELAY) < today) {
                this.enabledRequestFired = today;
                this._http.get(`${this.httpUrl}/getEnabledPlugins`, this.httpOptions)
                .subscribe(res => {
                    this.enabledPlugins = <[string]>res;
                });
            }
            return [];
        }
        return this.enabledPlugins;
    }

    /**
     * @param exploration labeled rows for classification, back end creates a decision tree with this data and returns classified initial data and tree
     */
    exploreUserInput(exploration) {
        return this._http.post(`${this.httpUrl}/exploration`, exploration, this.httpOptions);
    }

    /**
     * @param info classification of all data is requested from server
     */
    classifyData(info) {
        return this._http.post(`${this.httpUrl}/classifyData`, info, this.httpOptions);
    }

    /**
     * @param getExploreTables pagination for exploration tables
     */
    getExploreTables(getExploreTables: ExploreTable) {
        return this._http.post(`${this.httpUrl}/getExploreTables`, getExploreTables, this.httpOptions);
    }

    /**
     * Request all available statistic from the server
     */
    allStatistics(statistics: StatisticRequest) {
        return this._http.post(`${this.httpUrl}/allStatistics`, statistics, this.httpOptions);
    }

    /**
     * Request all available table statistics from the server
     */
    getTableStatistics(statistics: StatisticRequest) {
        return this._http.post(`${this.httpUrl}/getTableStatistics`, statistics, this.httpOptions);
    }

    /**
     * Request all dashboard information from the server
     */
    getDashboardInformation(statistics: StatisticRequest) {
        return this._http.post(`${this.httpUrl}/getDashboardInformation`, statistics, this.httpOptions);
    }

    /**
     * Request all available dml information from the monitoring (server)
     */
    getDashboardDiagram(monitoringRequest: MonitoringRequest) {
        return this._http.post(`${this.httpUrl}/getDashboardDiagram`, monitoringRequest, this.httpOptions);
    }

    /**
     * delete a row from a table
     * @param request UIRequest
     */
    deleteTuple(request: DeleteRequest) {
        return this._http.post(`${this.httpUrl}/deleteTuple`, request, this.httpOptions);
    }

    /**
     * Update a row from a table
     * @param formData Data in the form of a FormData
     */
    updateTuple(formData: FormData) {
        return this._http.post(`${this.httpUrl}/updateTuple`, formData, {reportProgress: true, observe: 'events'});
    }

    /**
     * get the columns of a DataStore
     */
    getColumns(columnRequest: ColumnRequest) {
        return this._http.post(`${this.httpUrl}/getColumns`, columnRequest, this.httpOptions);
    }

    /**
     * get the columns of a DataStore
     */
    getFixedFields(columnRequest: ColumnRequest) {
        return this._http.post(`${this.httpUrl}/getFixedFields`, columnRequest, this.httpOptions);
    }

    /**
     * Get the columns of a DataSource
     */
    getDataSourceColumns(request: EntityRequest) {
        return this._http.post(`${this.httpUrl}/getDataSourceColumns`, request, this.httpOptions);
    }

    getAvailableSourceColumns(request: EntityRequest) {
        return this._http.post(`${this.httpUrl}/getAvailableSourceColumns`, request, this.httpOptions);
    }

    /**
     * Update a column of a Table
     */
    updateColumn(columnRequest: ColumnRequest) {
        return this._http.post(`${this.httpUrl}/updateColumn`, columnRequest, this.httpOptions);
    }

    updateMaterialized(materializedRequest: MaterializedRequest) {
        return this._http.post(`${this.httpUrl}/updateMaterialized`, materializedRequest, this.httpOptions);
    }

    getMaterializedInfo(materializedRequest: EditTableRequest) {
        return this._http.post(`${this.httpUrl}/getMaterializedInfo`, materializedRequest, this.httpOptions);
    }

    createColumn(columnRequest: ColumnRequest) {
        return this._http.post(`${this.httpUrl}/createColumn`, columnRequest, this.httpOptions);
    }

    dropColumn(columnRequest: ColumnRequest) {
        return this._http.post(`${this.httpUrl}/dropColumn`, columnRequest, this.httpOptions);
    }

    /**
     * Get list of tables of a schema to truncate/drop them
     */
    getTables(tableRequest: EditTableRequest) {
        return this._http.post(`${this.httpUrl}/getTables`, tableRequest, this.httpOptions);
    }

    /**
     * Drop or truncate a table
     */
    dropTruncateTable(tableRequest: EditTableRequest) {
        return this._http.post(`${this.httpUrl}/dropTruncateTable`, tableRequest, this.httpOptions);
    }

    /**
     * Create a new table
     */
    createTable(tableRequest: EditTableRequest) {
        return this._http.post(`${this.httpUrl}/createTable`, tableRequest, this.httpOptions);
    }

    /**
     * Create a new collection
     */
    createCollection(collectionRequest: EditCollectionRequest) {
        return this._http.post(`${this.httpUrl}/createCollection`, collectionRequest, this.httpOptions);
    }

    getGeneratedNames() {
        return this._http.get(`${this.httpUrl}/getGeneratedNames`, this.httpOptions);
    }

    /**
     * Get constraints of a table
     */
    getConstraints(tableRequest: ColumnRequest) {
        return this._http.post(`${this.httpUrl}/getConstraints`, tableRequest, this.httpOptions);
    }

    /**
     * Drop a onstraint of a table
     */
    dropConstraint(request: ConstraintRequest) {
        return this._http.post(`${this.httpUrl}/dropConstraint`, request, this.httpOptions);
    }

    /**
     * Add a primary key to a table
     */
    createPrimaryKey(request: ConstraintRequest) {
        return this._http.post(`${this.httpUrl}/createPrimaryKey`, request, this.httpOptions);
    }

    /**
     * Add a unique constraint to a table
     */
    createUniqueConstraint(request: ConstraintRequest) {
        return this._http.post(`${this.httpUrl}/createUniqueConstraint`, request, this.httpOptions);
    }

    /**
     * Get indexes of a table
     */
    getIndexes(request: EditTableRequest) {
        return this._http.post(`${this.httpUrl}/getIndexes`, request, this.httpOptions);
    }

    /**
     * Drop an index of a table
     */
    dropIndex(index: IndexModel) {
        return this._http.post(`${this.httpUrl}/dropIndex`, index, this.httpOptions);
    }

    /**
     * Create an index
     */
    createIndex(index: IndexModel) {
        return this._http.post(`${this.httpUrl}/createIndex`, index, this.httpOptions);
    }

    /**
     * Get data placement information
     */
    getDataPlacements(namespaceId: number, entityId: number, fields: number[] = null) {
        const meta = new EntityMeta(namespaceId, entityId, null, fields);
        return this._http.post(`${this.httpUrl}/getPlacements`, meta, this.httpOptions);
    }

    /**
     * Get data placement information
     */
    getCollectionPlacements(namespaceId: number, entityId: number, fields: number[]) {
        const meta = new EntityMeta(namespaceId, entityId, null, fields);
        return this._http.post(`${this.httpUrl}/getCollectionPlacements`, meta, this.httpOptions);
    }

    getGraphPlacements(namespaceId: number, entityId: number, fields: number[]) {
        const meta = new EntityMeta(namespaceId, entityId, null, fields);
        return this._http.post(`${this.httpUrl}/getGraphPlacements`, meta, this.httpOptions);
    }

    getUnderlyingTable(request: EntityRequest) {
        return this._http.post(`${this.httpUrl}/getUnderlyingTable`, request, this.httpOptions);
    }


    /**
     * Add or drop a placement
     */
    addDropPlacement(namespaceId: number, entityId: number, adapterName: string, method: Method, columns: string[] = []) {
        const placementFieldsModel = new PlacementFieldsModel(namespaceId, entityId, adapterName, method, columns);

        return this._http.post(`${this.httpUrl}/addDropPlacement`, placementFieldsModel, this.httpOptions);
    }

    /**
     * Add or drop a placement
     */
    addDropGraphPlacement(graph: string, store: number, method: Method) {
        let code: string;
        switch (method) {
            case Method.ADD:
                code = `CREATE PLACEMENT OF ${graph} ON STORE ${store}`;
                break;
            case Method.DROP:
                code = `DROP PLACEMENT OF ${graph} ON STORE ${store}`;
                break;
        }
        const request = new QueryRequest(code, false, true, 'cypher', graph);

        return this.anyQueryBlocking(request);
    }

    /**
     * Add or drop a placement
     */
    addDropCollectionPlacement(namespace: string, collection: string, store: string, method: Method) {
        let code: string;
        switch (method) {
            case 'ADD':
                code = `db.${collection}.addPlacement( "${store}" )`;
                break;
            case 'DROP':
                code = `db.${collection}.deletePlacement( "${store}" )`;
                break;
        }
        const request = new QueryRequest(code, false, true, 'cypher', namespace);
        return this.anyQueryBlocking(request);
    }


    // PARTITIONING

    getPartitionTypes() {
        return this._http.get(`${this.httpUrl}/getPartitionTypes`, this.httpOptions);
    }

    getPartitionFunctionModel(request: PartitioningRequest) {
        return this._http.post(`${this.httpUrl}/getPartitionFunctionModel`, request, this.httpOptions);
    }

    partitionTable(request: PartitionFunctionModel) {
        return this._http.post(`${this.httpUrl}/partitionTable`, request, this.httpOptions);
    }

    mergePartitions(request: PartitioningRequest) {
        return this._http.post(`${this.httpUrl}/mergePartitions`, request, this.httpOptions);
    }

    modifyPartitions(request: ModifyPartitionRequest) {
        return this._http.post(`${this.httpUrl}/modifyPartitions`, request, this.httpOptions);
    }

    /**
     * Get information for the Uml view, such as
     * the list of all tables of a schema with their columns
     * and a list of all the foreign keys of a schema
     */
    getUml(request: EditTableRequest): Observable<Uml> {
        return <Observable<Uml>>this._http.post(`${this.httpUrl}/getUml`, request, this.httpOptions);
    }

    /**
     * Initialize the websocket for the queryAnalyzer
     */
    private initWebSocket() {
        this.socket = webSocket({
            url: this._settings.getConnection('crud.socket'),
            openObserver: {
                next: (n) => {
                    this.reconnected.emit(true);
                    this.connected = true;
                }
            }
        });
        this.socket.subscribe(
            msg => {
            },
            err => {
                //this.reconnected.emit(false);
                this.connected = false;
                setTimeout(() => {
                    this.initWebSocket();
                }, +this._settings.getSetting('reconnection.timeout'));
            }
        );
    }


    anyQueryBlocking(queryRequest: QueryRequest) {
        return this._http.post(`${this.httpUrl}/anyQuery`, queryRequest, this.httpOptions);
    }

    onSocketEvent() {
        return this.socket;
    }

    onReconnection() {
        return this.reconnected;
    }

    getAnalyzerPage(analyzerId: string, analyzerPage: string) {
        return this._http.post(`${this.httpUrl}/getAnalyzerPage`, [analyzerId, analyzerPage], this.httpOptions);
    }

    /**
     * Add a foreign key (in the Uml view)
     */
    createForeignKey(fk: ForeignKey) {
        return this._http.post(`${this.httpUrl}/createForeignKey`, fk, this.httpOptions);
    }

    /**
     * Execute an algebra expression
     */
    executeAlg(socket: WebSocket, relAlg: Node, cache: boolean, analyzeQuery, createView?: boolean, tableType?: string, viewName?: string, store?: string, freshness?: string, interval?: string, timeUnit?: string) {
        let request;
        if (createView) {
            if (tableType === 'MATERIALIZED') {
                request = new RelAlgRequest(relAlg, cache, analyzeQuery, createView, 'materialized', viewName, store, freshness, interval, timeUnit);
            } else {
                request = new RelAlgRequest(relAlg, cache, analyzeQuery, createView, 'view', viewName);
            }
        } else {
            request = new RelAlgRequest(relAlg, cache, analyzeQuery);
            console.log(request);
        }
        return socket.sendMessage(request);
    }


    renameTable(meta: EntityMeta) {
        return this._http.post(`${this.httpUrl}/renameTable`, meta, this.httpOptions);
    }

    /**
     * Send a request to either create or drop a schema
     */
    createOrDropNamespace(namespace: Namespace) {
        return this._http.post(`${this.httpUrl}/namespaceRequest`, namespace, this.httpOptions);
    }

    /**
     * Get all supported data types of the DBMS.
     */
    getTypeInfo() {
        return this._http.get(`${this.httpUrl}/getTypeInfo`, this.httpOptions);
    }

    /**
     * Fetch available actions for foreign key constraints
     */
    getFkActions() {
        return this._http.get(`${this.httpUrl}/getForeignKeyActions`, this.httpOptions);
    }

    getTypeSchemas() {
        return this._http.get(`${this.httpUrl}/getTypeSchemas`, this.httpOptions);
    }

    getStores() {
        return this._http.get(`${this.httpUrl}/getStores`);
    }

    getAvailableStoresForIndexes(request: IndexModel) {
        return this._http.post(`${this.httpUrl}/getAvailableStoresForIndexes`, request, this.httpOptions);
    }

    updateAdapterSettings(adapter: AdapterModel) {
        return this._http.post(`${this.httpUrl}/updateAdapterSettings`, adapter);
    }

    getSources() {
        return this._http.get(`${this.httpUrl}/getSources`);
    }

    getAvailableStores() {
        return this._http.get(`${this.httpUrl}/getAvailableStores`);
    }

    getAvailableSources() {
        return this._http.get(`${this.httpUrl}/getAvailableSources`);
    }

    createAdapter(adapter: AdapterModel, formdata: FormData) {
        formdata.set('body', JSON.stringify(adapter));
        return this._http.post(`${this.httpUrl}/createAdapter`, formdata);
    }


    pathAccess(req: PathAccessRequest) {
        return this._http.post(`${this.httpUrl}/pathAccess`, req);
    }

    removeAdapter(storeId: string) {
        return this._http.post(`${this.httpUrl}/removeAdapter`, storeId, this.httpOptions);
    }

    getQueryInterfaces() {
        return this._http.get(`${this.httpUrl}/getQueryInterfaces`);
    }

    getAvailableQueryInterfaces() {
        return this._http.get(`${this.httpUrl}/getAvailableQueryInterfaces`);
    }

    createQueryInterface(request: any) {
        return this._http.post(`${this.httpUrl}/createQueryInterface`, request, this.httpOptions);
    }

    updateQueryInterfaceSettings(request: QueryInterface) {
        return this._http.post(`${this.httpUrl}/updateQueryInterfaceSettings`, request, this.httpOptions);
    }

    getAlgebraNodes() {
        return this._http.get(`${this.httpUrl}/getAlgebraNodes`)
        .pipe(map(algs => new Map(Object.entries(algs)
        .sort()
        .map(([k, v], i) => [k, v as AlgNodeModel[]]))));
    }

    removeQueryInterface(queryInterfaceId: string) {
        return this._http.post(`${this.httpUrl}/removeQueryInterface`, queryInterfaceId, this.httpOptions);
    }

    getUsedDockerPorts() {
        return this._http.get(`${this.httpUrl}/usedDockerPorts`);
    }

    getDocumentDatabases() {
        return this._http.get(`${this.httpUrl}/getDocumentDatabases`);
    }


    /**
     * Get the http url with which multimedia files can be displayed or downloaded
     */
    getFileUrl(fileName: string): string {
        if (fileName.startsWith('http://') || fileName.startsWith('https://')) {
            return fileName;
        }
        return `${this.httpUrl}/getFile/${fileName}`;
    }

    getFile(fileName: string) {
        const url = this.getFileUrl(fileName);

        //blob as json: https://stackoverflow.com/questions/42898162/how-to-read-content-disposition-headers-from-server-response-angular-2
        return this._http.get(url, {
            reportProgress: true,
            observe: 'events',
            responseType: 'blob' as 'json',
            headers: new HttpHeaders({'Content-Type': 'application/octet-stream'})
        });
    }

    createDockerInstance(hostname: string, alias: string, registry: string, communicationPort: number, handshakePort: number, proxyPort: number) {
        return this._http.post<CreateDockerResponse>(`${this.httpUrl}/docker/instances/create`, {
            'hostname': hostname,
            'alias': alias,
            'registry': registry,
            'communicationPort': communicationPort,
            'handshakePort': handshakePort,
            'proxyPort': proxyPort,
        }, this.httpOptions);
    }

    getDockerInstances() {
        return this._http.get<DockerInstanceInfo[]>(`${this.httpUrl}/docker/instances`);
    }

    getDockerInstance(id: number) {
        return this._http.get<DockerInstanceInfo>(`${this.httpUrl}/docker/instances/${id}`);
    }

    updateDockerInstance(id: number, hostname: string, alias: string, registry: string) {
        return this._http.patch<UpdateDockerResponse>(`${this.httpUrl}/docker/instances/${id}`, {
            'id': id,
            'hostname': hostname,
            'alias': alias,
            'registry': registry
        }, this.httpOptions);
    }

    reconnectToDockerInstance(id: number) {
        return this._http.post<HandshakeInfo>(`${this.httpUrl}/docker/instances/${id}/reconnect`, null, this.httpOptions);
    }

    pingDockerInstance(id: number) {
        return this._http.post(`${this.httpUrl}/docker/instances/${id}/ping`, null, this.httpOptions);
    }

    removeDockerInstance(id: number) {
        return this._http.delete<InstancesAndAutoDocker>(`${this.httpUrl}/docker/instances/${id}`);
    }

    getAutoDockerStatus() {
        return this._http.get<AutoDockerStatus>(`${this.httpUrl}/docker/auto`);
    }

    doAutoHandshake() {
        return this._http.post<AutoDockerResult>(`${this.httpUrl}/docker/auto`, null, this.httpOptions);
    }

    getHandshakes() {
        return this._http.get<HandshakeInfo[]>(`${this.httpUrl}/docker/handshakes`);
    }

    getHandshake(id: number) {
        return this._http.get<HandshakeInfo>(`${this.httpUrl}/docker/handshakes/${id}`);
    }

    restartHandshake(id: number) {
        return this._http.post<HandshakeInfo>(`${this.httpUrl}/docker/handshakes/${id}/restart`, null, this.httpOptions);
    }

    cancelHandshake(id: number) {
        return this._http.post(`${this.httpUrl}/docker/handshakes/${id}/cancel`, null, this.httpOptions);
    }

    deleteHandshake(id: number) {
        return this._http.delete<HandshakeInfo[]>(`${this.httpUrl}/docker/handshakes/${id}`);
    }

    getDockerSettings() {
        return this._http.get<DockerSettings>(`${this.httpUrl}/docker/settings`);
    }

    changeDockerSettings(settings: DockerSettings) {
        return this._http.patch<DockerSettings>(`${this.httpUrl}/docker/settings`, settings, this.httpOptions);
    }

    getPolyAlgRegistry() {
        return this._http.get<PolyAlgRegistry>(`${this.httpUrl}/getPolyAlgRegistry`);
    }

    executePolyAlg(socket: WebSocket, polyAlg: string) {
        const request = new PolyAlgRequest(polyAlg, true);
        return socket.sendMessage(request);
    }

    buildTreeFromPolyAlg(polyAlg: string) {
        const request = new PolyAlgRequest(polyAlg, false);
        return this._http.post<PlanNode>(`${this.httpUrl}/buildPolyPlan`, request, this.httpOptions);
    }

    getNameValidator(required: boolean = false) {
        if (required) {
            return [Validators.pattern('^[a-zA-Z_][a-zA-Z0-9_]*$'), Validators.required, Validators.max(100)];
        } else {
            return [Validators.pattern('^[a-zA-Z_][a-zA-Z0-9_]*$'), Validators.max(100)];
        }
    }

    invalidNameMessage(type: string = '') {
        type = type + ' ';
        return `Please provide a valid ${type}name`;
    }

    getValidationRegex() {
        return new RegExp('^[a-zA-Z_][a-zA-Z0-9_]*$');
    }

    getNamespaceValidationRegex() {
        return new RegExp('^[a-z_][a-z0-9_]*$');
    }

    getAdapterNameValidationRegex() {
        // TODO: re-enable underscores when graph namespaces work with it
        //return new RegExp('^[a-z][a-z0-9_]*$');
        return new RegExp('^[a-z][a-z0-9]*$');
    }

    nameIsValid(name: string) {
        const regex = this.getValidationRegex();
        return regex.test(name) && name.length <= 100;
    }

    getValidationClass(name: string) {
        const regex = this.getValidationRegex();
        if (name === '') {
            return '';
        } else if (regex.test(name) && name.length <= 100) {
            return 'is-valid';
        } else {
            return 'is-invalid';
        }
    }

    loadPlugins(files: File[]) {
        const formData = new FormData();
        formData.append('action', 'loadPlugins');
        files.forEach(f => {
            formData.append('plugins', f);
        });

        return this._http.post(`${this.httpUrl}/loadPlugins`, formData);
    }

}
