import {ParamType} from './polyalg-registry';

export interface PlanNode {
    opName: string;
    arguments: {
        [key: string]: PlanArgument
    };
    inputs: PlanNode[];
    defaultValue: string;
}

export interface PlanArgument {
    type: ParamType; // if isEnum, then type identifies the type of enum and is not a ParamType
    value: ArgType;
    isEnum?: boolean;
}

export interface EntityArg {
    arg: string;
    namespaceId?: number;
    entityId?: number;
}

export interface RexArg {
    rex: string;
    alias?: string;
}

export interface BooleanArg {
    arg: boolean;
}

export interface ListArg {
    innerType: ParamType;
    args: PlanArgument[];
}

export interface StringArg {
    arg: string;
    alias?: string;
}

export interface EnumArg {
    arg: string;
}

export type ArgType = EntityArg | RexArg | ListArg | StringArg | BooleanArg | EnumArg;
