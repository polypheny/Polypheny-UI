import {Component, Input, OnInit, Signal, signal, Type} from '@angular/core';
import {ArgControl} from '../arg-control';
import {OperatorModel, Parameter, ParamType} from '../../models/polyalg-registry';
import {LaxAggArg, PlanArgument} from '../../models/polyalg-plan.model';
import {PolyAlgService} from '../../polyalg.service';
import {PlanType} from '../../../../models/information-page.model';
import {sanitizeAlias} from '../arg-control-utils';

@Component({
    selector: 'app-lax-agg-arg',
    templateUrl: './lax-agg-arg.component.html',
    styleUrl: './lax-agg-arg.component.scss'
})
export class LaxAggArgComponent implements OnInit {
    @Input() data: LaxAggControl;
    fChoices: string[] = [];

    constructor(private _registry: PolyAlgService) {
    }

    ngOnInit(): void {
        this.fChoices = this._registry.getEnumValues('AggFunctionOperator').slice().sort(); // sort shallow copy
    }

}

export class LaxAggControl extends ArgControl {
    height = signal(this.name ? 125 : 101);

    constructor(param: Parameter, public value: LaxAggArg, model: OperatorModel, planType: PlanType, isSimpleMode: Signal<boolean>, isReadOnly: boolean) {
        super(param, model, planType, isSimpleMode, isReadOnly);
    }

    getArgComponent(): Type<any> {
        return LaxAggArgComponent;
    }

    toPolyAlg(): string {
        const functionCall = `${this.value.function}(${this.value.input})`;
        if (this.value.alias && functionCall !== this.value.alias) {
            const cleanedAlias = sanitizeAlias(this.value.alias);
            return `${functionCall} AS ${cleanedAlias}`;
        }
        return functionCall;
    }

    copyArg(): PlanArgument {
        return {type: ParamType.LAX_AGGREGATE, value: JSON.parse(JSON.stringify(this.value))};
    }
}
