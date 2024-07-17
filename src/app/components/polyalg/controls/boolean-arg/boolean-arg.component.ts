import {Component, Input, Signal, signal, Type} from '@angular/core';
import {BooleanArg, PlanArgument} from '../../models/polyalg-plan.model';
import {ArgControl} from '../arg-control';
import {OperatorModel, Parameter, ParamType} from '../../models/polyalg-registry';
import {PlanType} from '../../../../models/information-page.model';

@Component({
    selector: 'app-boolean-arg',
    templateUrl: './boolean-arg.component.html',
    styleUrl: './boolean-arg.component.scss'
})
export class BooleanArgComponent {
    @Input() data: BooleanControl;

}

export class BooleanControl extends ArgControl {
    height = signal(50);

    constructor(param: Parameter, public value: BooleanArg, model: OperatorModel, planType: PlanType,
                isSimpleMode: Signal<boolean>, isReadOnly: boolean) {
        super(param, model, planType, isSimpleMode, isReadOnly);
    }

    getArgComponent(): Type<any> {
        return BooleanArgComponent;
    }

    toPolyAlg(): string {
        return this.value.arg.toString();
    }

    copyArg(): PlanArgument {
        return {type: ParamType.BOOLEAN, value: JSON.parse(JSON.stringify(this.value))};
    }
}
