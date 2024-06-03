import {PlanArgument} from './polyalg-plan.model';

export interface PolyAlgRegistry {
    declarations: { [key: string]: Declaration };
    enums: { [key: string]: string[] };
}

export interface Declaration {
    name: string;
    aliases: string[];
    model: OperatorModel;
    numInputs: number;
    tags: OperatorTag[];
    posParams: Parameter[];
    kwParams: Parameter[];
}

export interface Parameter {
    name: string;
    aliases: string[];
    tags: ParamTag[];
    type: ParamType; // if isEnum, then type identifies the type of enum and is not a ParamType
    simpleType: SimpleType | null;
    isEnum: boolean;
    multiValued: number; // how deeply nested arguments can be in lists (0 = not nested at all)
    requiresAlias: boolean;
    defaultValue?: PlanArgument;
    defaultPolyAlg?: string;
    canUnpackValues?: boolean;
}

export enum ParamType {
    ANY = 'ANY',
    INTEGER = 'INTEGER',
    STRING = 'STRING',
    BOOLEAN = 'BOOLEAN',
    REX = 'REX',
    AGGREGATE = 'AGGREGATE',
    LAX_AGGREGATE = 'LAX_AGGREGATE',
    ENTITY = 'ENTITY',
    FIELD = 'FIELD',
    LIST = 'LIST',
    COLLATION = 'COLLATION',
    CORR_ID = 'CORR_ID'
}

export enum OperatorTag {
    LOGICAL = 'LOGICAL',
    PHYSICAL = 'PHYSICAL',
    ALLOCATION = 'ALLOCATION',
    ADVANCED = 'ADVANCED'
}

export enum ParamTag {
    ALIAS = 'ALIAS',
    NON_NEGATIVE = 'NON_NEGATIVE',
    HIDE_TRIVIAL = 'HIDE_TRIVIAL'
}

export enum SimpleType {
    HIDDEN = 'HIDDEN',
    REX_PREDICATE = 'REX_PREDICATE',
    REX_UINT = 'REX_UINT',
    SIMPLE_COLLATION = 'SIMPLE_COLLATION',
    SIMPLE_AGG = 'SIMPLE_AGG'
}

/**
 * Very similar to the DataModel enum, but also has a COMMON model to indicate that all Models are supported
 */
export enum OperatorModel {
    RELATIONAL = 'RELATIONAL',
    DOCUMENT = 'DOCUMENT',
    GRAPH = 'GRAPH',
    COMMON = 'COMMON'
}
