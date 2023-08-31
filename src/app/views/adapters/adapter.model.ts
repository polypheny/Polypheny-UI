import {AvailableIndexMethod, ResultException} from '../../components/data-view/models/result-set.model';
import {IdEntity} from '../../models/catalog.model';

export interface AdapterModel extends IdEntity {
  adapterName: string;
  settings: Map<string, string>;
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

export interface AdapterInformation {
  name: string;
  description: string;
  adapterName: string;
  type: string;
  adapterSettings: Map<string, string>;
}


export interface Placements {
  stores: StoreModel[];
  exception: ResultException;
  isPartitioned: boolean;
  partitionNames: string[];
  tableType: string;
}


export interface UnderlyingTables {
  exception: ResultException;
  underlyingTable: {};
}

export interface MaterializedInfos {
  exception: ResultException;
  materializedInfo: [];
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
