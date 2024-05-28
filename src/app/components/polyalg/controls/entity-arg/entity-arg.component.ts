import {Component, Input, OnInit, Signal, signal, Type} from '@angular/core';
import {EntityArg, PlanArgument} from '../../models/polyalg-plan.model';
import {ArgControl} from '../arg-control';
import {Parameter, ParamType} from '../../models/polyalg-registry';
import {DataModel} from '../../../../models/ui-request.model';

@Component({
    selector: 'app-entity-arg',
    templateUrl: './entity-arg.component.html',
    styleUrl: './entity-arg.component.scss'
})
export class EntityArgComponent implements OnInit {
    @Input() data: EntityControl;
    placeholder = 'entity.field';

    ngOnInit(): void {
        if (this.data.model === DataModel.GRAPH) {
            this.placeholder = 'entity';
        }
    }
}

export class EntityControl extends ArgControl {
    readonly isAllocation = this.value.placementId != null;
    height = signal((this.name ? 55 : 31) + (this.isAllocation ? 2 * 31 : 0));

    constructor(param: Parameter, public value: EntityArg, model: DataModel, isSimpleMode: Signal<boolean>, isReadOnly: boolean) {
        super(param, model, isSimpleMode, isReadOnly);
    }

    getArgComponent(): Type<any> {
        return EntityArgComponent;
    }

    toPolyAlg(): string {
        if (this.isAllocation) {
            return `${this.value.placementId}.${this.value.partitionId}`;
        }
        return this.value.arg;
    }

    copyArg(): PlanArgument {
        return {type: ParamType.ENTITY, value: JSON.parse(JSON.stringify(this.value))};
    }
}
