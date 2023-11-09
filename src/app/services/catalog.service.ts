import {effect, Injectable, signal, untracked, WritableSignal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {WebuiSettingsService} from './webui-settings.service';
import {AdapterTemplateModel, AllocationColumnModel, AllocationEntityModel, AllocationPartitionModel, AllocationPlacementModel, AssetsModel, CatalogState, ColumnModel, ConstraintModel, EntityModel, EntityType, FieldModel, IdEntity, KeyModel, LogicalSnapshotModel, NamespaceModel} from '../models/catalog.model';
import {NamespaceType} from '../models/ui-request.model';
import {SidebarNode} from '../models/sidebar-node.model';
import {combineLatestWith, Observable, Subject} from 'rxjs';
import {DbmsTypesService} from './dbms-types.service';
import {map} from 'rxjs/operators';
import {AdapterModel, AdapterType} from '../views/adapters/adapter.model';
import {AuthService} from './auth.service';
import {WebSocket} from './webSocket';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {

  public listener: WritableSignal<CatalogService> = signal(this);
  public state: WritableSignal<CatalogState> = signal(CatalogState.INIT);

  private httpUrl = this._settings.getConnection('crud.rest');

  private assets: AssetsModel;

  private snapshot: LogicalSnapshotModel;
  public readonly namespaces: WritableSignal<Map<number, NamespaceModel>> = signal(new Map<number, NamespaceModel>());
  public readonly namespacesNames: WritableSignal<Map<string, NamespaceModel>> = signal(new Map<string, NamespaceModel>());
  public readonly entities: WritableSignal<Map<number, EntityModel>> = signal(new Map<number, EntityModel>());
  public readonly fields: WritableSignal<Map<number, FieldModel>> = signal(new Map<number, FieldModel>());
  public readonly fieldNames: WritableSignal<Map<string, FieldModel>> = signal(new Map<string, FieldModel>());
  public readonly keys: WritableSignal<Map<number, KeyModel>> = signal(new Map<number, KeyModel>());
  public readonly constraints: WritableSignal<Map<number, ConstraintModel>> = signal(new Map<number, ConstraintModel>());

  public readonly placements: WritableSignal<Map<number, AllocationPlacementModel>> = signal(new Map<number, AllocationPlacementModel>());
  public readonly partitions: WritableSignal<Map<number, AllocationPartitionModel>> = signal(new Map<number, AllocationPartitionModel>());
  public readonly allocations: WritableSignal<Map<number, AllocationEntityModel>> = signal(new Map<number, AllocationEntityModel>());
  public readonly allocationColumns: WritableSignal<Map<number, AllocationColumnModel>> = signal(new Map());

  public readonly adapters: WritableSignal<Map<number, AdapterModel>> = signal(new Map());
  public readonly adapterTemplates: WritableSignal<Map<string, AdapterTemplateModel>> = signal(new Map<string, AdapterTemplateModel>()); // typescript uses by reference comparisons, so this is necessary

  constructor(
      private _http: HttpClient,
      private _settings: WebuiSettingsService,
      private _types: DbmsTypesService,
      private _auth: AuthService
  ) {
    this.state.set(CatalogState.LOADING);

    effect(() => {
      const id = this._auth.id();
      if (!id) {
        return;
      }
      untracked(() => {
        this.initWebsocket(id, this._auth.websocket);
      });
    });


    this.updateIfNecessary().pipe(combineLatestWith(this.updateAssets()), combineLatestWith(_types.getTypes())).subscribe(() => {
      this.state.set(CatalogState.UP_TO_DATE);
    });
  }

  private initWebsocket(id: string, websocket: WebSocket) {
    websocket.onMessage().subscribe({
      next: (snapshot: LogicalSnapshotModel) => {
        console.log(snapshot);
        this.updateSnapshot(snapshot);
      }
    });
  }

  getSnapshot(): Observable<CatalogService> {
    return this._http.get(`${this.httpUrl}/getSnapshot`).pipe(map((snapshot: LogicalSnapshotModel) => {
      this.updateSnapshot(snapshot);
      return this;
    }));
  }

  private updateSnapshot(snapshot: LogicalSnapshotModel) {
    this.snapshot = snapshot;
    console.log(this.snapshot);

    this.namespaces.set(this.toIdMap(snapshot.namespaces));
    this.namespacesNames.set(this.toNameMap(snapshot.namespaces));
    this.entities.set(this.toIdMap(this.snapshot.entities));
    this.fields.set(this.toIdMap(this.snapshot.fields));
    this.fieldNames.set(this.toNameMap(this.snapshot.fields));
    this.keys.set(this.toIdMap(this.snapshot.keys));
    this.constraints.set(this.toIdMap(this.snapshot.constraints));
    this.placements.set(this.toIdMap(this.snapshot.placements));
    this.partitions.set(this.toIdMap(this.snapshot.partitions));
    this.allocations.set(this.toIdMap(this.snapshot.allocations));
    this.allocationColumns.set(this.toIdMap(this.snapshot.allocColumns));
    this.adapters.set(this.toIdMap(this.snapshot.adapters));
    this.adapterTemplates.set(new Map(this.snapshot.adapterTemplates.map(t => [t.adapterName + '_' + t.adapterType, t])));

    this.listener.set(this); // notify
    this.state.set(CatalogState.UP_TO_DATE);
  }

  updateIfNecessary(): Observable<CatalogService> {
    const sub: Subject<CatalogService> = new Subject();
    this._http.get(`${this.httpUrl}/getCurrentSnapshot`).subscribe((id: number) => {
      this.getSnapshot().subscribe(() => {
        sub.next(this);
      });
    });
    return sub.pipe();
  }

  getSchemaTree(routerLinkRoot: string, views: boolean, depth: number, schemaEdit?: boolean, dataModels: NamespaceType[] = [NamespaceType.RELATIONAL, NamespaceType.DOCUMENT, NamespaceType.GRAPH]) {
    return this.buildSchemaTree(routerLinkRoot, views, depth, schemaEdit, dataModels);

  }

  private toIdMap<T extends IdEntity>(idEntities: T[]) {
    return new Map(idEntities.map(n => [n.id, n]));
  }

  private toNameMap<T extends IdEntity>(idEntities: T[]) {
    return new Map(idEntities.map(n => [n.name, n]));
  }


  getEntity(entityId: number): EntityModel {
    return this.entities().get(entityId);
  }

  getNamespaceNames(): string[] {
    return Array.from(this.namespaces().values()).map(n => n.name);
  }

  getNamespaceFromName(name: string): NamespaceModel {
    return this.namespacesNames().get(name);
  }

  getNamespaceFromId(id: number): NamespaceModel {
    return this.namespaces().get(id);
  }

  getNamespaces(): NamespaceModel[] {
    return Array.from(this.namespaces().values());
  }

  getEntityFromName(namespace: string, name: string): EntityModel {
    const namespaces = Array.from(this.namespaces().values()).filter(n => (n.caseSensitive ? n.name === namespace : n.name.toLowerCase() === namespace.toLowerCase())
        || n.namespaceType === NamespaceType.GRAPH && name.toLowerCase() === n.name.toLowerCase() || namespace.toLowerCase() === n.name.toLowerCase());
    if (namespaces.length === 0) {
      return null;
    }

    return Array.from(this.entities().values()).filter(e => e.namespaceId === namespaces[0].id && e.name === name || (e.namespaceType === NamespaceType.GRAPH && namespace.toLowerCase() === e.name.toLowerCase()))[0];
  }

  getFullEntityName(entityId: number): String {
    const entity = this.entities().get(entityId);
    const namespace = this.namespaces().get(entity.namespaceId);
    return namespace.name + '.' + entity.name;
  }

  //// UTIL


  private buildSchemaTree(routerLinkRoot: string, views: boolean, depth: number, schemaEdit: boolean, dataModels: NamespaceType[]): SidebarNode[] {
    const nodes: SidebarNode[] = [];
    for (const namespace of this.namespaces().values()) {
      const namespaceNode = new SidebarNode(namespace.name, namespace.name, this.getNamespaceIcon(namespace.namespaceType) + ' me-1', '');

      if (depth > 1) {
        switch (namespace.namespaceType) {
          case NamespaceType.DOCUMENT:
            this.attachDocumentTree(namespace, namespaceNode, routerLinkRoot, depth, views);
            break;
          case NamespaceType.RELATIONAL:
            this.attachRelationalTree(namespace, namespaceNode, routerLinkRoot, depth, views);
            break;
          case NamespaceType.GRAPH:
            namespaceNode.routerLink = routerLinkRoot + '' + namespace.name;
            break;
        }
      }
      nodes.push(namespaceNode);
    }

    return nodes;
  }

  private attachDocumentTree(namespace: NamespaceModel, namespaceNode: SidebarNode, routerLinkRoot: string, depth: number, views: boolean) {
    const nodes: SidebarNode[] = [];
    const collections: EntityModel[] = Array.from(this.entities().values()).filter(e => e.namespaceId === namespace.id);

    for (const collection of collections) {

      let icon = this.getNamespaceIcon(collection.namespaceType);
      switch (collection.entityType) {
        case EntityType.SOURCE:
          icon = this.assets.SOURCE_ICON;
          break;
        case EntityType.VIEW:
          icon = this.assets.VIEW_ICON;
          break;
      }
      const collectionTree = new SidebarNode(namespace.name + '.' + collection.name, collection.name, icon + ' me-1', routerLinkRoot + namespace.name + '.' + collection.name);

      nodes.push(collectionTree);
    }
    namespaceNode.children.push(...nodes);
  }

  private attachRelationalTree(namespace: NamespaceModel, namespaceNode: SidebarNode, routerLinkRoot: string, depth: number, views: boolean) {
    const nodes: SidebarNode[] = [];
    const tables: EntityModel[] = Array.from(this.entities().values()).filter(t => t.namespaceId === namespace.id);
    for (const table of tables) {
      let icon = this.assets.TABLE_ICON;

      switch (table.entityType) {
        case EntityType.SOURCE:
          icon = this.assets.SOURCE_ICON;
          break;
        case EntityType.VIEW:
        case EntityType.MATERIALIZED_VIEW:
          icon = this.assets.VIEW_ICON;
          break;
      }

      const tableNode = new SidebarNode(namespace.name + '.' + table.name, table.name, icon + ' me-1', routerLinkRoot + namespace.name + '.' + table.name);

      if (depth > 2) {
        const columns = Array.from(this.snapshot.fields.values()).filter(f => f.entityId === table.id);
        for (const column of columns) {
          tableNode.children.push(new SidebarNode(namespace.name + '.' + table.name + '.' + column.name, column.name, icon, routerLinkRoot));
        }
      }
      nodes.push(tableNode);

    }
    namespaceNode.children.push(...nodes);
    namespaceNode.routerLink = '';
  }

  private updateAssets() {
    return new Observable(subscriber => this._http.get(`${this.httpUrl}/getAssetsDefinition`).subscribe((assets: AssetsModel) => {
      this.assets = assets;
      subscriber.next({});

      return {
        unsubscribe() {
        }
      };
    }));
  }

  private getNamespaceIcon(namespaceType: NamespaceType): string {
    switch (namespaceType) {
      case NamespaceType.DOCUMENT:
        return this.assets.DOCUMENT_ICON;
      case NamespaceType.RELATIONAL:
        return this.assets.RELATIONAL_ICON;
      case NamespaceType.GRAPH:
        return this.assets.GRAPH_ICON;
    }
  }

  getEntities(namespaceId: number): EntityModel[] {
    return Array.from(this.entities().values()).filter(n => n.namespaceId === namespaceId);
  }

  getColumns(entityId: number): ColumnModel[] {
    return Array.from(this.fields().values()).filter(f => f.entityId === entityId).map(f => <ColumnModel>f);
  }

  getPrimaryKey(entityId: number): KeyModel {
    return Array.from(this.keys().values()).filter(k => k.isPrimary && k.entityId === entityId)[0];
  }

  getKey(keyId: number): KeyModel {
    return this.keys().get(keyId);
  }

  getKeys(entityId: number): KeyModel[] {
    return Array.from(this.keys().values()).filter(k => k.entityId === entityId);
  }

  getConstraint(constraintId: number): ConstraintModel {
    return this.constraints().get(constraintId);
  }

  getConstraints(entityId: number): ConstraintModel[] {
    const constraints = Array.from(this.constraints().values());
    const keys = Array.from(this.keys().values()).filter(k => k.entityId === entityId).map(k => k.id);
    return constraints.filter(c => keys.includes(c.keyId));
  }

  getPlacements(entityId: number): AllocationPlacementModel[] {
    return Array.from(this.placements().values()).filter(p => p.logicalEntityId === entityId);
  }

  getPartitions(entityId: number): AllocationPartitionModel[] {
    return Array.from(this.partitions().values()).filter(p => p.logicalEntityId === entityId);
  }


  getAllocColumns(placemenId: number): AllocationColumnModel[] {
    return Array.from(this.allocationColumns().values()).filter(a => a.placementId === placemenId);
  }

  getAllocColumn(id: number): AllocationColumnModel {
    return Array.from(this.allocationColumns().values()).filter(c => c.id === id)[0];
  }

  getAdapter(adapterId: number) {
    return this.adapters().get(adapterId);
  }

  getAvailableStoresForIndexes(entityId: number): AdapterModel[] {
    const adapterIds = Array.from(this.placements().values()).map(p => p.adapterId);
    return Array.from(this.adapters().values()).filter(a => adapterIds.includes(a.id)).filter(a => a.type === AdapterType.STORE);
  }

  getStores(): AdapterModel[] {
    return Array.from(this.adapters().values()).filter(a => {
      return a.type === AdapterType.STORE;
    });
  }

  getSources() {
    return Array.from(this.adapters().values()).filter(a => {
      return a.type === AdapterType.SOURCE;
    });
  }

  getAdapterTemplate(adapterName: string, type: AdapterType): AdapterTemplateModel {
    return this.adapterTemplates().get(adapterName + '_' + type);
  }

  getAdapterTemplates() {
    return Array.from(this.adapterTemplates().values());
  }

  getLogicalField(id: number) {
    return Array.from(this.fields().values()).filter(f => f.id === id)[0];
  }

  getLogicalColumn(id: number) {
    const column = this.getLogicalField(id);
    return column as ColumnModel;
  }

  getAllocsOfPlacement(logicalId: number, allocId: number, adapterId: number): AllocationPartitionModel[] {
    const partitions = Array.from(this.partitions().values()).filter(p => p.logicalEntityId === logicalId);
    const allocPartitionIds = Array.from(this.allocations().values()).filter(a => a.id === allocId).map(a => a.partitionId);

    return partitions.filter(p => allocPartitionIds.includes(p.id));
  }

  getAllocations(logicalEntityId: number) {
    return Array.from(this.allocations().values()).filter(a => a.logicalEntityId === logicalEntityId);
  }

  getEntityFromIdName(namespaceId: number, entityName: string) {
    return Array.from(this.entities().values()).filter(e => e.namespaceId === namespaceId && e.name === entityName)[0];
  }


}
