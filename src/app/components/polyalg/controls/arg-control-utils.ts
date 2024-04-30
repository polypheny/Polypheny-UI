import {ArgControl} from './arg-control';
import {StringControl} from './string-arg/string-arg.component';
import {BooleanControl} from './boolean-arg/boolean-arg.component';
import {RexControl} from './rex-arg/rex-arg.component';
import {EntityControl} from './entity-arg/entity-arg.component';
import {ListControl} from './list-arg/list-arg.component';
import {BooleanArg, EntityArg, EnumArg, ListArg, PlanArgument, RexArg, StringArg} from '../models/polyalg-plan.model';
import {EnumControl} from './enum-arg/enum-arg.component';
import {Parameter, ParamType} from '../models/polyalg-registry';

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
            break;
        case 'STRING':
            return new StringControl(param, arg.value as StringArg, isReadOnly);
        case 'BOOLEAN':
            return new BooleanControl(param, arg.value as BooleanArg, isReadOnly);
        case 'REX':
            return new RexControl(param, arg.value as RexArg, isReadOnly);
        case 'AGGREGATE':
            break;
        case 'LAX_AGGREGATE':
            break;
        case 'ENTITY':
            return new EntityControl(param, arg.value as EntityArg, isReadOnly);
        case 'FIELD':
            break;
        case 'LIST':
            return new ListControl(param, arg.value as ListArg, isReadOnly, updateHeight);
        case 'COLLATION':
            break;
        case 'CORR_ID':
            break;
    }
    return new StringControl(param, {'arg': JSON.stringify(arg)}, isReadOnly);
}

export function getInitialArg(p: Parameter, isForOuter: boolean): PlanArgument {
    if (p.defaultValue) {
        return p.defaultValue;
    }
    const isListArg = p.isMultiValued && isForOuter;
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
                    break;
                case ParamType.STRING:
                    return {arg: ''};
                case ParamType.BOOLEAN:
                    return {arg: false};
                case ParamType.REX:
                    return {rex: ''};
                case ParamType.AGGREGATE:
                    break;
                case ParamType.LAX_AGGREGATE:
                    break;
                case ParamType.ENTITY:
                    return {arg: ''};
                case ParamType.FIELD:
                    break;
                case ParamType.COLLATION:
                    break;
                case ParamType.CORR_ID:
                    break;
            }
            return null;
        })(),
        isEnum: p.isEnum
    };


}
