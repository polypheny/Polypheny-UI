import {Component, computed, Input, Signal, signal, Type} from '@angular/core';
import {PlanArgument, RexArg} from '../../models/polyalg-plan.model';
import {ArgControl} from '../arg-control';
import {OperatorModel, Parameter, ParamTag, ParamType, SimpleType} from '../../models/polyalg-registry';
import {PlanType} from '../../../../models/information-page.model';
import {hasValidStructure, sanitizeAlias} from '../arg-control-utils';

@Component({
    selector: 'app-rex-arg',
    templateUrl: './rex-arg.component.html',
    styleUrl: './rex-arg.component.scss'
})
export class RexArgComponent {
    @Input() data: RexControl;

    protected readonly SimpleType = SimpleType;
}

const NODE_PREFIX = 'PolyNode ';
const PATH_PREFIX = 'PolyPath ';

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
            operator: '=',
            is1Valid: true,
            is2Valid: true
        },
        'REX_UINT': {
            i: null
        }
    };
    isRexValid = true;
    isPolyNode = false;
    isPolyPath = false;

    constructor(param: Parameter, private value: RexArg, model: OperatorModel, planType: PlanType, isSimpleMode: Signal<boolean>, isReadOnly: boolean) {
        super(param, model, planType, isSimpleMode, isReadOnly);
        this.showAlias = param.tags.includes(ParamTag.ALIAS);
        this.isPolyNode = this.param.tags.includes(ParamTag.POLY_NODE);
        this.isPolyPath = this.param.tags.includes(ParamTag.POLY_PATH);
        if (this.isPolyNode && this.rex().startsWith(NODE_PREFIX)) {
            this.rex.update(s => s.substring(NODE_PREFIX.length));
        } else if (this.isPolyPath && this.rex().startsWith('PolyPath ')) {
            this.rex.update(s => s.substring('PolyPath '.length));
        }
    }

    getArgComponent(): Type<any> {
        return RexArgComponent;
    }

    toPolyAlg(): string {
        if (this.simpleType() === SimpleType.REX_PREDICATE) {
            const values = this.simpleValues.REX_PREDICATE;
            values.is1Valid = hasValidStructure(values.r1);
            values.is2Valid = hasValidStructure(values.r2);
            const polyAlg = `${values.operator}(${values.r1}, ${values.r2})`;
            this.rex.set(polyAlg);
        } else if (this.simpleType() === SimpleType.REX_UINT) {
            this.rex.set(this.simpleValues.REX_UINT.i?.toString(10) || '');
        } else if (this.isPolyNode) {
            return this.rex().startsWith(NODE_PREFIX) ? this.rex() : NODE_PREFIX + this.rex();
        } else if (this.isPolyPath) {
            return this.rex().startsWith(PATH_PREFIX) ? this.rex() : PATH_PREFIX + this.rex();
        } else {
            this.isRexValid = hasValidStructure(this.rex());
        }

        if (this.showAlias && this.alias() && this.alias() !== this.rex()) {
            return `${this.rex()} AS ${sanitizeAlias(this.alias())}`;
        }
        return this.rex();
    }

    copyArg(): PlanArgument {
        this.value.rex = this.rex();
        this.value.alias = this.alias();
        return {type: ParamType.REX, value: JSON.parse(JSON.stringify(this.value))};
    }
}
