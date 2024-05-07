import {Component, computed, Input, signal, Type} from '@angular/core';
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
    height = signal(this.name ? 55 : 31);

    // instead of changing this.value, we use signals (-> this.value might not reflect the current state!)
    rex = signal(this.value.rex);
    alias = signal(this.value.alias === this.value.rex ? '' : this.value.alias);
    isTrivial = computed(() => {
        const hasTrivialAlias = !this.showAlias || !this.alias() || this.alias() === this.rex();
        const hasTrivialRex = !this.rex() || /^[a-zA-Z0-9_$]+$/.test(this.rex());
        return hasTrivialAlias && hasTrivialRex;
    });

    constructor(param: Parameter, private value: RexArg, isReadOnly: boolean) {
        super(param, isReadOnly);
        this.showAlias = param.tags.includes(ParamTag.ALIAS);
    }

    getArgComponent(): Type<any> {
        return RexArgComponent;
    }

    toPolyAlg(): string {
        if (this.showAlias && this.alias() && this.alias() !== this.rex()) {
            return `${this.rex()} AS ${this.alias()}`;
        }
        return this.rex();
    }

    copyArg(): PlanArgument {
        this.value.rex = this.rex();
        this.value.alias = this.alias();
        return {type: ParamType.REX, value: JSON.parse(JSON.stringify(this.value))};
    }
}
