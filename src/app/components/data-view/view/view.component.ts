import {
    Component,
    computed,
    EventEmitter,
    inject,
    Output,
    Signal,
    signal,
    ViewEncapsulation,
    WritableSignal
} from '@angular/core';
import {Freshness, TimeUnits, ViewType} from '../data-view.model';
import {AdapterModel} from '../../../views/adapters/adapter.model';
import {CatalogService} from '../../../services/catalog.service';
import {ViewInformation} from '../data-view.component';
import {ToastDuration, ToasterService} from '../../toast-exposer/toaster.service';
import {DataModel, QueryRequest} from '../../../models/ui-request.model';
import {Result} from '../models/result-set.model';
import {CrudService} from "../../../services/crud.service";
import {firstValueFrom} from "rxjs";

@Component({
    selector: 'poly-create-view',
    templateUrl: './view.component.html',
    styleUrls: ['./view.component.scss'],
    encapsulation: ViewEncapsulation.None, // new elements in sortable should have margin as well

})
export class ViewComponent {


    constructor() {

        this.$stores = computed(() => {
            const listener = this._catalog.listener();
            return this._catalog.getStores();
        });

        this.$freshnessMerged = computed(() => {
            if (this.$freshness() === Freshness.INTERVAL) {
                return this.$time() + ' ' + this.$unit();
            }
            return '' + this.$updates();
        });

    }

    @Output()
    viewQueryConsumer = new EventEmitter<ViewInformation>();

    private readonly _catalog = inject(CatalogService);
    private readonly _toast = inject(ToasterService);
    private readonly _crud = inject(CrudService);

    public readonly $query: WritableSignal<string> = signal('');
    public readonly $showView: WritableSignal<boolean> = signal(false);
    public readonly $result: WritableSignal<Result<any, any>> = signal(null);
    public readonly $viewName: WritableSignal<string> = signal('');
    public readonly $type: WritableSignal<ViewType> = signal(ViewType.VIEW);
    public readonly $store: WritableSignal<AdapterModel> = signal(null);

    public readonly $updates: WritableSignal<number> = signal(1);

    public readonly $freshness: WritableSignal<Freshness> = signal(Freshness.UPDATE);
    public readonly $unit: WritableSignal<TimeUnits> = signal(TimeUnits.MILLISECONDS);
    public readonly $time: WritableSignal<number> = signal(1000);

    public readonly $stores: Signal<AdapterModel[]>;
    public readonly $freshnessMerged: Signal<string>;

    protected readonly ViewType = ViewType;
    protected readonly Freshness = Freshness;
    protected readonly TimeUnits = TimeUnits;


    protected readonly DataModel = DataModel;


    openCreateView(result: Result<any, any>) {
        this.$result.set(result);
        this.$showView.set(true);
        this.$query.set(result.query);
    }

    createViewCode(doExecute: boolean) {

        if (this.checkIfPossible()) {
            const info = new ViewInformation(this.$type(), this.$viewName());
            info.initialQuery = this.$query();
            let fullQuery = this.getViewQuery();
            info.tableType = 'VIEW';

            if (this.$type() === ViewType.MATERIALIZED) {
                if (this.$result().dataModel === DataModel.DOCUMENT) {
                    this._toast.error('Materialized views are not yet supported for document queries.');
                    return;
                }

                fullQuery = this.getMaterializedViewQuery(info);
                info.tableType = 'MATERIALIZED';
            }

            info.fullQuery = fullQuery;

            this.viewQueryConsumer.emit(info);

            if (doExecute) {
                this.executeQuery(fullQuery)
                    .then(() => {
                        this.$showView.set(false);
                        this._toast.success((this.$type() === ViewType.MATERIALIZED ? 'Materialized View "' : 'View "') + this.$viewName() + '" has been created successfully.', "Successfully Created View");
                    }).catch(reason => {
                        this._toast.error(reason)
                        this.$showView.set(false);
                    }
                )
                return;
            } else {
                this._toast.success('Query for view ' + this.$viewName() + ' has been inserted into editor.', "Query Inserted");
            }
            this.$showView.set(false);
        }
    }

