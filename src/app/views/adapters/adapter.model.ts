import {AvailableIndexMethod, ResultException} from '../../components/data-view/models/result-set.model';
import {AdapterSettingValueModel, AdapterSettingModel, IdEntity, DeployMode} from '../../models/catalog.model';

export class AdapterModel extends IdEntity {
  readonly adapterName: string;
  readonly settings: AdapterSettingValueModel[];
  readonly persistent: boolean;
  readonly type: AdapterType;
  readonly deployMode: DeployMode;

  constructor(uniqueName: string, adapterName: string, settings: AdapterSettingValueModel[], persistent: boolean, type: AdapterType, deployMode: DeployMode) {
    super(-1, uniqueName);
    this.adapterName = adapterName;
    this.settings = settings;
    this.persistent = persistent;
    this.type = type;
    this.deployMode = deployMode;
  }
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
  adapterSettings: AdapterSettingValueModel[];
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
