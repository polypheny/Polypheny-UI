import {ArgControl} from './arg-control';
import {StringControl} from './string-arg/string-arg.component';
import {BooleanControl} from './boolean-arg/boolean-arg.component';
import {RexControl} from './rex-arg/rex-arg.component';
import {EntityControl} from './entity-arg/entity-arg.component';
import {ListControl} from './list-arg/list-arg.component';
import {AggArg, BooleanArg, CollationArg, CollDirection, CorrelationArg, defaultNullDirection, EntityArg, EnumArg, FieldArg, IntArg, LaxAggArg, ListArg, PlanArgument, RexArg, StringArg} from '../models/polyalg-plan.model';
import {EnumControl} from './enum-arg/enum-arg.component';
import {Parameter, ParamType} from '../models/polyalg-registry';
import {IntControl} from './int-arg/int-arg.component';
import {FieldControl} from './field-arg/field-arg.component';
import {CorrelationControl} from './correlation-arg/correlation-arg.component';
import {CollationControl} from './collation-arg/collation-arg.component';
import {AggControl} from './agg-arg/agg-arg.component';
import {LaxAggControl} from './lax-agg/lax-agg-arg.component';

export function getControl(param: Parameter, arg: PlanArgument | null,
                           isReadOnly: boolean, updateHeight: (height: number) => void, isForOuter = false): ArgControl {
    if (arg == null) {
        arg = getInitialArg(param, isForOuter);
    }

    if (arg.isEnum) {
        return new EnumControl(param, arg.type, arg.value as EnumArg, isReadOnly);
    }

    switch (arg.type) {
        case 'ANY':
            break;
        case 'INTEGER':
            return new IntControl(param, arg.value as IntArg, isReadOnly);
        case 'STRING':
            return new StringControl(param, arg.value as StringArg, isReadOnly);
        case 'BOOLEAN':
            return new BooleanControl(param, arg.value as BooleanArg, isReadOnly);
        case 'REX':
            return new RexControl(param, arg.value as RexArg, isReadOnly);
        case 'AGGREGATE':
            return new AggControl(param, arg.value as AggArg, isReadOnly);
        case 'LAX_AGGREGATE':
            return new LaxAggControl(param, arg.value as LaxAggArg, isReadOnly);
        case 'ENTITY':
            return new EntityControl(param, arg.value as EntityArg, isReadOnly);
        case 'FIELD':
            return new FieldControl(param, arg.value as FieldArg, isReadOnly);
        case 'LIST':
            return new ListControl(param, arg.value as ListArg, isReadOnly, updateHeight);
        case 'COLLATION':
            return new CollationControl(param, arg.value as CollationArg, isReadOnly);
        case 'CORR_ID':
            return new CorrelationControl(param, arg.value as CorrelationArg, isReadOnly);
    }
    return new StringControl(param, {'arg': JSON.stringify(arg)}, isReadOnly);
}

export function getInitialArg(p: Parameter, isForOuter: boolean): PlanArgument {
    if (p.defaultValue && !p.isMultiValued) {
        return p.defaultValue; // kwParams always have a defaultValue
    }
    const isListArg = p.isMultiValued && isForOuter;

    if (isListArg && p.defaultValue) {
        if ((p.defaultValue?.value as ListArg).args.length === 0) {
            // Handle case of EMPTY_LIST
            return {type: ParamType.LIST, value: {innerType: p.type, args: []}};
        }
        return p.defaultValue;
    }
    return {
        type: isListArg ? ParamType.LIST : p.type,
        value: (function () {
            if (isListArg) {
                return {innerType: p.type, args: [getInitialArg(p, false)]};
            }
            if (p.isEnum) {
                return {arg: ''};
            }
            switch (p.type) {
                case ParamType.ANY:
                    break;
                case ParamType.INTEGER:
                    return {arg: 0};
                case ParamType.STRING:
                    return {arg: ''};
                case ParamType.BOOLEAN:
                    return {arg: false};
                case ParamType.REX:
                    return {rex: ''};
                case ParamType.AGGREGATE:
                    return {function: 'COUNT', distinct: false, approximate: false, argList: [], collList: [], alias: ''};
                case ParamType.LAX_AGGREGATE:
                    return {function: 'COUNT', input: '', alias: ''};
                case ParamType.ENTITY:
                    return {arg: ''};
                case ParamType.FIELD:
                    return {arg: ''};
                case ParamType.COLLATION:
                    return {
                        field: '',
                        direction: CollDirection.ASCENDING,
                        nullDirection: defaultNullDirection(CollDirection.ASCENDING)
                    };
                case ParamType.CORR_ID:
                    return {arg: 0};
            }
            return null;
        })(),
        isEnum: p.isEnum
    };


}
