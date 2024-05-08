import {Component, Input, OnInit, signal, Type} from '@angular/core';
import {ArgControl} from '../arg-control';
import {EnumArg, PlanArgument} from '../../models/polyalg-plan.model';
import {PolyAlgService} from '../../polyalg.service';
import {Parameter} from '../../models/polyalg-registry';

@Component({
    selector: 'app-enum-arg',
    templateUrl: './enum-arg.component.html',
    styleUrl: './enum-arg.component.scss'
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

    constructor(param: Parameter, public type: string, public value: EnumArg, isReadOnly: boolean) {
        super(param, isReadOnly);
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
