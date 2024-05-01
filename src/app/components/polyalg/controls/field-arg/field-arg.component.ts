import {Component, Input, Type} from '@angular/core';
import {ArgControl} from '../arg-control';
import {Parameter, ParamType} from '../../models/polyalg-registry';
import {FieldArg, PlanArgument} from '../../models/polyalg-plan.model';

@Component({
    selector: 'app-field-arg',
    templateUrl: './field-arg.component.html',
    styleUrl: './field-arg.component.scss'
})
export class FieldArgComponent {
    @Input() data: FieldControl;

}

export class FieldControl extends ArgControl {

    constructor(param: Parameter, public value: FieldArg, isReadOnly: boolean) {
        super(param, isReadOnly);
    }

    getHeight(): number {
        return this.name ? 55 : 31;
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
