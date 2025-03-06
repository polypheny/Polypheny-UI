import {DataModel} from '../../../models/ui-request.model';
import {SettingsModel} from './workflows.model';
import JsonPointer from 'json-pointer';
import * as _ from 'lodash';

export const DEFAULT_GROUP = '';
export const ADVANCED_GROUP = 'advanced';
export const DEFAULT_SUBGROUP = '';

export class ActivityRegistry {
    private readonly registry: Map<string, ActivityDef>;
    public readonly categories: string[] = [];

    constructor(data: Record<string, ActivityDefModel>) {
        this.registry = new Map(Object.entries(data).map(
            ([key, model]) => [key, new ActivityDef(model)]
        ));
        const categories = new Set<string>();
        this.registry.forEach((def,) => {
            def.categories.forEach(c => categories.add(c));
        });
        this.categories.push(...categories);
        this.categories.sort((a, b) => a.localeCompare(b));
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
    iconPath: string; // unused
    fusable: boolean;
    pipeable: boolean;
    variableWriter: boolean;
    groups: GroupDef[];
    nonEmptyGroupCount: number;
    private readonly settingDefMap = new Map<string, any>();

    constructor(model: ActivityDefModel) {
        this.type = model.type;
        this.displayName = model.displayName;
        this.shortDescription = model.shortDescription;
        this.longDescription = model.longDescription;
        this.categories = model.categories;
        this.inPorts = model.inPorts;
        this.outPorts = model.outPorts;
        this.iconPath = model.iconPath;
        this.fusable = model.fusable;
        this.pipeable = model.pipeable;
        this.variableWriter = model.variableWriter;

        const sortedGroups = [...model.groups].sort((a, b) => a.position - b.position);
        this.groups = sortedGroups.map(group => new GroupDef(group, model.settings));
        this.nonEmptyGroupCount = this.groups.filter(group => !group.isEmpty).length;

        this.groups.forEach(g => g.subgroups.forEach(sg => sg.settings.forEach(
            setting => this.settingDefMap.set(setting.key, setting)
        )));
    }

    public getFirstGroup(): GroupDef | undefined {
        return this.groups.find(group => !group.isEmpty);
    }

    getSettingDef<T extends SettingDef>(key: string): T {
        return this.settingDefMap.get(key) as T;
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
    subPointer: string;
    subValues: any[];
    model: SettingDefModel; // used to access values specific to a given SettingDef implementation

    constructor(model: SettingDefModel) {
        this.type = model.type;
        this.key = model.key;
        this.displayName = model.displayName;
        this.shortDescription = model.shortDescription;
        this.longDescription = model.longDescription;
        this.subPointer = model.subPointer;
        this.subValues = model.subValues;
        this.model = model;
    }

    isVisible(settings: SettingsModel) {
        if (this.subPointer.length === 0) {
            return true;
        }
        try {
            const value = JsonPointer.get(settings, this.subPointer);
            return this.subValues.find(subValue => _.isEqual(subValue, value)) !== undefined;
        } catch (e) {
            return false;
        }
    }

    getGroup() {
        return this.model.group;
    }

    getSubgroup() {
        return this.model.subgroup;
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
    fusable: boolean;
    pipeable: boolean;
    variableWriter: boolean;
}

export interface InPortDef {
    type: PortType;
    description: string;
    isOptional: boolean;
    isMulti: boolean;
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
    VARIABLES = 'VARIABLES',
    CLEANING = 'CLEANING',
    CROSS_MODEL = 'CROSS_MODEL',
    ESSENTIALS = 'ESSENTIALS',
    NESTED = 'NESTED',
    DEVELOPMENT = 'DEVELOPMENT',
    EXTERNAL = 'EXTERNAL',
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
    // TODO: update when a new settingType is added
    STRING = 'STRING',
    INT = 'INT',
    ENTITY = 'ENTITY',
    BOOLEAN = 'BOOLEAN',
    DOUBLE = 'DOUBLE',
    QUERY = 'QUERY',
    FIELD_SELECT = 'FIELD_SELECT',
    ENUM = 'ENUM',
    COLLATION = 'COLLATION',
    FIELD_RENAME = 'FIELD_RENAME',
    CAST = 'CAST',
    FILTER = 'FILTER',
    GRAPH_MAP = 'GRAPH_MAP',
    FILE = 'FILE',
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
    subPointer: string;
    subValues: any[];
}
