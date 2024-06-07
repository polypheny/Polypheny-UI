import {ArgControl} from './arg-control';
import {StringControl} from './string-arg/string-arg.component';
import {BooleanControl} from './boolean-arg/boolean-arg.component';
import {RexControl} from './rex-arg/rex-arg.component';
import {EntityControl} from './entity-arg/entity-arg.component';
import {ListControl} from './list-arg/list-arg.component';
import {
    AggArg,
    BooleanArg,
    CollationArg,
    CollDirection,
    CorrelationArg,
    defaultNullDirection,
    DoubleArg,
    EntityArg,
    EnumArg,
    FieldArg,
    IntArg,
    LaxAggArg,
    ListArg,
    PlanArgument,
    RexArg,
    StringArg
} from '../models/polyalg-plan.model';
import {EnumControl} from './enum-arg/enum-arg.component';
import {OperatorModel, Parameter, ParamType} from '../models/polyalg-registry';
import {IntControl} from './int-arg/int-arg.component';
import {FieldControl} from './field-arg/field-arg.component';
import {CorrelationControl} from './correlation-arg/correlation-arg.component';
import {CollationControl} from './collation-arg/collation-arg.component';
import {AggControl} from './agg-arg/agg-arg.component';
import {LaxAggControl} from './lax-agg/lax-agg-arg.component';
import {Signal} from '@angular/core';
import {PlanType} from '../../../models/information-page.model';
import {DoubleControl} from './double-arg/double-arg.component';

export function getControl(param: Parameter, arg: PlanArgument | null, isReadOnly: boolean, depth: number,
                           model: OperatorModel, planType: PlanType, isSimpleMode: Signal<boolean>): ArgControl {
    if (arg == null) {
        arg = getInitialArg(param, depth);
    }

    if (arg.isEnum) {
        return new EnumControl(param, arg.type, arg.value as EnumArg, model, planType, isSimpleMode, isReadOnly);
    }

    switch (arg.type) {
        case 'ANY':
            break;
        case 'INTEGER':
            return new IntControl(param, arg.value as IntArg, model, planType, isSimpleMode, isReadOnly);
        case 'DOUBLE':
            return new DoubleControl(param, arg.value as DoubleArg, model, planType, isSimpleMode, isReadOnly);
        case 'STRING':
            return new StringControl(param, arg.value as StringArg, model, planType, isSimpleMode, isReadOnly);
        case 'BOOLEAN':
            return new BooleanControl(param, arg.value as BooleanArg, model, planType, isSimpleMode, isReadOnly);
        case 'REX':
            return new RexControl(param, arg.value as RexArg, model, planType, isSimpleMode, isReadOnly);
        case 'AGGREGATE':
            return new AggControl(param, arg.value as AggArg, model, planType, isSimpleMode, isReadOnly);
        case 'LAX_AGGREGATE':
            return new LaxAggControl(param, arg.value as LaxAggArg, model, planType, isSimpleMode, isReadOnly);
        case 'ENTITY':
            return new EntityControl(param, arg.value as EntityArg, model, planType, isSimpleMode, isReadOnly);
        case 'FIELD':
            return new FieldControl(param, arg.value as FieldArg, model, planType, isSimpleMode, isReadOnly);
        case 'LIST':
            return new ListControl(param, arg.value as ListArg, depth, model, planType, isSimpleMode, isReadOnly);
        case 'COLLATION':
            return new CollationControl(param, arg.value as CollationArg, model, planType, isSimpleMode, isReadOnly);
        case 'CORR_ID':
            return new CorrelationControl(param, arg.value as CorrelationArg, model, planType, isSimpleMode, isReadOnly);
    }
    return new StringControl(param, {'arg': JSON.stringify(arg)}, model, planType, isSimpleMode, isReadOnly);
}


export function getInitialArg(p: Parameter, depth: number): PlanArgument {
    if (p.defaultValue && p.multiValued === 0) {
        return p.defaultValue; // kwParams always have a defaultValue
    }
    const isListArg = depth < p.multiValued; // not yet on the depth of the actual argument

    if (isListArg && depth === 0) {
        // we're at the outermost list
        if (p.defaultValue) {
            if ((p.defaultValue?.value as ListArg).args.length === 0) {
                // Handle case of EMPTY_LIST
                const innerType = p.multiValued > 1 ? ParamType.LIST : p.type;
                return {type: ParamType.LIST, value: {innerType: innerType, args: []}};
            }
            return p.defaultValue;
        }
    }
    return {
        type: isListArg ? ParamType.LIST : p.type,
        value: (function () {
            if (isListArg) {
                const innerType = p.multiValued > depth + 1 ? ParamType.LIST : p.type;
                return {innerType: innerType, args: [getInitialArg(p, depth + 1)]};
            }
            if (p.isEnum) {
                return {arg: ''};
            }
            switch (p.type) {
                case ParamType.ANY:
                    break;
                case ParamType.INTEGER:
                    return {arg: 0};
                case ParamType.DOUBLE:
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

/**
 * Checks whether the string has balanced parantheses and separators (',') only in valid locations.
 * A valid location is if the separator is within parentheses, brackets or is quoted.
 * @param str the string to check
 */
export function hasValidStructure(str: string) {
    const separators = new Set([',']);
    str = str.trim();

    let inSingleQuotes = false;
    let inDoubleQuotes = false;
    const stack: string[] = [];

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '\\') {
            i++;
            continue; // Skip the next character if it's escaped
        }

        if (char === '\'' && !inDoubleQuotes) {
            inSingleQuotes = !inSingleQuotes;
        } else if (char === '"' && !inSingleQuotes) {
            inDoubleQuotes = !inDoubleQuotes;
        } else if (!inSingleQuotes && !inDoubleQuotes) {
            if (char === '(' || char === '[') {
                stack.push(char);
            } else if (char === ')') {
                const lastOpen = stack.pop();
                if (!lastOpen || lastOpen !== '(') {
                    return false;
                }
            } else if (char === ']') {
                const lastOpen = stack.pop();
                if (!lastOpen || lastOpen !== '[') {
                    return false;
                }
            } else if (separators.has(char) && stack.length === 0) {
                return false;
            }
        }
    }
    return stack.length === 0 && !inSingleQuotes && !inDoubleQuotes;
}
