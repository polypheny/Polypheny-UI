import {ResultException} from '../../components/data-view/models/result-set.model';

export interface Store {
  storeId: number;
  uniqueName: string;
  adapterName;
  adapterSettings: AdapterSetting[];
  currentSettings: Map<string, string>;
  dataReadOnly: boolean;
  schemaReadOnly: boolean;
  persistent: boolean;
  columnPlacements: CatalogColumnPlacement[];
  partitionKeys: number[];
  numPartitions: number;
  partitionType: PartitionType;
}

export interface AdapterInformation {
  name: string;
  description: string;
  clazz: string;
  adapterSettings: AdapterSetting[];
}

export interface AdapterSetting {
  name: string;
  defaultValue: string;
  canBeNull: boolean;
  required: boolean;
  modifiable: boolean;
  options: string[];
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
