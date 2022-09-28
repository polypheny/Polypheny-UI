import {AvailableIndexMethod, ResultException} from '../../components/data-view/models/result-set.model';

export interface Adapter {
  adapterId: number;
  uniqueName: string;
  adapterName;
  adapterSettings: AdapterSetting[];
  currentSettings: Map<string, string>;
  columnPlacements: CatalogColumnPlacement[];
  partitionKeys: number[];
  numPartitions: number;
  partitionType: PartitionType;
}

export interface Source extends Adapter{
  dataReadOnly: boolean;
}

export interface Store extends Adapter{
  availableIndexMethods: AvailableIndexMethod[];
  persistent: boolean;
}

export interface GraphStore extends Store{
  isNative: boolean;
}

export interface AdapterInformation {
  name: string;
  description: string;
  clazz: string;
  adapterSettings: Map<string, AdapterSetting[]>;
}

export interface AdapterSetting {
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
  stores: Store[];
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
  underlyingTable: {} ;
}

export interface MaterializedInfos {
  exception: ResultException;
  materializedInfo: [] ;
}


export interface CatalogColumnPlacement {
  columnName: string;
  placementType: PlacementType;
  columnId;
}

export enum PlacementType {
  MANUAL='MANUAL', AUTOMATIC='AUTOMATIC'
}

export enum PartitionType {
  NONE,
  RANGE,
  LIST,
  HASH,
  ROUNDROBIN
}
