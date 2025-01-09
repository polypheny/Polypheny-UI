import {DataModel} from '../../../models/ui-request.model';

export const DEFAULT_GROUP = '';
export const ADVANCED_GROUP = 'advanced';
export const DEFAULT_SUBGROUP = '';
export const SUB_SEP = '>'; // this separator is used to specify dependencies on values of other settings.

export class ActivityRegistry {
    private readonly registry: Map<string, ActivityDef>;

    constructor(data: Record<string, ActivityDefModel>) {
        this.registry = new Map(Object.entries(data).map(
            ([key, model]) => [key, new ActivityDef(model)]
        ));
    }

    public getDef(activityType: string) {
        return this.registry.get(activityType);
    }

    public getTypes() {
        return [...this.registry.keys()].sort();
    }
}

export class ActivityDef {
    type: string;
    displayName: string;
    shortDescription: string;
    longDescription: string;
    categories: ActivityCategory[];
    inPorts: InPortDef[];
    outPorts: OutPortDef[];
    iconPath: string;
    groups: GroupDef[];
    nonEmptyGroupCount: number;

    constructor(model: ActivityDefModel) {
        this.type = model.type;
        this.displayName = model.displayName;
        this.shortDescription = model.shortDescription;
        this.longDescription = model.longDescription;
        this.categories = model.categories;
        this.inPorts = model.inPorts;
        this.outPorts = model.outPorts;
        this.iconPath = model.iconPath;

        const sortedGroups = [...model.groups].sort((a, b) => a.position - b.position);
        console.log(model.type + ', sorted groups:', sortedGroups);
        this.groups = sortedGroups.map(group => new GroupDef(group, model.settings));
        this.nonEmptyGroupCount = this.groups.filter(group => !group.isEmpty).length;
    }

    public getFirstGroup(): GroupDef | undefined {
        return this.groups.find(group => !group.isEmpty);
    }

}

export class GroupDef {
    key: string;
    displayName: string;
    subgroups: SubgroupDef[];
    isEmpty: boolean;

    constructor(model: GroupDefModel, settings: Record<string, SettingDefModel>) {
        this.key = model.key;
        this.displayName = model.displayName;

        const sortedSubGroups = [...model.subgroups].sort((a, b) => a.position - b.position);
        const filteredSettings = Object.entries(settings).filter(
            ([, setting]) => setting.group === this.key).map(
            ([, setting]) => setting);
        this.subgroups = [
            new SubgroupDef(null, filteredSettings), // manually add default subgroup
            ...sortedSubGroups.map(sub => new SubgroupDef(sub, filteredSettings))
        ];
        this.isEmpty = this.subgroups.every(sub => sub.isEmpty);
    }

    isDefault() {
        return this.key === DEFAULT_GROUP;
    }

    isAdvanced() {
        return this.key === ADVANCED_GROUP;
    }
}

export class SubgroupDef {
    key: string;
    displayName: string;
    settings: SettingDef[];
    isEmpty: boolean;

    constructor(model: SubgroupDefModel, settings: SettingDefModel[]) {
        this.key = model?.key || DEFAULT_SUBGROUP;
        this.displayName = model?.displayName || null;

        const filteredSettings = settings.filter(setting => setting.subgroup === this.key);
        filteredSettings.sort((a, b) => a.position - b.position);
        this.settings = filteredSettings.map(setting => new SettingDef(setting));
        this.isEmpty = this.settings.length === 0;
    }

    isDefault() {
        return this.key === DEFAULT_SUBGROUP;
    }
}

export class SettingDef {
    type: SettingType;
    key: string;
    displayName: string;
    shortDescription: string;
    longDescription: string;
    subOf: string;

    constructor(model: SettingDefModel) {
        this.type = model.type;
        this.key = model.key;
        this.displayName = model.displayName;
        this.shortDescription = model.shortDescription;
        this.longDescription = model.longDescription;
        this.subOf = model.subOf;
    }
}

export interface ActivityDefModel {
    type: string;
    displayName: string;
    shortDescription: string;
    longDescription: string;
    categories: ActivityCategory[];
    inPorts: InPortDef[];
    outPorts: OutPortDef[];
    iconPath: string;
    groups: GroupDefModel[];
    settings: Record<string, SettingDefModel>;
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

export function portTypeToDataModel(type: PortType): DataModel {
    switch (type) {
        case PortType.ANY:
            return null;
        case PortType.REL:
            return DataModel.RELATIONAL;
        case PortType.DOC:
            return DataModel.DOCUMENT;
        case PortType.LPG:
            return DataModel.GRAPH;
    }
}

export interface GroupDefModel {
    key: string;
    displayName: string;
    position: number;
    subgroups: SubgroupDefModel[];
}

export interface SubgroupDefModel {
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

export interface SettingDefModel {
    type: SettingType;
    key: string;
    displayName: string;
    shortDescription: string;
    longDescription: string;
    group: string;
    subgroup: string;
    position: number;
    subOf: string;
}