    executeQuery(fullQuery: string) {
        const request = new QueryRequest(fullQuery, false, true, this.$result().dataModel == DataModel.RELATIONAL ? 'sql' : 'mql', 'public');

        return firstValueFrom(this._crud.anyQueryBlocking(request));
    }

    private getViewQuery() {
        if (this.$result().dataModel === DataModel.DOCUMENT) {
            const query = this.getDocumentQuery();

            return `db.createView(\n\t"${this.$viewName()}",\n\t"${query[0]}",\n\t${query[1]}\n)`;
        } else {
            if (this.$query().startsWith('\n')) {
                this.$query.set(this.$query().replace('\n', ''));
            }
            return `CREATE VIEW ${this.$viewName()} AS\n${this.$query()} `;
        }
    }

    private getMaterializedViewQuery(info: ViewInformation) {
        if (this.$query().startsWith('\n')) {
            this.$query.set(this.$query().replace('\n', ''));
        }
        let query = `CREATE MATERIALIZED VIEW ${this.$viewName()} AS\n${this.$query()}\nON STORE ${this.$store().name}\nFRESHNESS ${this.$freshness()}`;

        info.stores = this.$store().name;
        info.freshness = this.$freshnessMerged();

        if (this.$freshness() === Freshness.UPDATE) {
            query += ` ${this.$updates()}`;
            info.interval = this.$updates();

        } else if (this.$freshness() === Freshness.INTERVAL) {
            query += ` ${this.$time()} ${this.$unit()}`;
            info.interval = this.$time();
            info.timeUnit = this.$unit();

        }
        return query;
    }

    checkIfPossible() {
        if (this.$viewName().trim() === '') {
            this._toast.warn('Please provide a name for the new view. The new view was not created.', 'missing view name', ToastDuration.INFINITE);
            return false;
        }

        if (!this.$viewName().match('[a-zA-Z][a-zA-Z0-9-_]*')) {
            this._toast.warn('Please provide a valid name for the new view. The new view was not created.', 'invalid view name', ToastDuration.INFINITE);
            return false;
        }
        const entity = this._catalog.getEntityFromName('public', this.$viewName());
        if (entity) {
            this._toast.warn('A table or view with this name already exists. Please choose another name.', 'invalid table name', ToastDuration.INFINITE);
            return false;
        }
        return true;
    }

    getStore(value: string) {
        return this.$stores().filter(s => s.name === value)[0];
    }

    handleModalChange($event: boolean) {
        if (!$event && !this.$showView()) {
            this.$showView.set(false);
        }
    }

    getEntityName() {
        return this.$query().split('.')[1];
    }


    protected getDocumentQuery(): [source: string, pipeline: string] {
        const temp = this.$query().trim().split('.');
        if (temp[0] === 'db') {
            temp.shift(); // remove db
        }
        let source = temp[0];
        if (temp[0].includes('getCollection(')) {
            source = source
                .replace('getCollection(', '')
                .replace(')', '');
        }
        temp.shift(); // remove collection
        temp[0] = temp[0].replace('aggregate(', '').replace('find(', '');
        temp[temp.length - 1] = temp[temp.length - 1].slice(0, -1); // remove last bracket

        let pipeline;
        if (this.$query().includes('.aggregate(')) {

            pipeline = temp.join('.');
        } else if (this.$query().includes('.find(')) {
            const json = JSON.parse('[' + temp.join('.') + ']');

            pipeline = '[';
            if (json.length > 0) {
                pipeline += `{ "$match": ${JSON.stringify(json[0])} }`;
            }
            if (json.length > 1) {
                pipeline += `, { "$project": ${JSON.stringify(json[1])} }`;
            }
            pipeline += ']';
        } else {
            this._toast.error('This query cannot be used to create a view.');
            return;
        }
        return [source.replace('"', ''), pipeline];
    }

    setStore(name: string) {
        const store = this._catalog.getStores().filter(s => s.name === name)[0];
        this.$store.set(store);
    }
}
