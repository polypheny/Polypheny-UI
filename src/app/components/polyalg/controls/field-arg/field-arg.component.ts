import {Component, Input, signal, Type} from '@angular/core';
import {ArgControl} from '../arg-control';
import {Parameter, ParamType} from '../../models/polyalg-registry';
import {FieldArg, PlanArgument} from '../../models/polyalg-plan.model';
import {DataModel} from '../../../../models/ui-request.model';

@Component({
    selector: 'app-field-arg',
    templateUrl: './field-arg.component.html',
    styleUrl: './field-arg.component.scss'
})
export class FieldArgComponent {
    @Input() data: FieldControl;

}

export class FieldControl extends ArgControl {
    height = signal(this.name ? 55 : 31);

    constructor(param: Parameter, public value: FieldArg, model: DataModel, isReadOnly: boolean) {
        super(param, model, isReadOnly);
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
