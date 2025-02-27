import {Component, Input, Signal, signal, Type} from '@angular/core';
import {ArgControl} from '../arg-control';
import {OperatorModel, Parameter, ParamTag, ParamType} from '../../models/polyalg-registry';
import {IntArg, PlanArgument} from '../../models/polyalg-plan.model';
import {PlanType} from '../../../../models/information-page.model';

@Component({
    selector: 'app-int-arg',
    templateUrl: './int-arg.component.html',
    styleUrl: './int-arg.component.scss'
})
export class IntArgComponent {
    @Input() data: IntControl;
}

export class IntControl extends ArgControl {
    valueRange: { min: number | null; max: number | null; };
    height = signal(this.name ? 55 : 31);

    constructor(param: Parameter, public value: IntArg, model: OperatorModel, planType: PlanType, isSimpleMode: Signal<boolean>, isReadOnly: boolean) {
        super(param, model, planType, isSimpleMode, isReadOnly);

        this.valueRange = {min: null, max: null};
        if (param.tags.includes(ParamTag.NON_NEGATIVE)) {
            this.valueRange.min = 0;
        }
    }

    getArgComponent(): Type<any> {
        return IntArgComponent;
    }

    toPolyAlg(): string {
        if (this.value.arg == null) {
            return '';
        }
        return this.value.arg.toString();
    }

    copyArg(): PlanArgument {
        return {type: ParamType.INTEGER, value: JSON.parse(JSON.stringify(this.value))};
    }

}
