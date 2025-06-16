import {IndexMethodModel, ResultException} from '../../components/data-view/models/result-set.model';
import {DeployMode, IdEntity} from '../../models/catalog.model';

export class AdapterModel extends IdEntity {
    readonly adapterName: string;
    readonly settings: Map<string, string>;
    readonly persistent: boolean;
    readonly type: AdapterType;
    readonly mode: DeployMode;
    indexMethods: IndexMethodModel[];
    readonly metadata?: string[];
    metadataChanged?: boolean;
    columnAliases?: Map<string, string>;

    constructor(uniqueName: string, adapterName: string, settings: Map<string, string>, persistent: boolean, type: AdapterType, deployMode: DeployMode, metadata?: string[], metadataChanged?: boolean, aliase?: Map<string, string>) {
        super(-1, uniqueName);
        this.adapterName = adapterName;
        this.settings = settings;
        this.persistent = persistent;
        this.type = type;
        this.mode = deployMode;
        this.metadata = metadata;
        this.metadataChanged = metadataChanged;
        this.columnAliases = aliase;
    }
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
    stores: AdapterModel[];
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
    MANUAL = 'MANUAL',
    AUTOMATIC = 'AUTOMATIC'
}


export enum PartitionType {
    NONE,
    RANGE,
    LIST,
    HASH,
    ROUNDROBIN
}


export class PolyMap<K, V> extends Map<K, V> {
    public toJSON() {
        return Object.fromEntries(this.entries());
    }
}
