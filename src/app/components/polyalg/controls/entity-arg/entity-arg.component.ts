import {Component, Input, signal, Type} from '@angular/core';
import {EntityArg, PlanArgument} from '../../models/polyalg-plan.model';
import {ArgControl} from '../arg-control';
import {Parameter, ParamType} from '../../models/polyalg-registry';

@Component({
    selector: 'app-entity-arg',
    templateUrl: './entity-arg.component.html',
    styleUrl: './entity-arg.component.scss'
})
export class EntityArgComponent {
    @Input() data: EntityControl;
}

export class EntityControl extends ArgControl {
    height = signal(this.name ? 55 : 31);

    constructor(param: Parameter, public value: EntityArg, isReadOnly: boolean) {
        super(param, isReadOnly);
    }

    getArgComponent(): Type<any> {
        return EntityArgComponent;
    }

    toPolyAlg(): string {
        return this.value.arg;
    }

    copyArg(): PlanArgument {
        return {type: ParamType.ENTITY, value: JSON.parse(JSON.stringify(this.value))};
    }
}
