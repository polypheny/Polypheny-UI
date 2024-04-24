import {ArgControl} from "./arg-control";
import {StringControl} from "./string-arg/string-arg.component";
import {BooleanControl} from "./boolean-arg/boolean-arg.component";
import {RexControl} from "./rex-arg/rex-arg.component";
import {EntityControl} from "./entity-arg/entity-arg.component";
import {ListControl} from "./list-arg/list-arg.component";
import {BooleanArg, EntityArg, ListArg, PlanArgument, RexArg, StringArg} from "../models/polyalg-plan.model";

export function getControl(name: string, arg: PlanArgument, readonly: boolean): ArgControl {
    switch (arg.type) {
        case "ANY":
            break;
        case "INTEGER":
            break;
        case "STRING":
            return new StringControl(name, arg.value as StringArg, readonly);
        case "BOOLEAN":
            return new BooleanControl(name, arg.value as BooleanArg, readonly);
        case "REX":
            return new RexControl(name, arg.value as RexArg, readonly);
        case "AGGREGATE":
            break;
        case "LAX_AGGREGATE":
            break;
        case "ENTITY":
            return new EntityControl(name, arg.value as EntityArg, readonly);
        case "JOIN_TYPE_ENUM":
            break;
        case "MODIFY_OP_ENUM":
            break;
        case "FIELD":
            break;
        case "LIST":
            return new ListControl(name, arg.value as ListArg, readonly)
        case "COLLATION":
            break;
        case "CORR_ID":
            break;
    }
    return new StringControl(name, {"arg": JSON.stringify(arg)}, readonly)
}