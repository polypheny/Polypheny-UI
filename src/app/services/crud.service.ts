import {EventEmitter, Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {WebuiSettingsService} from './webui-settings.service';
import {Index, ModifyPartitionRequest, PartitionFunctionModel, PartitioningRequest} from '../components/data-view/models/result-set.model';
import {webSocket} from 'rxjs/webSocket';
import {ColumnRequest, ConstraintRequest, DeleteRequest, EditCollectionRequest, EditTableRequest, ExploreTable, MaterializedRequest, MonitoringRequest, QueryRequest, RelAlgRequest, Schema, SchemaRequest, StatisticRequest, TableRequest} from '../models/ui-request.model';
import {ForeignKey} from '../views/uml/uml.model';
import {Validators} from '@angular/forms';
import {HubService} from './hub.service';
import {Adapter} from '../views/adapters/adapter.model';
import {QueryInterface} from '../views/query-interfaces/query-interfaces.model';
import {Node} from '../views/querying/relational-algebra/relational-algebra.model';
import {WebSocket} from './webSocket';

@Injectable({
  providedIn: 'root'
})
export class CrudService {

  constructor(
    private _http:HttpClient,
    private _settings:WebuiSettingsService,
    private _hub: HubService
  ) {
    this.initWebSocket();
    setInterval(() => this.socket.next('keepalive'), 10_000);
  }

  public connected = false;
  private reconnected = new EventEmitter<boolean>();
  private httpUrl = this._settings.getConnection('crud.rest');
  private httpOptions = { headers: new HttpHeaders({'Content-Type': 'application/json'})};
  private socket;

  // rendering routerLinks from string might not be possible:7
  // https://www.intertech.com/Blog/angular-4-case-study-caution-about-binding-html-content-using-innerhtml/
  // workarounds:
  // https://stackoverflow.com/questions/44613069/angular4-routerlink-inside-innerhtml-turned-to-lowercase

  getTable( socket: WebSocket, data: TableRequest ): boolean {
    return socket.sendMessage(data);
  }

  getSchema ( request: SchemaRequest ) {
    return this._http.post(`${this.httpUrl}/getSchemaTree`, request, this.httpOptions);
  }

  insertRow (formData: FormData ) {
    return this._http.post( `${this.httpUrl}/insertRow`, formData, {reportProgress: true, observe: 'events'} );
  }

  /**
   * @param socket Socket object that is used to send the query
   * @param query Any query that should be executed on the server
   */
  anyQuery ( socket: WebSocket, query: QueryRequest ): boolean {
    return socket.sendMessage( query );
  }

  /**
   * @param query will be converted in the back end to return an initial table for exploration
   */
  createInitialExploreQuery (query ){
    return this._http.post(`${this.httpUrl}/createInitialExploreQuery`, query, this.httpOptions);
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
  classifyData ( info ){
    return this._http.post(`${this.httpUrl}/classifyData`, info, this.httpOptions);
  }

  /**
   * @param getExploreTables pagination for exploration tables
   */
  getExploreTables(getExploreTables: ExploreTable){
    return this._http.post(`${this.httpUrl}/getExploreTables`, getExploreTables, this.httpOptions);
  }

  /**
   * Request all available statistic from the server
   */
  allStatistics ( statistics: StatisticRequest ) {
    return this._http.post(`${this.httpUrl}/allStatistics`, statistics,  this.httpOptions);
  }

  /**
   * Request all available table statistics from the server
   */
  getTableStatistics( statistics: StatisticRequest ){
    return this._http.post(`${this.httpUrl}/getTableStatistics`, statistics, this.httpOptions );
  }

  /**
   * Request all dashboard information from the server
   */
  getDashboardInformation( statistics: StatisticRequest ){
    return this._http.post(`${this.httpUrl}/getDashboardInformation`, statistics, this.httpOptions );
  }

  /**
   * Request all available dml information from the monitoring (server)
   */
  getDashboardDiagram(monitoringRequest: MonitoringRequest){
    return this._http.post( `${this.httpUrl}/getDashboardDiagram`, monitoringRequest, this.httpOptions );
  }

  /**
   * delete a row from a table
   * @param request UIRequest
   */
  deleteRow ( request: DeleteRequest) {
    return this._http.post(`${this.httpUrl}/deleteRow`, request, this.httpOptions);
  }

  /**
   * Update a row from a table
   * @param formData Data in the form of a FormData
   */
  updateRow ( formData: FormData ) {
    return this._http.post( `${this.httpUrl}/updateRow`, formData, {reportProgress: true, observe: 'events'} );
  }

  /**
   * get the columns of a DataStore
   */
  getColumns ( columnRequest: ColumnRequest ) {
    return this._http.post(`${this.httpUrl}/getColumns`, columnRequest, this.httpOptions);
  }

  /**
   * Get the columns of a DataSource
   */
  getDataSourceColumns ( request: TableRequest ) {
    return this._http.post(`${this.httpUrl}/getDataSourceColumns`, request, this.httpOptions);
  }

  getExportedColumns ( request: TableRequest ) {
    return this._http.post(`${this.httpUrl}/getExportedColumns`, request, this.httpOptions);
  }

  /**
   * Update a column of a Table
   */
  updateColumn ( columnRequest: ColumnRequest ) {
    return this._http.post(`${this.httpUrl}/updateColumn`, columnRequest, this.httpOptions);
  }

  updateMaterialized(materializedRequest: MaterializedRequest){
    return this._http.post(`${this.httpUrl}/updateMaterialized`, materializedRequest, this.httpOptions);
  }

  getMaterializedInfo(materializedRequest: EditTableRequest){
    return this._http.post(`${this.httpUrl}/getMaterializedInfo`, materializedRequest, this.httpOptions);
  }

  addColumn ( columnRequest: ColumnRequest ) {
    return this._http.post(`${this.httpUrl}/addColumn`, columnRequest, this.httpOptions);
  }

  dropColumn ( columnRequest: ColumnRequest ) {
    return this._http.post(`${this.httpUrl}/dropColumn`, columnRequest, this.httpOptions);
  }

  /**
   * Get list of tables of a schema to truncate/drop them
   */
  getTables ( tableRequest: EditTableRequest ) {
    return this._http.post(`${this.httpUrl}/getTables`, tableRequest, this.httpOptions);
  }

  /**
   * Drop or truncate a table
   */
  dropTruncateTable ( tableRequest: EditTableRequest ) {
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
  dropConstraint ( request: ConstraintRequest ) {
    return this._http.post(`${this.httpUrl}/dropConstraint`, request, this.httpOptions);
  }

  /**
   * Add a primary key to a table
   */
  addPrimaryKey ( request: ConstraintRequest ) {
    return this._http.post(`${this.httpUrl}/addPrimaryKey`, request, this.httpOptions);
  }

  /**
   * Add a unique constraint to a table
   */
  addUniqueConstraint ( request: ConstraintRequest ) {
    return this._http.post(`${this.httpUrl}/addUniqueConstraint`, request, this.httpOptions);
  }

  /**
   * Get indexes of a table
   */
  getIndexes ( request: EditTableRequest ) {
    return this._http.post(`${this.httpUrl}/getIndexes`, request, this.httpOptions);
  }

  /**
   * Drop an index of a table
   */
  dropIndex( index: Index ){
    return this._http.post(`${this.httpUrl}/dropIndex`, index, this.httpOptions);
  }

  /**
   * Create an index
   */
  createIndex ( index: Index ) {
    return this._http.post(`${this.httpUrl}/createIndex`, index, this.httpOptions);
  }

  /**
   * Get data placement information
   */
  getDataPlacements(schema: string, table: string) {
    const index = new Index(schema, table, '', '', '', []);
    return this._http.post(`${this.httpUrl}/getPlacements`, index, this.httpOptions);
  }

  getUnderlyingTable( request: TableRequest ) {
    return this._http.post(`${this.httpUrl}/getUnderlyingTable`, request, this.httpOptions);
  }


  /**
   * Add or drop a placement
   */
  addDropPlacement(schema: string, table: string, store: string, method: 'ADD' | 'DROP' | 'MODIFY', columns = []) {
    const index = new Index(schema, table, null, store, method, columns);
    return this._http.post(`${this.httpUrl}/addDropPlacement`, index, this.httpOptions);
  }

  // PARTITIONING

  getPartitionTypes () {
    return this._http.get(`${this.httpUrl}/getPartitionTypes`, this.httpOptions);
  }

  getPartitionFunctionModel( request: PartitioningRequest ) {
    return this._http.post(`${this.httpUrl}/getPartitionFunctionModel`, request, this.httpOptions);
  }

  partitionTable ( request: PartitionFunctionModel ) {
    return this._http.post(`${this.httpUrl}/partitionTable`, request, this.httpOptions);
  }

  mergePartitions ( request: PartitioningRequest ) {
    return this._http.post(`${this.httpUrl}/mergePartitions`, request, this.httpOptions);
  }

  modifyPartitions ( request: ModifyPartitionRequest ) {
    return this._http.post(`${this.httpUrl}/modifyPartitions`, request, this.httpOptions);
  }

  /**
   * Get information for the Uml view, such as
   * the list of all tables of a schema with their columns
   * and a list of all the foreign keys of a schema
   */
  getUml(request: EditTableRequest) {
    return this._http.post(`${this.httpUrl}/getUml`, request, this.httpOptions);
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
      msg => {},
      err => {
        //this.reconnected.emit(false);
        this.connected = false;
        setTimeout(() => {
          this.initWebSocket();
        }, +this._settings.getSetting('reconnection.timeout'));
      }
    );
  }

  /*socketSend( msg: string ) {
    this.socket.next(msg);
  }*/

  onSocketEvent () {
    return this.socket;
  }

  onReconnection(){
    return this.reconnected;
  }

  getAnalyzerPage (analyzerId: string, analyzerPage: string ) {
    return this._http.post(`${this.httpUrl}/getAnalyzerPage`, [analyzerId, analyzerPage], this.httpOptions);
  }

  /**
   * Add a foreign key (in the Uml view)
   */
  addForeignKey ( fk: ForeignKey ) {
    return this._http.post(`${this.httpUrl}/addForeignKey`, fk, this.httpOptions);
  }

  /**
   * Execute a relational algebra
   */
  executeRelAlg ( socket: WebSocket, relAlg: Node, cache: boolean, analyzeQuery, createView?: boolean, tableType?: string, viewName?: string, store?: string, freshness?: string, interval?: string, timeUnit?: string) {
    let request;
    if(createView){
      if(tableType === 'MATERIALIZED'){
        request = new RelAlgRequest( relAlg, cache, analyzeQuery, createView, 'materialized',viewName, store, freshness, interval, timeUnit);
      }else{
        request = new RelAlgRequest( relAlg, cache, analyzeQuery, createView, 'view',  viewName);
      }
    }else{
      request = new RelAlgRequest( relAlg, cache, analyzeQuery );
    }
    return socket.sendMessage( request );
  }


  renameTable ( table: Index ) {
    return this._http.post(`${this.httpUrl}/renameTable`, table, this.httpOptions);
  }

  /**
   * Send a request to either create or drop a schema
   */
  createOrDropSchema ( schema: Schema ) {
    return this._http.post(`${this.httpUrl}/schemaRequest`, schema, this.httpOptions);
  }

  /**
   * Get all supported data types of the DBMS.
   */
  getTypeInfo () {
    return this._http.get(`${this.httpUrl}/getTypeInfo`, this.httpOptions);
  }

  /**
   * Fetch available actions for foreign key constraints
   */
  getFkActions(){
    return this._http.get(`${this.httpUrl}/getForeignKeyActions`, this.httpOptions);
  }

  importDataset ( tables: any, schema: string, store: string, url: string, createPks: boolean, addDefault: boolean ) {
    return this._http.post(`${this.httpUrl}/importDataset`, {tables: tables, schema: schema, store: store, url: url, createPks: createPks, defaultValues: addDefault}, this.httpOptions);
  }

  exportTable( name: string, description: string, schema: string, tables: any, pub: number, createPks: boolean, addDefault: boolean ){
    const body = {
      userId: this._hub.getId(),
      secret: this._hub.getSecret(),
      name: name,
      description: description,
      schema: schema,
      tables: tables,
      pub: pub,
      hubLink: this._hub.getHubUrl(),
      createPks: createPks,
      defaultValues: addDefault
    };
    //const index = new Index( schema, table, this._settings.getConnection('hub.url'), null, null );
    return this._http.post( `${this.httpUrl}/exportTable`, body );
  }

  getTypeSchemas() {
    return this._http.get( `${this.httpUrl}/getTypeSchemas`, this.httpOptions );
  }

  getStores(){
    return this._http.get( `${this.httpUrl}/getStores` );
  }

  getAvailableStoresForIndexes( request: Index ){
    return this._http.post( `${this.httpUrl}/getAvailableStoresForIndexes`, request, this.httpOptions );
  }

  updateAdapterSettings(adapter: Adapter ){
    return this._http.post( `${this.httpUrl}/updateAdapterSettings`, adapter );
  }

  getSources(){
    return this._http.get( `${this.httpUrl}/getSources` );
  }

  getAvailableStores(){
    return this._http.get( `${this.httpUrl}/getAvailableStores` );
  }

  getAvailableSources() {
    return this._http.get( `${this.httpUrl}/getAvailableSources` );
  }

  addAdapter(fd: FormData ){
    return this._http.post( `${this.httpUrl}/addAdapter`, fd );
  }

  removeAdapter(storeId: string ){
    return this._http.post( `${this.httpUrl}/removeAdapter`, storeId, this.httpOptions );
  }

  getQueryInterfaces () {
    return this._http.get( `${this.httpUrl}/getQueryInterfaces` );
  }

  getAvailableQueryInterfaces () {
    return this._http.get( `${this.httpUrl}/getAvailableQueryInterfaces` );
  }

  addQueryInterface( request: any ) {
    return this._http.post( `${this.httpUrl}/addQueryInterface`, request, this.httpOptions );
  }

  updateQueryInterfaceSettings( request: QueryInterface ) {
    return this._http.post( `${this.httpUrl}/updateQueryInterfaceSettings`, request, this.httpOptions );
  }

  removeQueryInterface( queryInterfaceId: string ){
    return this._http.post( `${this.httpUrl}/removeQueryInterface`, queryInterfaceId, this.httpOptions );
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
  getFileUrl ( fileName: string ): string {
    if( fileName.startsWith('http://') || fileName.startsWith('https://')){
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

  getNameValidator ( required: boolean = false ) {
    if ( required ){
      return [Validators.pattern('^[a-zA-Z_][a-zA-Z0-9_]*$'), Validators.required, Validators.max(100)];
    } else {
      return [Validators.pattern('^[a-zA-Z_][a-zA-Z0-9_]*$'), Validators.max(100)];
    }
  }

  invalidNameMessage ( type: string = '' ) {
    type = type + ' ';
    return `Please provide a valid ${type}name`;
  }

  getValidationRegex(){
    return new RegExp( '^[a-zA-Z_][a-zA-Z0-9_]*$' );
  }

  nameIsValid( name: string ) {
    const regex = this.getValidationRegex();
    return regex.test( name ) && name.length <= 100;
  }

  getValidationClass( name: string ){
    const regex = this.getValidationRegex();
    if( name === '' ){
      return '';
    }
    else if( regex.test( name ) && name.length <= 100 ){
      return 'is-valid';
    } else {
      return 'is-invalid';
    }
  }

}
