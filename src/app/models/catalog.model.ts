import {NamespaceType} from './ui-request.model';
import {PolyType} from '../components/data-view/models/result-set.model';


export interface IdEntity{
  id: number;
  name: string;
}

// tslint:disable-next-line:no-empty-interface
export interface NamespaceModel extends IdEntity {
  namespaceType: NamespaceType;
  caseSensitive: boolean;
}

export interface EntityModel extends IdEntity {
  namespaceId: number;
  namespaceType: NamespaceType;
  entityType: EntityType;
  modifiable: boolean;
}

// tslint:disable-next-line:no-empty-interface
export interface TableModel extends EntityModel{
  primaryKey: number;
}

// tslint:disable-next-line:no-empty-interface
export interface CollectionModel extends EntityModel{

}

// tslint:disable-next-line:no-empty-interface
export interface GraphModel extends EntityModel{

}

// tslint:disable-next-line:no-empty-interface
export interface FieldModel extends IdEntity{
  entityId: number;
}

export interface ColumnModel extends FieldModel{
  type: PolyType;
  collectionsType: PolyType;
  nullable: boolean;
  position: number;
  unique: boolean;
  precision: number;
  scale: number;
  defaultValue: string;
  dimension: number;
  cardinality: number;
}

export interface LogicalSnapshotModel {
  id: number;
  namespaces: NamespaceModel[];
  entities: EntityModel[];
  fields: FieldModel[];
  keys: KeyModel[];
  constraints: ConstraintModel[];
  placements: AllocationPlacementModel[];
  partitions: AllocationPartitionModel[];
  allocations: AllocationEntityModel[];
}


export interface KeyModel extends IdEntity{
  entityId: number;
  namespaceId: number;
  columnIds: number[];
  isPrimary: boolean;
}

export interface ConstraintModel extends IdEntity{
  keyId: number;
  type: string;
}

export interface AllocationEntityModel extends IdEntity{
  logicalEntityId: number;
  placementId: number;
  partitionId: number;
}

export interface AllocationPlacementModel extends IdEntity{
  logicalEntityId: number;
  adapterId: number;
}

export interface AllocationPartitionModel extends IdEntity{
  logicalEntityId: number;
}

export enum EntityType {
  ENTITY= 'ENTITY',
  SOURCE = 'SOURCE',
  VIEW = 'VIEW',
  MATERIALIZED_VIEW = 'MATERIALIZED_VIEW'
}

//// UTIL

export interface AssetsModel {
  RELATIONAL_ICON: string;
  DOCUMENT_ICON: string;
  GRAPH_ICON: string;
  TABLE_ICON: string;
  COLLECTION_ICON: string;
  VIEW_ICON: string;
  SOURCE_ICON: string;
}



//// REQUESTS
export class NamespaceRequest{

  dataModels: NamespaceType[] = null;
  
  constructor(dataModels: NamespaceType[] = null) {
    this.dataModels = dataModels;
  }
}


