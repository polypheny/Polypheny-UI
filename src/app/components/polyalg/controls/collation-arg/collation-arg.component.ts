import {Component, Input, signal, Type} from '@angular/core';
import {ArgControl} from '../arg-control';
import {Parameter, ParamType} from '../../models/polyalg-registry';
import {CollationArg, CollDirection, CollNullDirection, defaultNullDirection, PlanArgument} from '../../models/polyalg-plan.model';

@Component({
    selector: 'app-collation-arg',
    templateUrl: './collation-arg.component.html',
    styleUrl: './collation-arg.component.scss'
})
export class CollationArgComponent {
    @Input() data: CollationControl;

    dirChoices = Object.keys(CollDirection);
    nullDirChoices = Object.keys(CollNullDirection);
    protected readonly CollNullDirection = CollNullDirection;
    protected readonly CollDirection = CollDirection;
}

export class CollationControl extends ArgControl {
    height = signal(101);

    constructor(param: Parameter, public value: CollationArg, isReadOnly: boolean) {
        super(param, isReadOnly);
    }

    static collToPolyAlg(value: CollationArg): string {
        let str = value.field;
        const notDefaultNull = value.nullDirection !== defaultNullDirection(value.direction);
        if (value.direction !== CollDirection.ASCENDING || notDefaultNull) {
            str += ` ${value.direction}`;
            if (notDefaultNull) {
                str += ` ${value.nullDirection}`;
            }
        }
        return str;
    }

    getArgComponent(): Type<any> {
        return CollationArgComponent;
    }

    toPolyAlg(): string {
        return CollationControl.collToPolyAlg(this.value);
    }

    copyArg(): PlanArgument {
        return {type: ParamType.COLLATION, value: JSON.parse(JSON.stringify(this.value))};
    }
}
