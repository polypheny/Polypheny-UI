import {DataModel} from './ui-request.model';
import {PolyType} from '../components/data-view/models/result-set.model';
import {AdapterModel, AdapterType, PartitionType, PlacementType} from '../views/adapters/adapter.model';

export enum CatalogState {
  INIT,
  LOADING,
  UP_TO_DATE
}

export class IdEntity {
  id: number;
  name: string;


  constructor(id: number, name: string) {
    this.id = id;
    this.name = name;
  }
}

// tslint:disable-next-line:no-empty-interface
export class NamespaceModel extends IdEntity {
  dataModel: DataModel;
  caseSensitive: boolean;
}

export class EntityModel extends IdEntity {
  namespaceId: number;
  dataModel: DataModel;
  entityType: EntityType;
  modifiable: boolean;
}

// tslint:disable-next-line:no-empty-interface
export interface TableModel extends EntityModel {
  primaryKey: number;
}

// tslint:disable-next-line:no-empty-interface
export interface CollectionModel extends EntityModel {

}

// tslint:disable-next-line:no-empty-interface
export interface GraphModel extends EntityModel {

}

// tslint:disable-next-line:no-empty-interface
export interface FieldModel extends IdEntity {
  entityId: number;
}

export interface ColumnModel extends FieldModel {
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
  allocColumns: AllocationColumnModel[];
  adapters: AdapterModel[];
  adapterTemplates: AdapterTemplateModel[];
}


export interface KeyModel extends IdEntity {
  entityId: number;
  namespaceId: number;
  columnIds: number[];
  isPrimary: boolean;
}

export interface ConstraintModel extends IdEntity {
  keyId: number;
  type: string;
}

export interface AllocationEntityModel extends IdEntity {
  logicalEntityId: number;
  placementId: number;
  partitionId: number;
}

export interface AllocationPlacementModel extends IdEntity {
  logicalEntityId: number;
  adapterId: number;
  partitionType: PartitionType;
}

export interface AllocationPartitionModel extends IdEntity {
  logicalEntityId: number;
}

export interface AllocationColumnModel extends IdEntity {
  namespaceId: number;
  placementId: number;
  logicalTableId: number;
  placementType: PlacementType;
  position: number;
  adapterId: number;
}

export interface AdapterTemplateModel {
  adapterName: string;
  adapterType: AdapterType;
  settings: AdapterSettingModel[];
  description: string;
  modes: DeployMode[];
  persistent: boolean;
}

export enum DeployMode {
  EMBEDDED = 'EMBEDDED',
  DOCKER = 'DOCKER',
  REMOTE = 'REMOTE',
  ALL = 'ALL'
}

export interface AdapterSettingModel {
  subOf: string;
  name: string;
  nameAlias: string;
  alias: any;
  description: string;
  defaultValue: string;
  canBeNull: boolean;
  required: boolean;
  modifiable: boolean;
  options: string[];
  fileNames: string[];
  dynamic: boolean;
  position: number;
}

export class AdapterSettingValueModel {
  name: string;
  value: string;

  constructor(name: string, value: string) {
    this.name = name;
    this.value = value;
  }
}

export enum EntityType {
  ENTITY = 'ENTITY',
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
export class NamespaceRequest {

  dataModels: DataModel[] = null;

  constructor(dataModels: DataModel[] = null) {
    this.dataModels = dataModels;
  }
}


