import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {WebuiSettingsService} from './webui-settings.service';
import {EntityModel, IdEntity, NamespaceModel, NamespaceRequest} from '../models/catalog.model';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {

  private namespaces = new Map<number, NamespaceModel>();
  private namespacesNames = new Map<string, NamespaceModel>();
  private entities = new Map<number, EntityModel>();
  private httpUrl = this._settings.getConnection('crud.rest');
  private httpOptions = {headers: new HttpHeaders({'Content-Type': 'application/json'})};

  constructor(
      private _http: HttpClient,
      private _settings: WebuiSettingsService
  ) {

  }

  updateNamespaces() {
    const request = new NamespaceRequest();
    this._http.post(`${this.httpUrl}/getNamespaces`, request).subscribe(res => {
      this.namespaces = this.toIdMap(<NamespaceModel[]>res);
      this.namespacesNames = this.toNameMap(<NamespaceModel[]>res);
      console.log(this.namespaces);
    });
  }

  private toIdMap<T extends IdEntity>(idEntities: T[]) {
    return new Map(idEntities.map(n => [n.id, n]));
  }

  private toNameMap<T extends IdEntity>(idEntities: T[]) {
    return new Map(idEntities.map(n => [n.name, n]));
  }


  getEntity(tableId: number): EntityModel {
    return this.entities.get(tableId);
  }

  getNamespaceNames(): string[] {
    return Array.from(this.namespaces.values()).map(n => n.name);
  }

  getNamespaceFromName(name: string):NamespaceModel {
    return this.namespacesNames.get(name);
  }

  getNamespaceFromId(id: number):NamespaceModel {
    return this.namespaces.get(id);
  }

  getFullEntityName(entityId: number) {
    const entity = this.entities.get(entityId);
    const namespace = this.namespaces.get(entity.namespaceId);
    return namespace.name + '.' + entity.name;
  }
}
