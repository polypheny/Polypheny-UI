import {ParamType} from './polyalg-registry';

export interface PlanNode {
    opName: string;
    arguments: {
        [key: string]: PlanArgument
    };
    metadata: PlanMetadata;
    inputs: PlanNode[];
    defaultValue: string;
}

export interface PlanMetadata {
    isAuxiliary: boolean;
    table?: MetadataTableEntry[];
    badges?: MetadataBadge[];
    outConnection?: MetadataConnection;
}

export interface MetadataConnection {
    width: number; // 0 <= width <= 1
    forKey: string;
}

export interface MetadataBadge {
    content: string;
    forKey: string;
    level: BadgeLevel;
}

export enum BadgeLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    DANGER = 'DANGER'
}

export interface MetadataTableEntry {
    displayName: string;
    value: number;
    cumulativeValue?: number;
    calculated: boolean;
}

export interface PlanArgument {
    type: ParamType | string; // if isEnum, then type identifies the type of enum and is not a ParamType
    value: ArgType;
    isEnum?: boolean;
}

export interface EntityArg {
    fullName: string;
    adapterName?: string; // not null in case of an AllocationEntity or PhysicalEntity
    partitionId?: number; // not null in case of an AllocationEntity
    partitionName?: string; // might be null
    physicalId?: number; // not null in case of a PhysicalEntity
}

export interface RexArg {
    rex: string;
    alias?: string;
}

export interface BooleanArg {
    arg: boolean;
}

export interface ListArg {
    innerType: ParamType | string;
    args: PlanArgument[];
}

export interface StringArg {
    arg: string;
    alias?: string;
}

export interface EnumArg {
    arg: string;
}

export interface IntArg {
    arg: number;
}

export interface DoubleArg {
    arg: number;
}

export interface LaxAggArg {
    arg?: string;
    function: string;
    input: string;
    alias: string;
}

export interface AggArg {
    arg?: string;
    function: string;
    distinct: boolean;
    approximate: boolean;
    argList: string[];
    collList: CollationArg[];
    filter?: string;
    alias: string;
}

export interface CollationArg {
    field: string;
    direction: CollDirection;
    nullDirection: CollNullDirection;
}

export interface CorrelationArg {
    arg: number;
}

export interface FieldArg {
    arg: string;
}

export interface WindowGroupArg {
    isRows: boolean;
    lowerBound: string;
    upperBound: string;
    aggCalls: string[];
    orderKeys: CollationArg[];
}

type ArgType = EntityArg | RexArg | ListArg | StringArg | BooleanArg | EnumArg | IntArg | LaxAggArg | AggArg | CollationArg | CorrelationArg | FieldArg | WindowGroupArg;

export enum CollDirection {
    ASCENDING = 'ASC',
    STRICTLY_ASCENDING = 'SASC',
    DESCENDING = 'DESC',
    STRICTLY_DESCENDING = 'SDESC',
    CLUSTERED = 'CLU'
}

export enum CollNullDirection {
    FIRST = 'FIRST',
    LAST = 'LAST',
    UNSPECIFIED = 'UNSPECIFIED'
}

export function defaultNullDirection(d: CollDirection) {
    switch (d) {
        case CollDirection.ASCENDING:
        case CollDirection.STRICTLY_ASCENDING:
            return CollNullDirection.LAST;
        case CollDirection.DESCENDING:
        case CollDirection.STRICTLY_DESCENDING:
            return CollNullDirection.FIRST;
        default:
            return CollNullDirection.UNSPECIFIED;
    }
}
