export interface PlanNode {
    opName: string;
    arguments: {
        [key: string]: PlanArgument
    };
    inputs: PlanNode[];
    defaultValue: string;
}

export interface PlanArgument {
    type: ParamType;
    value: ArgType;
}

export interface EntityArg {
    arg: string;
    namespaceId: number;
    entityId: number;
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

export type ArgType = EntityArg | RexArg | ListArg | StringArg | BooleanArg;

export type ParamType =
    | 'ANY'
    | 'INTEGER'
    | 'STRING'
    | 'BOOLEAN'
    | 'REX'
    | 'AGGREGATE'
    | 'LAX_AGGREGATE'
    | 'ENTITY'
    | 'JOIN_TYPE_ENUM'  // TODO: handle enums dynamically based on the PolyAlgRegistry
    | 'SEMI_JOIN_TYPE_ENUM'
    | 'MODIFY_OP_ENUM'
    | 'DISTRIBUTION_TYPE_ENUM'
    | 'FIELD'
    | 'LIST'
    | 'COLLATION'
    | 'CORR_ID';
