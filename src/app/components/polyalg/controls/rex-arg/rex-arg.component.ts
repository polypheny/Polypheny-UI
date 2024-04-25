import {Component, Input, Type} from '@angular/core';
import {RexArg} from '../../models/polyalg-plan.model';
import {ArgControl} from '../arg-control';

@Component({
    selector: 'app-rex-arg',
    templateUrl: './rex-arg.component.html',
    styleUrl: './rex-arg.component.scss'
})
export class RexArgComponent {
    @Input() data: RexControl;

}

export class RexControl extends ArgControl {
    constructor(name: string, public value: RexArg, readonly: boolean) {
        super(name, readonly);
    }

    getHeight(): number {
        return 100;
    }

    trivialAlias(): boolean {
        return this.value.alias === this.value.rex;
    }

    getArgComponent(): Type<any> {
        return RexArgComponent;
    }
}
