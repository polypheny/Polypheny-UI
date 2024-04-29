import {Component, Input, Type} from '@angular/core';
import {EntityArg} from '../../models/polyalg-plan.model';
import {ArgControl} from '../arg-control';
import {Parameter} from '../../models/polyalg-registry';

@Component({
    selector: 'app-entity-arg',
    templateUrl: './entity-arg.component.html',
    styleUrl: './entity-arg.component.scss'
})
export class EntityArgComponent {
    @Input() data: EntityControl;
}

export class EntityControl extends ArgControl {
    constructor(param: Parameter, public value: EntityArg, isReadOnly: boolean) {
        super(param, isReadOnly);
    }

    getHeight(): number {
        return 40;
    }

    getArgComponent(): Type<any> {
        return EntityArgComponent;
    }
}
