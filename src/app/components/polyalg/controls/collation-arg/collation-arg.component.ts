import {Component, computed, Input, Signal, Type} from '@angular/core';
import {ArgControl} from '../arg-control';
import {Parameter, ParamType, SimpleType} from '../../models/polyalg-registry';
import {CollationArg, CollDirection, CollNullDirection, defaultNullDirection, PlanArgument} from '../../models/polyalg-plan.model';
import {DataModel} from '../../../../models/ui-request.model';

@Component({
    selector: 'app-collation-arg',
    templateUrl: './collation-arg.component.html',
    styleUrl: './collation-arg.component.scss'
})
export class CollationArgComponent {
    @Input() data: CollationControl;

    dirChoices = Object.keys(CollDirection);
    simpleDirChoices = this.dirChoices.filter(dir => dir.startsWith('ASC') || dir.startsWith('DESC'));
    nullDirChoices = Object.keys(CollNullDirection);
    protected readonly CollNullDirection = CollNullDirection;
    protected readonly CollDirection = CollDirection;
    protected readonly SimpleType = SimpleType;
}

export class CollationControl extends ArgControl {
    height = computed(() => this.isSimpleMode() ? 66 : 101);

    constructor(param: Parameter, public value: CollationArg, model: DataModel, isSimpleMode: Signal<boolean>, isReadOnly: boolean) {
        super(param, model, isSimpleMode, isReadOnly);
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
        if (this.simpleType() === SimpleType.SIMPLE_COLLATION) {
            this.value.nullDirection = defaultNullDirection(this.value.direction);
        }
        return CollationControl.collToPolyAlg(this.value);
    }

    copyArg(): PlanArgument {
        return {type: ParamType.COLLATION, value: JSON.parse(JSON.stringify(this.value))};
    }
}
