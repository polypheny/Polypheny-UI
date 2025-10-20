import {Component, Input, Signal, signal, Type} from '@angular/core';
import {ArgControl} from '../arg-control';
import {OperatorModel, Parameter, ParamType} from '../../models/polyalg-registry';
import {FieldArg, PlanArgument} from '../../models/polyalg-plan.model';
import {PlanType} from '../../../../models/information-page.model';

@Component({
    selector: 'app-field-arg',
    templateUrl: './field-arg.component.html',
    styleUrl: './field-arg.component.scss',
    standalone: false
})
export class FieldArgComponent {
    @Input() data: FieldControl;

}

export class FieldControl extends ArgControl {
    height = signal(this.name ? 55 : 31);

    constructor(param: Parameter, public value: FieldArg, model: OperatorModel, planType: PlanType, isSimpleMode: Signal<boolean>, isReadOnly: boolean) {
        super(param, model, planType, isSimpleMode, isReadOnly);
    }

    getArgComponent(): Type<any> {
        return FieldArgComponent;
    }

    toPolyAlg(): string {
        return this.value.arg;
    }

    copyArg(): PlanArgument {
        return {type: ParamType.FIELD, value: JSON.parse(JSON.stringify(this.value))};
    }

}
