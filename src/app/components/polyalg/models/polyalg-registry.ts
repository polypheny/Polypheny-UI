import {DataModel} from '../../../models/ui-request.model';
import {PlanArgument} from './polyalg-plan.model';

export interface PolyAlgRegistry {
    declarations: { [key: string]: Declaration };
    enums: { [key: string]: string[] };
}

export interface Declaration {
    name: string;
    aliases: string[];
    model: DataModel;
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
    ADVANCED = 'ADVANCED',
    NON_NEGATIVE = 'NON_NEGATIVE',
    HIDE_TRIVIAL = 'HIDE_TRIVIAL'
}

