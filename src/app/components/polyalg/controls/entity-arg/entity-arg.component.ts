import {Component, computed, inject, Input, OnInit, Signal, signal, Type, ViewEncapsulation} from '@angular/core';
import {EntityArg, PlanArgument} from '../../models/polyalg-plan.model';
import {ArgControl} from '../arg-control';
import {OperatorModel, Parameter, ParamType} from '../../models/polyalg-registry';
import {PlanType} from '../../../../models/information-page.model';
import {AdapterModel} from '../../../../views/adapters/adapter.model';
import {CatalogService} from '../../../../services/catalog.service';

@Component({
    selector: 'app-entity-arg',
    templateUrl: './entity-arg.component.html',
    styleUrl: './entity-arg.component.scss',
    encapsulation: ViewEncapsulation.None // for autocomplete styling
    ,
    standalone: false
})
export class EntityArgComponent implements OnInit {
    @Input() data: EntityControl;
    placeholder = 'entity.field';
    adapters: Signal<AdapterModel[]>;
    entityNamesList: Signal<string[]>;

    private readonly _catalog = inject(CatalogService);

    ngOnInit(): void {
        if (this.data.model === OperatorModel.GRAPH) {
            this.placeholder = 'entity';
        }

        this.entityNamesList = computed(() => {
            const catalog = this._catalog.listener();

            const names = [];
            for (const schema of catalog.getSchemaTree('', true, 3)) {
                if (this.data.model === OperatorModel.GRAPH) {
                    names.push(schema.name);
                }
                for (const table of schema.children) {
                    names.push(schema.name + '.' + table.name);
                }
            }
            return names;
        });

        if (this.data.isAllocation || this.data.isPhysical) {
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
    readonly isAllocation = this.planType === 'ALLOCATION';
    readonly isPhysical = this.planType === 'PHYSICAL';
    height = signal((this.name ? 55 : 31) + (this.isAllocation ? 2 * 31 : 0));

    constructor(param: Parameter, public value: EntityArg, model: OperatorModel, planType: PlanType,
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
        } else if (this.isPhysical) {
            return `${this.value.adapterName}.${this.value.physicalId}`;
        }
        return this.value.fullName;
    }

    copyArg(): PlanArgument {
        return {type: ParamType.ENTITY, value: JSON.parse(JSON.stringify(this.value))};
    }
}
