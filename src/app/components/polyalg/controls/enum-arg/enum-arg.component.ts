import {Component, Input, OnInit, Type} from '@angular/core';
import {ArgControl} from '../arg-control';
import {EnumArg} from '../../models/polyalg-plan.model';
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
    }

}

export class EnumControl extends ArgControl {
    constructor(param: Parameter, public type: string, public value: EnumArg, isReadOnly: boolean) {
        super(param, isReadOnly);
    }

    getHeight(): number {
        return 55;
    }

    getArgComponent(): Type<any> {
        return EnumArgComponent;
    }

}
