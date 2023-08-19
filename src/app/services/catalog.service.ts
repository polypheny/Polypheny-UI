import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {WebuiSettingsService} from './webui-settings.service';
import {AssetsModel, ConstraintModel, EntityModel, EntityType, FieldModel, IdEntity, KeyModel, NamespaceModel, NamespaceRequest, LogicalSnapshotModel, TableModel} from '../models/catalog.model';
import {NamespaceType} from '../models/ui-request.model';
import {SidebarNode} from '../models/sidebar-node.model';
import {BehaviorSubject, Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {

  public listener:BehaviorSubject<any> = new BehaviorSubject<any>( {});

  private httpUrl = this._settings.getConnection('crud.rest');
  private httpOptions = {headers: new HttpHeaders({'Content-Type': 'application/json'})};

  private assets: AssetsModel;

  private snapshot: LogicalSnapshotModel;
  private namespaces: BehaviorSubject<Map<number, NamespaceModel>> = new BehaviorSubject(new Map<number, NamespaceModel>());
  private namespacesNames: BehaviorSubject<Map<string, NamespaceModel>> = new BehaviorSubject(new Map<string, NamespaceModel>());
  private entities: BehaviorSubject<Map<number, EntityModel>> = new BehaviorSubject(new Map<number, EntityModel>());
  private entitiesNames: BehaviorSubject<Map<string, EntityModel>> = new BehaviorSubject(new Map<string, EntityModel>());
  private fields: BehaviorSubject<Map<number, FieldModel>> = new BehaviorSubject( new Map<number, FieldModel>());
  private fieldNames: BehaviorSubject<Map<string, FieldModel>> = new BehaviorSubject( new Map<string, FieldModel>());
  private keys: BehaviorSubject<Map<number, KeyModel>> = new BehaviorSubject( new Map<number, KeyModel>());
  private constraints: BehaviorSubject<Map<number, ConstraintModel>> = new BehaviorSubject( new Map<number, ConstraintModel>());

  constructor(
      private _http: HttpClient,
      private _settings: WebuiSettingsService
  ) {
    this.updateIfNecessary();
    this.updateAssets();
  }

  updateSnapshot() {
    return new Observable( observer => this._http.get(`${this.httpUrl}/getSnapshot`).subscribe((snapshot: LogicalSnapshotModel) => {
      this.snapshot = snapshot;
      console.log(this.snapshot);

      this.namespaces.next(this.toIdMap(snapshot.namespaces));
      this.namespacesNames.next(this.toNameMap(snapshot.namespaces));
      this.entities.next(this.toIdMap( this.snapshot.entities ));
      this.entitiesNames.next(this.toNameMap(this.snapshot.entities));
      this.fields.next(this.toIdMap(this.snapshot.fields));
      this.fieldNames.next(this.toNameMap(this.snapshot.fields));
      this.keys.next(this.toIdMap(this.snapshot.keys));
      this.constraints.next(this.toIdMap(this.snapshot.constraints));

      this.listener.next({}); // notify

      observer.next();

      return{unsubscribe(){}};
    }));
  }

  updateIfNecessary() {
    return new Observable( observer => this._http.get(`${this.httpUrl}/getCurrentSnapshot`).subscribe( (id: number) => {

      this.updateSnapshot().subscribe(() => {
        observer.next();
        });

      return {unsubscribe() {}};
    }));

  }

  getSchemaTree( routerLinkRoot: string, views: boolean, depth: number, showTable: boolean, schemaEdit?: boolean, dataModels: NamespaceType[] = [NamespaceType.RELATIONAL, NamespaceType.DOCUMENT, NamespaceType.GRAPH] ) {
    return new Observable<SidebarNode[]>( observer => {
      this.updateIfNecessary().subscribe(() => {
        observer.next(this.buildSchemaTree(routerLinkRoot, views, depth, showTable, schemaEdit, dataModels) );
      });

      return {unsubscribe() {}};
    });

  }

  private toIdMap<T extends IdEntity>(idEntities: T[]) {
    return new Map(idEntities.map(n => [n.id, n]));
  }

  private toNameMap<T extends IdEntity>(idEntities: T[]) {
    return new Map(idEntities.map(n => [n.name, n]));
  }


  getEntity(tableId: number): EntityModel {
    return this.entities.value.get(tableId);
  }

  getNamespaceNames(): string[] {
    return Array.from(this.namespaces.value.values()).map(n => n.name);
  }

  getNamespaceFromName(name: string):NamespaceModel {
    return this.namespacesNames.value.get(name);
  }

  getNamespaceFromId(id: number):NamespaceModel {
    return this.namespaces.value.get(id);
  }

  getEntityFromName(name: string) {
    return this.entitiesNames.value.get(name);
  }

  getFullEntityName(entityId: number) {
    const entity = this.entities.value.get(entityId);
    const namespace = this.namespaces.value.get(entity.namespaceId);
    return namespace.name + '.' + entity.name;
  }

  //// UTIL


  private buildSchemaTree(routerLinkRoot: string, views: boolean, depth: number, showTable: boolean, schemaEdit: boolean, dataModels: NamespaceType[]): SidebarNode[]  {
    const nodes: SidebarNode[] = [];
    for (const namespace of this.namespaces.value.values()) {
      const namespaceNode = new SidebarNode( namespace.name, namespace.name, this.getNamespaceIcon(namespace.namespaceType), '');

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
    const nodes:SidebarNode[] = [];
    const collections:EntityModel[] = Array.from(this.entities.value.values()).filter(e => e.namespaceId === namespace.id);

    for (const collection of collections) {

      let icon = this.getNamespaceIcon(collection.namespaceType);
      if ( collection.entityType === EntityType.SOURCE ) {
        icon = this.assets.SOURCE_ICON;
      } else if ( collection.entityType === EntityType.VIEW ) {
        icon = this.assets.VIEW_ICON;
      }
      const collectionTree = new SidebarNode( namespace.name + '.' + collection.name, collection.name, icon, routerLinkRoot );

      nodes.push(collectionTree);
    }

    if (showTable) {
      const node = new SidebarNode( namespace.name + '.tables', 'tables', this.getNamespaceIcon(namespace.namespaceType),  routerLinkRoot );
      node.children.push( ...nodes );
      namespaceNode.children.push(node);
    }else {
      namespaceNode.children.push(...nodes);
    }

  }

  private attachRelationalTree(namespace: NamespaceModel, namespaceNode: SidebarNode, routerLinkRoot: string, depth: number, views: boolean, showTable: boolean) {
    const nodes:SidebarNode[] = [];
    const tables:EntityModel[] = Array.from(this.entities.value.values()).filter( t => t.namespaceId === namespace.id );

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

      const tableNode = new SidebarNode(namespace.name + '.' + table.name, table.name, routerLinkRoot, icon );

      if (depth > 2) {
        const columns = Array.from(this.snapshot.fields.values()).filter( f => f.entityId === table.entityType );
        for (const column of columns) {
          tableNode.children.push(new SidebarNode(namespace.name + '.' + table.name + '.' + column.name, column.name, icon, routerLinkRoot));
        }
      }
      nodes.push(tableNode);

    }
    if (showTable) {
      const node = new SidebarNode( namespace.name + '.tables', 'tables', this.getNamespaceIcon(namespace.namespaceType),  routerLinkRoot );
      node.children.push( ...nodes );
      namespaceNode.children.push(node);
    }else {
      namespaceNode.children.push(...nodes);
    }

  }

  private updateAssets() {
    this._http.get(`${this.httpUrl}/getAssetsDefinition`).subscribe((assets: AssetsModel) => {
      this.assets = assets;
    });
  }

  private getNamespaceIcon(namespaceType: NamespaceType):string {
    switch (namespaceType) {
      case NamespaceType.DOCUMENT:
        return this.assets.DOCUMENT_ICON;
      case NamespaceType.RELATIONAL:
        return this.assets.RELATIONAL_ICON;
      case NamespaceType.GRAPH:
        return this.assets.GRAPH_ICON;
    }
  }

  getEntities(namespaceId: number) {
    return Array.from(this.entities.value.values()).filter(n => n.namespaceId === namespaceId);
  }

  getColumns(entityId: number) {
    return Array.from(this.fields.value.values()).filter(f => f.entityId === entityId);
  }

  getPrimaryKey(entityId: number) {
    return this.keys.value.get((<TableModel> this.entities.value.get(entityId)).primaryKey);
  }

  getConstraints(entityId: number) {
    return undefined;
  }
}
