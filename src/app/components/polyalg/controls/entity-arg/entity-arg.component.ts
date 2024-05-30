import {Component, computed, inject, Input, OnInit, Signal, signal, Type} from '@angular/core';
import {EntityArg, PlanArgument} from '../../models/polyalg-plan.model';
import {ArgControl} from '../arg-control';
import {Parameter, ParamType} from '../../models/polyalg-registry';
import {DataModel} from '../../../../models/ui-request.model';
import {PlanType} from '../../../../models/information-page.model';
import {AdapterModel} from '../../../../views/adapters/adapter.model';
import {CatalogService} from '../../../../services/catalog.service';

@Component({
    selector: 'app-entity-arg',
    templateUrl: './entity-arg.component.html',
    styleUrl: './entity-arg.component.scss'
})
export class EntityArgComponent implements OnInit {
    @Input() data: EntityControl;
    placeholder = 'entity.field';
    adapters: Signal<AdapterModel[]>;

    private readonly _catalog = inject(CatalogService);

    ngOnInit(): void {
        if (this.data.model === DataModel.GRAPH) {
            this.placeholder = 'entity';
        }

        if (this.data.isAllocation) {
            this.adapters = computed(() => {
                this._catalog.listener();
                return [...this._catalog.getStores(), ...this._catalog.getSources()];
            });
            if (!this.data.value.adapterName) {
                this.data.value.adapterName = this.adapters()[0].name;
            }
        }
    }
}

export class EntityControl extends ArgControl {
    readonly isAllocation = this.planType !== 'LOGICAL';
    height = signal((this.name ? 55 : 31) + (this.isAllocation ? 2 * 31 : 0));

    constructor(param: Parameter, public value: EntityArg, model: DataModel, planType: PlanType,
                isSimpleMode: Signal<boolean>, isReadOnly: boolean) {
        super(param, model, planType, isSimpleMode, isReadOnly);
    }

    getArgComponent(): Type<any> {
        return EntityArgComponent;
    }

    toPolyAlg(): string {
        if (this.isAllocation) {
            let polyAlg = `${this.value.fullName}@${this.value.adapterName}`;
            if (this.value.partitionId) {
                polyAlg += '.' + this.value.partitionId;
            }
            return polyAlg;
        }
        return this.value.fullName;
    }

    copyArg(): PlanArgument {
        return {type: ParamType.ENTITY, value: JSON.parse(JSON.stringify(this.value))};
    }
}
