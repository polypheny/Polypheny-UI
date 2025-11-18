import {Component, Input, Signal, signal, Type} from '@angular/core';
import {ArgControl} from '../arg-control';
import {OperatorModel, Parameter, ParamType} from '../../models/polyalg-registry';
import {CorrelationArg, PlanArgument} from '../../models/polyalg-plan.model';
import {PlanType} from '../../../../models/information-page.model';

@Component({
    selector: 'app-correlation-arg',
    templateUrl: './correlation-arg.component.html',
    styleUrl: './correlation-arg.component.scss',
    standalone: false
})
export class CorrelationArgComponent {
    @Input() data: CorrelationControl;

}

export class CorrelationControl extends ArgControl {
    height = signal(this.name ? 55 : 31);

    constructor(param: Parameter, public value: CorrelationArg, model: OperatorModel, planType: PlanType, isSimpleMode: Signal<boolean>, isReadOnly: boolean) {
        super(param, model, planType, isSimpleMode, isReadOnly);
    }

    getArgComponent(): Type<any> {
        return CorrelationArgComponent;
    }

    toPolyAlg(): string {
        return this.value.arg.toString();
    }

    copyArg(): PlanArgument {
        return {type: ParamType.CORR_ID, value: JSON.parse(JSON.stringify(this.value))};
    }

}
