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

export interface AdapterInformation {
  name: string;
  description: string;
  clazz: string;
  adapterSettings: AdapterSetting[];
}

export interface AdapterSetting {
  name: string;
  description: string;
  defaultValue: string;
  canBeNull: boolean;
  required: boolean;
  modifiable: boolean;
  options: string[];
  fileNames: string[];
}

export interface Placements {
  stores: Store[];
  exception: ResultException;
  isPartitioned: boolean;
  partitionNames: string[];
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
