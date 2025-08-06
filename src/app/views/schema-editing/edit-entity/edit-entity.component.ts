import {Component, computed, inject, Input, Signal} from '@angular/core';
import {Router} from '@angular/router';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {CatalogService} from '../../../services/catalog.service';
import {AllocationEntityModel, AllocationPartitionModel, AllocationPlacementModel, EntityModel, EntityType, NamespaceModel} from '../../../models/catalog.model';
import {DataModel} from '../../../models/ui-request.model';
import {AdapterModel} from '../../adapters/adapter.model';

@Component({
    selector: 'app-edit-entity',
    templateUrl: './edit-entity.component.html',
    styleUrls: ['./edit-entity.component.scss']
})

export class EditEntityComponent {

    @Input()
    readonly currentRoute: Signal<string>;

    readonly entity: Signal<EntityModel>;
    readonly namespace: Signal<NamespaceModel>;
    readonly placements: Signal<AllocationPlacementModel[]>;
    readonly partitions: Signal<AllocationPartitionModel[]>;
    readonly allocations: Signal<AllocationEntityModel[]>;
    readonly stores: Signal<AdapterModel[]>;
    readonly addableStores: Signal<AdapterModel[]>;


    protected readonly NamespaceType = DataModel;

    protected readonly EntityType = EntityType;

    public readonly _router = inject(Router);
    public readonly _types = inject(DbmsTypesService);
    public readonly _catalog = inject(CatalogService);


    constructor() {
        this.namespace = computed(() => {
            const catalog = this._catalog.listener();
            const route = this.currentRoute();
            if (!route) {
                return null;
            }
            const splits = this.currentRoute().split('\.');
            return this._catalog.getNamespaceFromName(splits[0]);
        });

        this.entity = computed(() => {
            const catalog = this._catalog.listener();
            const route = this.currentRoute();
            if (!route) {
                return null;
            }

            const splits = this.currentRoute().split('\.');

            if (this.namespace && this.namespace() && this.namespace().dataModel === DataModel.GRAPH) {
                return this._catalog.getEntityFromName(splits[0], splits[0]);
            }

            return this._catalog.getEntityFromName(splits[0], splits[1]) as EntityModel;
        });

        this.stores = computed(() => {
            const catalog = this._catalog.listener();
            return this._catalog.getStores();
        });

        this.addableStores = computed(() => {
            const catalog = this._catalog.listener();
            const stores = this.stores();
            const placements = this.placements();
            if (!stores || !placements) {
                return [];
            }
            const adapterIds = placements.map(p => p.adapterId);
            return stores.filter(s => !adapterIds.includes(s.id));
        });

        this.placements = computed(() => {
            const catalog = this._catalog.listener();
            const entity = this.entity();
            if (!entity) {
                return;
            }

            return this._catalog.getPlacements(entity.id);
        });

        this.partitions = computed(() => {
            const catalog = this._catalog.listener();
            if (!this.entity || !this.entity()) {
                return [];
            }
            return this._catalog.getPartitions(this.entity().id);
        });

        this.allocations = computed(() => {
            const catalog = this._catalog.listener();
            if (!this.entity || !this.entity()) {
                return [];
            }
            return this._catalog.getAllocations(this.entity().id);
        });
    }
}
