import {NamespaceType} from './ui-request.model';


export interface IdEntity{
  id: number;
  name: string;
}

// tslint:disable-next-line:no-empty-interface
export interface NamespaceModel extends IdEntity {

}

export interface EntityModel extends IdEntity {
  namespaceId: number;
  entityType: EntityType;
}

export interface SnapshotModel {
  id: number;
  namespace: NamespaceModel[];
  entities: EntityModel[];
}

export enum EntityType {
  ENTITY,
  SOURCE,
  VIEW,
  MATERIALIZED_VIEW
}


//// REQUESTS
export class NamespaceRequest{

  dataModels: NamespaceType[] = null;
  
  constructor(dataModels: NamespaceType[] = null) {
    this.dataModels = dataModels;
  }
}
