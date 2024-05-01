import {Component, Input, OnInit, Type} from '@angular/core';
import {ArgControl} from '../arg-control';
import {Parameter, ParamType} from '../../models/polyalg-registry';
import {AggArg, PlanArgument} from '../../models/polyalg-plan.model';
import {CollationControl} from '../collation-arg/collation-arg.component';
import {PolyAlgService} from '../../polyalg.service';

@Component({
    selector: 'app-agg-arg',
    templateUrl: './agg-arg.component.html',
    styleUrl: './agg-arg.component.scss'
})
export class AggArgComponent implements OnInit {
    @Input() data: AggControl; // TODO: support multiple args, colls
    fChoices: string[] = [];

    constructor(private _registry: PolyAlgService) {
    }

    ngOnInit(): void {
        this.fChoices = this._registry.getEnumValues('AggFunctionOperator').slice().sort(); // sort shallow copy
    }

}


export class AggControl extends ArgControl {

    constructor(param: Parameter, public value: AggArg, isReadOnly: boolean) {
        super(param, isReadOnly);
    }

    getHeight(): number {
        return 188;
    }

    getArgComponent(): Type<any> {
        return AggArgComponent;
    }

    toPolyAlg(): string {
        const argList = this.value.argList.join(', ');
        const distStr = this.value.distinct ? (argList.length > 0 ? 'DISTINCT ' : 'DISTINCT') : '';
        const approx = this.value.approximate ? ' APPROXIMATE' : '';
        const collation = this.value.collList.length > 0 ?
            ` WITHIN GROUP (${this.value.collList.map(coll => CollationControl.collToPolyAlg(coll)).join(', ')})` : '';
        const filter = this.value.filter ? ' FILTER ' + this.value.filter : '';
        const alias = this.value.alias ? ` AS ${this.value.alias}` : '';

        return `${this.value.function}(${distStr}${argList})${approx}${collation}${filter}${alias}`;
    }

    copyArg(): PlanArgument {
        return {type: ParamType.AGGREGATE, value: JSON.parse(JSON.stringify(this.value))};
    }
}
