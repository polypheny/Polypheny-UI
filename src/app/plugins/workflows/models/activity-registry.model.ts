const DEFAULT_GROUP = '';
const ADVANCED_GROUP = 'advanced';
const DEFAULT_SUBGROUP = '';
const SUB_SEP = '>'; // this separator is used to specify dependencies on values of other settings.

export class ActivityRegistry {
    private readonly registry: Map<string, ActivityDef>;

    constructor(data: Record<string, ActivityDef>) {
        this.registry = new Map(Object.entries(data));
    }

    public getDef(activityType: string) {
        return this.registry.get(activityType);
    }

    public getTypes() {
        return [...this.registry.keys()].sort();
    }
}

export interface ActivityDef {
    type: string;
    displayName: string;
    description: string;
    categories: ActivityCategory[];
    inPorts: InPortDef[];
    outPorts: OutPortDef[];
    iconPath: string;
    groups: GroupDef[];
    settings: Record<string, SettingDef>;
}

export interface InPortDef {
    type: PortType;
    description: string;
    isOptional: boolean;
}

export interface OutPortDef {
    type: PortType;
    description: string;
}

export enum ActivityCategory {
    EXTRACT = 'EXTRACT',
    TRANSFORM = 'TRANSFORM',
    LOAD = 'LOAD',
    RELATIONAL = 'RELATIONAL',
    DOCUMENT = 'DOCUMENT',
    GRAPH = 'GRAPH',
    VARIABLES = 'VARIABLES'
}

export enum PortType {
    ANY = 'ANY',
    REL = 'REL',
    DOC = 'DOC',
    LPG = 'LPG'
}

export interface GroupDef {
    key: string;
    displayName: string;
    position: number;
    subgroups: SubgroupDef[];
}

export interface SubgroupDef {
    key: string;
    displayName: string;
    position: number;
}

export enum SettingType {
    STRING = 'STRING',
    INT = 'INT',
    ENTITY = 'ENTITY',
    BOOLEAN = 'BOOLEAN',
    DOUBLE = 'DOUBLE'
    // TODO: update when a new settingType is added
}

export interface SettingDef {
    type: SettingType;
    key: string;
    displayName: string;
    description: string;
    group: string;
    subgroup: string;
    position: number;
    subOf: string;
}
