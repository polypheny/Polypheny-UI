import {Component, Input, OnInit, Signal, signal, Type} from '@angular/core';
import {ArgControl} from '../arg-control';
import {EnumArg, PlanArgument} from '../../models/polyalg-plan.model';
import {PolyAlgService} from '../../polyalg.service';
import {OperatorModel, Parameter} from '../../models/polyalg-registry';
import {PlanType} from '../../../../models/information-page.model';

@Component({
    selector: 'app-enum-arg',
    templateUrl: './enum-arg.component.html',
    styleUrl: './enum-arg.component.scss',
    standalone: false
})
export class EnumArgComponent implements OnInit {
    @Input() data: EnumControl;
    choices: string[] = [];

    constructor(private _registry: PolyAlgService) {
    }

    ngOnInit(): void {
        this.choices = this._registry.getEnumValues(this.data.type);
        if (!this.data.value.arg) {
            this.data.value.arg = this.choices[0];
        }
    }

}

export class EnumControl extends ArgControl {
    height = signal(this.name ? 55 : 31);

    constructor(param: Parameter, public type: string, public value: EnumArg, model: OperatorModel, planType: PlanType,
                isSimpleMode: Signal<boolean>, isReadOnly: boolean) {
        super(param, model, planType, isSimpleMode, isReadOnly);
    }

    getArgComponent(): Type<any> {
        return EnumArgComponent;
    }

    toPolyAlg(): string {
        return this.value.arg;
    }

    copyArg(): PlanArgument {
        return {type: this.type, value: JSON.parse(JSON.stringify(this.value)), isEnum: true};
    }
}
