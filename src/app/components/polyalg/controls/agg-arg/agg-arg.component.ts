import {Component, computed, Input, OnInit, Signal, Type} from '@angular/core';
import {ArgControl} from '../arg-control';
import {OperatorModel, Parameter, ParamType, SimpleType} from '../../models/polyalg-registry';
import {AggArg, PlanArgument} from '../../models/polyalg-plan.model';
import {CollationControl} from '../collation-arg/collation-arg.component';
import {PolyAlgService} from '../../polyalg.service';
import {PlanType} from '../../../../models/information-page.model';
import {sanitizeAlias} from '../arg-control-utils';

@Component({
    selector: 'app-agg-arg',
    templateUrl: './agg-arg.component.html',
    styleUrl: './agg-arg.component.scss'
})
export class AggArgComponent implements OnInit {

    constructor(private _registry: PolyAlgService) {
    }

    @Input() data: AggControl; // TODO: support multiple args, colls
    fChoices: string[] = [];
    fChoicesSimple = ['AVG', 'COUNT', 'MAX', 'MIN', 'SUM'].sort();

    protected readonly SimpleType = SimpleType;

    ngOnInit(): void {
        this.fChoices = this._registry.getEnumValues('AggFunctionOperator').slice().sort(); // sort shallow copy
    }
}


export class AggControl extends ArgControl {
    height = computed(() => this.isSimpleMode() ? 101 : 188);
    argsStr = this.value.argList.join(', ');

    constructor(param: Parameter, public value: AggArg, model: OperatorModel, planType: PlanType,
                isSimpleMode: Signal<boolean>, isReadOnly: boolean) {
        super(param, model, planType, isSimpleMode, isReadOnly);
    }

    getArgComponent(): Type<any> {
        return AggArgComponent;
    }

    toPolyAlg(): string {
        this.value.argList = this.argsStr.split(',').map(a => a.trim());
        const argList = this.value.argList.join(', ');
        const distStr = this.value.distinct ? (argList.length > 0 ? 'DISTINCT ' : 'DISTINCT') : '';
        const approx = this.value.approximate ? ' APPROXIMATE' : '';
        const collation = this.value.collList.length > 0 ?
            ` WITHIN GROUP (${this.value.collList.map(coll => CollationControl.collToPolyAlg(coll)).join(', ')})` : '';
        const filter = this.value.filter ? ' FILTER ' + this.value.filter : '';

        let alias = '';
        if (this.value.alias) {
            alias = ' AS ' + sanitizeAlias(this.value.alias);
        }

        return `${this.value.function}(${distStr}${argList})${approx}${collation}${filter}${alias}`;
    }

    copyArg(): PlanArgument {
        return {type: ParamType.AGGREGATE, value: JSON.parse(JSON.stringify(this.value))};
    }
}
