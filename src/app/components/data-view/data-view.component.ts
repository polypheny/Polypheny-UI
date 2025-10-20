import {Component, computed, effect, EventEmitter, inject, Input, OnDestroy, Output, Signal, signal, untracked, ViewChild, WritableSignal} from '@angular/core';
import {DataPresentationType, QueryLanguage, QueryType, Result} from './models/result-set.model';
import {EntityConfig} from './data-table/entity-config';
import {CrudService} from '../../services/crud.service';
import {ToasterService} from '../toast-exposer/toaster.service';
import {ActivatedRoute, Router} from '@angular/router';
import {DbmsTypesService} from '../../services/dbms-types.service';
import {DataModel} from '../../models/ui-request.model';
import {Subscription} from 'rxjs';
import {WebuiSettingsService} from '../../services/webui-settings.service';

import {Table} from '../../views/schema-editing/edit-tables/edit-tables.component';
import {LeftSidebarService} from '../left-sidebar/left-sidebar.service';
import {CatalogService} from '../../services/catalog.service';
import {EntityModel, TableModel} from '../../models/catalog.model';
import {CombinedResult} from './data-view.model';
import {ViewComponent} from './view/view.component';

export class ViewInformation {
    freshness: string;
    fullQuery: string;
    tableType: string;
    newViewName: string;
    initialQuery: string;
    stores: string;
    interval: number;
    timeUnit: string;


    constructor(tableType: string, newViewName: string) {
        this.tableType = tableType;
        this.newViewName = newViewName;
    }
}


@Component({
    selector: 'app-data-view',
    templateUrl: './data-view.component.html',
    styleUrls: ['./data-view.component.scss']
})
export class DataViewComponent implements OnDestroy {


    constructor() {

        this.$tables = computed(() => {
            const catalog = this._catalog.listener();
            const entities = this._catalog.getEntities(null);
            return entities.filter(e => e.dataModel === DataModel.RELATIONAL)
            .map(n => Table.fromModel(<TableModel>n))
            .sort((a, b) => a.name.localeCompare(b.name));
        });

        effect(() => {
            if (!this.$result || !this.$result()) {
                return;
            }

            untracked(() => {
                if (this.$result().queryType === QueryType.DML || this.$result().queryType === QueryType.DDL) {
                    // we use the same for dmls and ddls independent data models
                    this.$presentationType.set(DataPresentationType.TABLE);
                    return;
                }

                switch (this.$result().dataModel) {
                    case DataModel.DOCUMENT:
                        this.$presentationType.set(DataPresentationType.CARD);
                        break;
                    case DataModel.RELATIONAL:
                        this.$presentationType.set(DataPresentationType.TABLE);
                        break;
                    case DataModel.GRAPH:
                        if (!this.containsNode()) {
                            this.$presentationType.set(DataPresentationType.TABLE);
                        } else {
                            this.$presentationType.set(DataPresentationType.GRAPH);
                        }
                        break;
                    default:
                        this.$presentationType.set(DataPresentationType.TABLE);
                }
            });

        });
    }

    @Input()
    set result(result: Result<any, any>) {
        if (!result) {
            return;
        }
        const res = CombinedResult.from(result);
        this.$result.set(res);
    }

    @Input() set loading(loading: boolean) {
        this.$loading.set(loading);
    }

    public readonly _crud = inject(CrudService);
    public readonly _toast = inject(ToasterService);
    public readonly _route = inject(ActivatedRoute);
    public readonly _router = inject(Router);
    public readonly _types = inject(DbmsTypesService);
    public readonly _settings = inject(WebuiSettingsService);
    public readonly _sidebar = inject(LeftSidebarService);
    public readonly _catalog = inject(CatalogService);

    @ViewChild(ViewComponent, {static: false})
    public readonly view: ViewComponent;
    public readonly $result: WritableSignal<CombinedResult> = signal(null);


    @Input()
    $entity?: Signal<EntityModel>;

    @Input()
    config: EntityConfig;

    @Output()
    readonly viewQueryConsumer = new EventEmitter<ViewInformation>();

    readonly $loading: WritableSignal<boolean> = signal(false);

    $modalVisible: WritableSignal<boolean> = signal(false);

    $presentationType: WritableSignal<DataPresentationType> = signal(DataPresentationType.TABLE);
    presentationTypes: typeof DataPresentationType = DataPresentationType;
    subscriptions = new Subscription();

    query: string;

    readonly $tables: Signal<Table[]>;
    $dataModel: Signal<DataModel> = computed(() => this.$result()?.dataModel);

    protected readonly NamespaceType = DataModel;

    protected readonly QueryLanguage = QueryLanguage;
    protected readonly QueryType = QueryType;

    public containsNode(): boolean {
        return this.$result().header.some(h => h.dataType.toLowerCase().includes('node'));
    }

    ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }


    isQueryType(queryTypes: QueryType[]) {
        return this.$result() && queryTypes.includes(this.$result().queryType);
    }

    checkModelAndLanguage() {
        return (this.$result().dataModel === DataModel.RELATIONAL && this.$result().language === QueryLanguage.SQL);
    }

    showCreateView() {
        return !this.config.hideCreateView
            && this.$result().data
            && !(this._router.url.startsWith('/views/data-table/'))
            && !this.isQueryType([QueryType.DDL, QueryType.DML])
            && this.$result().language !== QueryLanguage.CQL
            && this.$result().language !== QueryLanguage.CYPHER
            && this.checkModelAndLanguage();
    }

    showAny(): boolean {
        return !(this.$dataModel() === DataModel.RELATIONAL || this.$dataModel() === DataModel.DOCUMENT);

    }
}

