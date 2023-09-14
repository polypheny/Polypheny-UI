import {Component, computed, effect, Injector, OnDestroy, OnInit, signal, Signal, WritableSignal} from '@angular/core';
import {ActivatedRoute, Params, Router} from '@angular/router';
import {TableConfig} from '../../components/data-view/data-table/table-config';
import {CrudService} from '../../services/crud.service';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {RelationalResult, Result} from '../../components/data-view/models/result-set.model';
import {EntityRequest} from '../../models/ui-request.model';
import {Subscription} from 'rxjs';
import {WebuiSettingsService} from '../../services/webui-settings.service';
import {WebSocket} from '../../services/webSocket';
import {EntityModel, EntityType} from '../../models/catalog.model';
import {CatalogService} from '../../services/catalog.service';
import {toSignal} from '@angular/core/rxjs-interop';

@Component({
    selector: 'app-table-view',
    templateUrl: './table-view.component.html',
    styleUrls: ['./table-view.component.scss']
})
export class TableViewComponent implements OnInit, OnDestroy {

    readonly entityId: Signal<number>;
    readonly entity: Signal<EntityModel>;
    currentPage = 1;
    result: Result<any, any>;
    entityConfig: TableConfig = {
        create: true,
        search: true,
        sort: true,
        update: true,
        delete: true,
        exploring: false
    };
    readonly fullName: Signal<string>;
    readonly currentRoute: Signal<Params>;
    readonly loading: WritableSignal<boolean> = signal(false);
    private subscriptions = new Subscription();
    webSocket: WebSocket;

    constructor(
        private _route: ActivatedRoute,
        private _router: Router,
        private _crud: CrudService,
        private _sidebar: LeftSidebarService,
        private _settings: WebuiSettingsService,
        private _catalog: CatalogService,
        private injector: Injector
    ) {
        this.webSocket = new WebSocket(_settings);

        this.currentRoute = toSignal(this._route.params);

        this.fullName = computed(() => <string>this.currentRoute()['id']);
        this.entity = computed(() => {
            const catalog = this._catalog.listener();
            const namespaceEntityName = this.fullName().split('\.');
            return this._catalog.getEntityFromName(namespaceEntityName[0], namespaceEntityName[1]);
        });
        this.entityId = computed(() => this.entity()?.id);

        effect(() => {
            if (!this.entityId()) {
                return;
            }
            this.getEntityData();
        }, {allowSignalWrites: true});
    }

    ngOnInit() {

        this._sidebar.open();
        //listen to results
        this.initWebsocket();

        //this.tableId = this._route.snapshot.paramMap.get('id');
        if (this._route.snapshot.paramMap.get('page')) {
            this.currentPage = +this._route.snapshot.paramMap.get('page');
        } else {
            this.currentPage = 1;
        }
        if (this.result) {
            this.result.currentPage = this.currentPage;
        }

        this._sidebar.setSchema(this._router, '/views/data-table/', true, 2, false);
        const sub = this.webSocket.reconnecting.subscribe(
            b => {
                if (b) {
                    this._sidebar.setSchema(this._router, '/views/data-table/', true, 2, false);
                    this.getEntityData();
                }
            }
        );
        this.subscriptions.add(sub);


        //listen to parameter changes
        this._route.params.subscribe((params) => {
            if (this._route.snapshot.paramMap.get('page')) {
                this.currentPage = +this._route.snapshot.paramMap.get('page');
            } else {
                this.currentPage = 1;
            }
            if (this.result) {
                this.result.currentPage = this.currentPage;
            }

        });
    }

    initWebsocket() {
        const sub = this.webSocket.onMessage().subscribe({
            next: (result: Result<any, any>) => {
                if (!result) {
                    return;
                }
                //go to the highest page if you are "lost" (if you are on a page that is higher than the highest possible page)
                if (+this._route.snapshot.paramMap.get('page') > this.result?.highestPage) {
                    this._router.navigate(['/views/data-table/' + this.entityId + '/' + this.result.highestPage]);
                }
                if (this._catalog.getEntity(this.entityId()).entityType === EntityType.ENTITY) {
                    this.entityConfig.create = true;
                    this.entityConfig.update = true;
                    this.entityConfig.delete = true;
                } else {
                    this.entityConfig.create = false;
                    this.entityConfig.update = false;
                    this.entityConfig.delete = false;
                }
                this.result = result;
                this.loading.set(false);
            }, error: err => {
                console.log(err);
                this.loading.set(false);
                this.result = new RelationalResult('Server is not available');
            }
        });
        this.subscriptions.add(sub);
    }

    getEntityData() {
        if (this.entityId()) {
            this.loading.set(true);
            const req = new EntityRequest(this.entityId(), this._catalog.getEntity(this.entityId()).namespaceId, this.currentPage);
            if (!this._crud.getEntityData(this.webSocket, req)) {
                this.result = new RelationalResult('Could not establish a connection with the server.');
                this.loading.set(false);
            }
        } else {
            this.result = null;
            this._sidebar.reset();
        }
    }

    ngOnDestroy() {
        this._sidebar.close();
        this.subscriptions.unsubscribe();
        this.webSocket.close();
    }
}
