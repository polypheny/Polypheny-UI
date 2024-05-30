import {Component, computed, Input, Signal, signal, Type} from '@angular/core';
import {PlanArgument, RexArg} from '../../models/polyalg-plan.model';
import {ArgControl} from '../arg-control';
import {Parameter, ParamTag, ParamType, SimpleType} from '../../models/polyalg-registry';
import {DataModel} from '../../../../models/ui-request.model';
import {PlanType} from '../../../../models/information-page.model';

@Component({
    selector: 'app-rex-arg',
    templateUrl: './rex-arg.component.html',
    styleUrl: './rex-arg.component.scss'
})
export class RexArgComponent {
    @Input() data: RexControl;

    protected readonly SimpleType = SimpleType;
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
    simpleValues = {
        'REX_PREDICATE': {
            r1: '',
            r2: '',
            operator: '='
        },
        'REX_UINT': {
            i: null
        }
    };

    constructor(param: Parameter, private value: RexArg, model: DataModel, planType: PlanType, isSimpleMode: Signal<boolean>, isReadOnly: boolean) {
        super(param, model, planType, isSimpleMode, isReadOnly);
        this.showAlias = param.tags.includes(ParamTag.ALIAS);
    }

    getArgComponent(): Type<any> {
        return RexArgComponent;
    }

    toPolyAlg(): string {
        if (this.simpleType() === SimpleType.REX_PREDICATE) {
            const values = this.simpleValues.REX_PREDICATE;
            const polyAlg = `${values.operator}(${values.r1}, ${values.r2})`;
            this.rex.set(polyAlg);
        } else if (this.simpleType() === SimpleType.REX_UINT) {
            this.rex.set(this.simpleValues.REX_UINT.i?.toString(10));
        }

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
