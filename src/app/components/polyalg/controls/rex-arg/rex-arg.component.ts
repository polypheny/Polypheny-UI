import {Component, Input, Type} from '@angular/core';
import {PlanArgument, RexArg} from '../../models/polyalg-plan.model';
import {ArgControl} from '../arg-control';
import {Parameter, ParamTag, ParamType} from '../../models/polyalg-registry';

@Component({
    selector: 'app-rex-arg',
    templateUrl: './rex-arg.component.html',
    styleUrl: './rex-arg.component.scss'
})
export class RexArgComponent {
    @Input() data: RexControl;

}

export class RexControl extends ArgControl {
    readonly showAlias: boolean;

    constructor(param: Parameter, public value: RexArg, isReadOnly: boolean) {
        super(param, isReadOnly);
        if (value.alias === value.rex) {
            value.alias = '';
        }
        this.showAlias = param.tags.includes(ParamTag.ALIAS);
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

    toPolyAlg(): string {
        if (this.showAlias && this.value.alias !== '' && this.value.alias !== this.value.rex) {
            return `${this.value.rex} AS ${this.value.alias}`;
        }
        return this.value.rex;
    }

    copyArg(): PlanArgument {
        return {type: ParamType.REX, value: JSON.parse(JSON.stringify(this.value))};
    }
}
