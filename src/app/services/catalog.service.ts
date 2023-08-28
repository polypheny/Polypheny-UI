import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {WebuiSettingsService} from './webui-settings.service';
import {AllocationColumnModel, AllocationEntityModel, AllocationPartitionModel, AllocationPlacementModel, AssetsModel, CatalogState, ColumnModel, ConstraintModel, EntityModel, EntityType, FieldModel, IdEntity, KeyModel, LogicalSnapshotModel, NamespaceModel} from '../models/catalog.model';
import {NamespaceType} from '../models/ui-request.model';
import {SidebarNode} from '../models/sidebar-node.model';
import {BehaviorSubject, combineLatestWith, firstValueFrom, Observable, Subject} from 'rxjs';
import {DbmsTypesService} from './dbms-types.service';
import {map, mergeMap} from 'rxjs/operators';
import {Adapter} from '../views/adapters/adapter.model';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {

  public listener: BehaviorSubject<CatalogService> = new BehaviorSubject<CatalogService>(this);
  public state: BehaviorSubject<CatalogState> = new BehaviorSubject(CatalogState.INIT);

  private httpUrl = this._settings.getConnection('crud.rest');
  private httpOptions = {headers: new HttpHeaders({'Content-Type': 'application/json'})};

  private assets: AssetsModel;

  private snapshot: LogicalSnapshotModel;
  public readonly namespaces: BehaviorSubject<Map<number, NamespaceModel>> = new BehaviorSubject(new Map<number, NamespaceModel>());
  public readonly namespacesNames: BehaviorSubject<Map<string, NamespaceModel>> = new BehaviorSubject(new Map<string, NamespaceModel>());
  public readonly entities: BehaviorSubject<Map<number, EntityModel>> = new BehaviorSubject(new Map<number, EntityModel>());
  public readonly fields: BehaviorSubject<Map<number, FieldModel>> = new BehaviorSubject(new Map<number, FieldModel>());
  public readonly fieldNames: BehaviorSubject<Map<string, FieldModel>> = new BehaviorSubject(new Map<string, FieldModel>());
  public readonly keys: BehaviorSubject<Map<number, KeyModel>> = new BehaviorSubject(new Map<number, KeyModel>());
  public readonly constraints: BehaviorSubject<Map<number, ConstraintModel>> = new BehaviorSubject(new Map<number, ConstraintModel>());

  public readonly placements: BehaviorSubject<Map<number, AllocationPlacementModel>> = new BehaviorSubject(new Map<number, AllocationPlacementModel>());
  public readonly partitions: BehaviorSubject<Map<number, AllocationPartitionModel>> = new BehaviorSubject(new Map<number, AllocationPartitionModel>());
  public readonly allocations: BehaviorSubject<Map<number, AllocationEntityModel>> = new BehaviorSubject(new Map<number, AllocationEntityModel>());
  public readonly allocationColumns: BehaviorSubject<Map<number, AllocationColumnModel>> = new BehaviorSubject(new Map());

  public readonly adapters: BehaviorSubject<Map<number, Adapter>> = new BehaviorSubject(new Map());

  constructor(
      private _http: HttpClient,
      private _settings: WebuiSettingsService,
      private _types: DbmsTypesService
  ) {
    this.state.next(CatalogState.LOADING);

    this.updateIfNecessary().pipe(combineLatestWith(this.updateAssets()), combineLatestWith(_types.getTypes())).subscribe(() => {
      this.state.next(CatalogState.UP_TO_DATE);
    });
  }

  updateSnapshot(): Observable<CatalogService> {
    console.log("updating")
    return this._http.get(`${this.httpUrl}/getSnapshot`).pipe(map((snapshot: LogicalSnapshotModel) => {
      this.snapshot = snapshot;
      console.log(this.snapshot);

      this.namespaces.next(this.toIdMap(snapshot.namespaces));
      this.namespacesNames.next(this.toNameMap(snapshot.namespaces));
      this.entities.next(this.toIdMap(this.snapshot.entities));
      this.fields.next(this.toIdMap(this.snapshot.fields));
      this.fieldNames.next(this.toNameMap(this.snapshot.fields));
      this.keys.next(this.toIdMap(this.snapshot.keys));
      this.constraints.next(this.toIdMap(this.snapshot.constraints));
      this.placements.next(this.toIdMap(this.snapshot.placements));
      this.partitions.next(this.toIdMap(this.snapshot.partitions));
      this.allocations.next(this.toIdMap(this.snapshot.allocations));
      this.allocationColumns.next(this.toIdMap(this.snapshot.allocColumns));
      this.adapters.next(this.toIdMap(this.snapshot.adapters));

      this.listener.next(this); // notify

      return this;
    }));
  }

  /**
   * This method wraps functions, which allows to send new value to the subscriber if their value changes
   *
   */
  private wrapBehaviorSubject<T>(fun: () => T): BehaviorSubject<T> {
    const sub = new BehaviorSubject(fun());
    this.listener.subscribe(() => {
      sub.next(fun());
    });
    return sub;
  }

  updateIfNecessary(): Observable<CatalogService> {
    const sub: Subject<CatalogService> = new Subject();
    this._http.get(`${this.httpUrl}/getCurrentSnapshot`).subscribe((id: number) => {
      this.updateSnapshot().subscribe(() => {
        sub.next(this);
      });
    });
    return sub.pipe();
  }

  getSchemaTree(routerLinkRoot: string, views: boolean, depth: number, showTable: boolean, schemaEdit?: boolean, dataModels: NamespaceType[] = [NamespaceType.RELATIONAL, NamespaceType.DOCUMENT, NamespaceType.GRAPH]) {
    return new Observable<SidebarNode[]>(observer => {
      this.updateIfNecessary().subscribe(() => {
        observer.next(this.buildSchemaTree(routerLinkRoot, views, depth, showTable, schemaEdit, dataModels));
      });

      return {
        unsubscribe() {
        }
      };
    });

  }

  private toIdMap<T extends IdEntity>(idEntities: T[]) {
    return new Map(idEntities.map(n => [n.id, n]));
  }

  private toNameMap<T extends IdEntity>(idEntities: T[]) {
    return new Map(idEntities.map(n => [n.name, n]));
  }


  getEntity(tableId: number): BehaviorSubject<EntityModel> {
    return this.wrapBehaviorSubject(() => this.entities.value.get(tableId));
  }

  getNamespaceNames(): BehaviorSubject<string[]> {
    return this.wrapBehaviorSubject(() => Array.from(this.namespaces.value.values()).map(n => n.name));
  }

  getNamespaceFromName(name: string): BehaviorSubject<NamespaceModel> {
    return this.wrapBehaviorSubject(() => this.namespacesNames.value.get(name));
  }

  getNamespaceFromId(id: number): BehaviorSubject<NamespaceModel> {
    return this.wrapBehaviorSubject(() => this.namespaces.value.get(id));
  }

  getNamespaces(): Observable<NamespaceModel[]> {
    return this.namespaces.pipe(map(n => Array.from(n.values())));
  }

  getEntityFromName(namespace: string, name: string): BehaviorSubject<EntityModel> {
    return this.wrapBehaviorSubject(() => {
      const namespaces = Array.from(this.namespaces.value.values()).filter(n => n.caseSensitive ? n.name === namespace : n.name.toLowerCase() === namespace.toLowerCase());
      if (namespaces.length === 0) {
        return null;
      }
      return Array.from(this.entities.value.values()).filter(e => e.namespaceId === namespaces[0].id && e.name === name)[0];
    });
  }

  getFullEntityName(entityId: number): BehaviorSubject<String> {
    return this.wrapBehaviorSubject(() => {
      const entity = this.entities.value.get(entityId);
      const namespace = this.namespaces.value.get(entity.namespaceId);
      return namespace.name + '.' + entity.name;
    });
  }

  //// UTIL


  private buildSchemaTree(routerLinkRoot: string, views: boolean, depth: number, showTable: boolean, schemaEdit: boolean, dataModels: NamespaceType[]): SidebarNode[] {
    const nodes: SidebarNode[] = [];
    for (const namespace of this.namespaces.value.values()) {
      const namespaceNode = new SidebarNode(namespace.name, namespace.name, this.getNamespaceIcon(namespace.namespaceType), '');

      if (depth > 1) {
        switch (namespace.namespaceType) {
          case NamespaceType.DOCUMENT:
            this.attachDocumentTree(namespace, namespaceNode, routerLinkRoot, depth, views, showTable);
            break;
          case NamespaceType.RELATIONAL:
            this.attachRelationalTree(namespace, namespaceNode, routerLinkRoot, depth, views, showTable);
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

  private attachDocumentTree(namespace: NamespaceModel, namespaceNode: SidebarNode, routerLinkRoot: string, depth: number, views: boolean, showTable: boolean) {
    const nodes: SidebarNode[] = [];
    const collections: EntityModel[] = Array.from(this.entities.value.values()).filter(e => e.namespaceId === namespace.id);

    for (const collection of collections) {

      let icon = this.getNamespaceIcon(collection.namespaceType);
      if (collection.entityType === EntityType.SOURCE) {
        icon = this.assets.SOURCE_ICON;
      } else if (collection.entityType === EntityType.VIEW) {
        icon = this.assets.VIEW_ICON;
      }
      const collectionTree = new SidebarNode(namespace.name + '.' + collection.name, collection.name, icon, routerLinkRoot);

      nodes.push(collectionTree);
    }

    if (showTable) {
      const node = new SidebarNode(namespace.name + '.tables', 'tables', this.getNamespaceIcon(namespace.namespaceType), routerLinkRoot);
      node.children.push(...nodes);
      namespaceNode.children.push(node);
    } else {
      namespaceNode.children.push(...nodes);
    }

  }

  private attachRelationalTree(namespace: NamespaceModel, namespaceNode: SidebarNode, routerLinkRoot: string, depth: number, views: boolean, showTable: boolean) {
    const nodes: SidebarNode[] = [];
    const tables: EntityModel[] = Array.from(this.entities.value.values()).filter(t => t.namespaceId === namespace.id);
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

      const tableNode = new SidebarNode(namespace.name + '.' + table.name, table.name, icon, routerLinkRoot + namespace.name + '.' + table.name);

      if (depth > 2) {
        const columns = Array.from(this.snapshot.fields.values()).filter(f => f.entityId === table.id);
        for (const column of columns) {
          tableNode.children.push(new SidebarNode(namespace.name + '.' + table.name + '.' + column.name, column.name, icon, routerLinkRoot));
        }
      }
      nodes.push(tableNode);

    }
    if (showTable) {
      const node = new SidebarNode(namespace.name + '.tables', 'tables', this.getNamespaceIcon(namespace.namespaceType), '');
      node.children.push(...nodes);
      namespaceNode.children.push(node);
    } else {
      namespaceNode.children.push(...nodes);
      namespaceNode.routerLink = '';
    }
    console.log(namespaceNode);

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

  getEntities(namespaceId: number): BehaviorSubject<EntityModel[]> {
    return this.wrapBehaviorSubject(() => Array.from(this.entities.value.values()).filter(n => n.namespaceId === namespaceId));
  }

  getColumns(entityId: number): BehaviorSubject<ColumnModel[]> {
    return this.wrapBehaviorSubject(() => Array.from(this.fields.value.values()).filter(f => f.entityId === entityId).map(f => <ColumnModel>f));
  }

  getPrimaryKey(entityId: number): BehaviorSubject<KeyModel> {
    return this.wrapBehaviorSubject(() => {
      return Array.from(this.keys.value.values()).filter(k => k.isPrimary && k.entityId === entityId)[0];
    });
  }

  getKey(keyId: number): BehaviorSubject<KeyModel> {
    return this.wrapBehaviorSubject(() => this.keys.value.get(keyId));
  }

  getKeys(entityId: number): BehaviorSubject<KeyModel[]> {
    return this.wrapBehaviorSubject(() => Array.from(this.keys.value.values()).filter(k => k.entityId === entityId));
  }

  getConstraint(constraintId: number): BehaviorSubject<ConstraintModel> {
    return this.wrapBehaviorSubject(() => this.constraints.value.get(constraintId));
  }

  getConstraints(entityId: number): BehaviorSubject<ConstraintModel[]> {
    return this.wrapBehaviorSubject(() => {
      const constraints = Array.from(this.constraints.value.values());
      const keys = Array.from(this.keys.value.values()).filter(k => k.entityId === entityId).map(k => k.id);
      return constraints.filter(c => keys.includes(c.keyId));
    });
  }

  getPlacements(entityId: number): BehaviorSubject<AllocationPlacementModel[]> {
    return this.wrapBehaviorSubject(() => Array.from(this.placements.value.values()).filter(p => p.logicalEntityId === entityId));
  }

  getPartitions(entityId: number): BehaviorSubject<AllocationPartitionModel[]> {
    return this.wrapBehaviorSubject(() => Array.from(this.partitions.value.values()).filter(p => p.logicalEntityId === entityId));
  }


  getAllocColumns(placemenId: number): BehaviorSubject<AllocationColumnModel[]> {
    return this.wrapBehaviorSubject(() => Array.from(this.allocationColumns.value.values()).filter(a => a.placementId === placemenId));
  }

  getAllocColumn(id: number): BehaviorSubject<AllocationColumnModel[]> {
    return this.wrapBehaviorSubject(() => Array.from(this.allocationColumns.value.values()).filter(c => c.id === id))[0];
  }

  getAdapter(adapterId: number) {
    return this.wrapBehaviorSubject(() => this.adapters.value.get(adapterId));
  }

  getAvailableStoresForIndexes(entityId: number): BehaviorSubject<Adapter[]> {
    return this.wrapBehaviorSubject(() => {
      const adapterIds = Array.from(this.placements.value.values()).map(p => p.adapterId);
      return Array.from(this.adapters.value.values()).filter(a => adapterIds.includes(a.adapterId));
    });
  }
}
