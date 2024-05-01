import {Component, Input, Type} from '@angular/core';
import {ArgControl} from '../arg-control';
import {Parameter, ParamType} from '../../models/polyalg-registry';
import {CorrelationArg, PlanArgument} from '../../models/polyalg-plan.model';

@Component({
    selector: 'app-correlation-arg',
    templateUrl: './correlation-arg.component.html',
    styleUrl: './correlation-arg.component.scss'
})
export class CorrelationArgComponent {
    @Input() data: CorrelationControl;

}

export class CorrelationControl extends ArgControl {

    constructor(param: Parameter, public value: CorrelationArg, isReadOnly: boolean) {
        super(param, isReadOnly);
    }

    getHeight(): number {
        return this.name ? 55 : 31;
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
