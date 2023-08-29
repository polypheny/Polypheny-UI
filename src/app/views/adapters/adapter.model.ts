import {AvailableIndexMethod, ResultException} from '../../components/data-view/models/result-set.model';
import {IdEntity} from '../../models/catalog.model';

export interface AdapterModel extends IdEntity {
  adapterName: string;
  settings: AdapterSetting[];
  currentSettings: Map<string, string>;
  persistent: boolean;
  type: AdapterType;
}

export interface SourceModel extends AdapterModel {
  readOnly: boolean;
}

export interface StoreModel extends AdapterModel {
  availableIndexMethods: AvailableIndexMethod[];
}

export enum AdapterType {
  STORE = 'STORE',
  SOURCE = 'SOURCE'
}

export interface GraphStore extends StoreModel {
  isNative: boolean;
}

export interface AdapterInformation {
  name: string;
  description: string;
  adapterName: string;
  type: string;
  adapterSettings: Map<string, AdapterSetting[]>;
}

export interface AdapterSetting {
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

export interface Placements {
  stores: StoreModel[];
  exception: ResultException;
  isPartitioned: boolean;
  partitionNames: string[];
  tableType: string;
}

export interface GraphPlacements {
  stores: GraphStore[];
  exception: ResultException;
  isPartitioned: boolean;
  partitionNames: string[];
  entityType: string;
}

export interface UnderlyingTables {
  exception: ResultException;
  underlyingTable: {};
}

export interface MaterializedInfos {
  exception: ResultException;
  materializedInfo: [];
}


export interface CatalogColumnPlacement {
  columnName: string;
  placementType: PlacementType;
  columnId;
}

export enum PlacementType {
  MANUAL = 'MANUAL', AUTOMATIC = 'AUTOMATIC'
}

export enum PartitionType {
  NONE,
  RANGE,
  LIST,
  HASH,
  ROUNDROBIN
}
