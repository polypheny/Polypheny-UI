import {Component, computed, Input, Signal} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {CrudService} from '../../../services/crud.service';
import {ToasterService} from '../../../components/toast-exposer/toaster.service';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {CatalogService} from '../../../services/catalog.service';
import {AllocationPlacementModel, CollectionModel, EntityType, NamespaceModel} from '../../../models/catalog.model';
import {NamespaceType} from '../../../models/ui-request.model';
import {AdapterModel} from '../../adapters/adapter.model';

@Component({
    selector: 'app-edit-entity',
    templateUrl: './edit-entity.component.html',
    styleUrls: ['./edit-entity.component.scss']
})

export class EditEntityComponent {

    constructor(
        private _route: ActivatedRoute,
        private _leftSidebar: LeftSidebarService,
        public _crud: CrudService,
        private _router: Router,
        private _toast: ToasterService,
        public _types: DbmsTypesService,
        public _catalog: CatalogService
    ) {
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
            return this._catalog.getEntityFromName(splits[0], splits[1]);
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
                return this.addableStores();
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
    }

    @Input()
    readonly currentRoute: Signal<string>;

    readonly entity: Signal<CollectionModel>;
    readonly namespace: Signal<NamespaceModel>;
    readonly placements: Signal<AllocationPlacementModel[]>;
    readonly stores: Signal<AdapterModel[]>;
    readonly addableStores: Signal<AdapterModel[]>;

    protected readonly NamespaceType = NamespaceType;

    protected readonly EntityType = EntityType;

    isStatistic() {
        return this._router.url.includes('statistics');
    }
}
