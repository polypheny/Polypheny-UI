import {ResultException} from '../../components/data-table/models/result-set.model';

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
}

export interface CatalogColumnPlacement {
  columnName: string;
  placementType: PlacementType;
  columnId;
}

export enum PlacementType {
  MANUAL='MANUAL', AUTOMATIC='AUTOMATIC'
}
