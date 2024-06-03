import {Component, computed, Input, Signal, signal, Type} from '@angular/core';
import {PlanArgument, StringArg} from '../../models/polyalg-plan.model';
import {ArgControl} from '../arg-control';
import {OperatorModel, Parameter, ParamTag, ParamType} from '../../models/polyalg-registry';
import {PlanType} from '../../../../models/information-page.model';

@Component({
    selector: 'app-string-arg',
    templateUrl: './string-arg.component.html',
    styleUrl: './string-arg.component.scss'
})
export class StringArgComponent {
    @Input() data: StringControl;

}

export class StringControl extends ArgControl {
    readonly showAlias: boolean;
    height = signal(this.name ? 55 : 31);

    // instead of changing this.value, we use signals (-> this.value might not reflect the current state!)
    arg = signal(this.value.arg);
    alias = signal(this.value.alias === this.value.arg ? '' : this.value.alias);
    isTrivial = computed(() => {
        const hasTrivialAlias = !this.showAlias || !this.alias() || this.alias() === this.arg();
        const hasTrivialArg = !this.arg() || /^[a-zA-Z0-9_$]+$/.test(this.arg()); // TODO: use better way to determine whether arg is trivial
        return hasTrivialAlias && hasTrivialArg;
    });

    constructor(param: Parameter, private value: StringArg, model: OperatorModel, planType: PlanType, isSimpleMode: Signal<boolean>, isReadOnly: boolean) {
        super(param, model, planType, isSimpleMode, isReadOnly);
        this.showAlias = param.tags.includes(ParamTag.ALIAS);
    }

    getArgComponent(): Type<any> {
        return StringArgComponent;
    }

    toPolyAlg(): string {
        if (this.showAlias && this.alias() !== '' && this.alias() !== this.arg()) {
            return `${this.arg()} AS ${this.alias()}`;
        }
        return this.arg();
    }

    copyArg(): PlanArgument {
        this.value.arg = this.arg();
        this.value.alias = this.alias();
        return {type: ParamType.STRING, value: JSON.parse(JSON.stringify(this.value))};
    }

}
