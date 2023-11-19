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
} from "@angular/core";
import {Freshness, TimeUnits, ViewType} from "../data-view.model";
import {AdapterModel} from "../../../views/adapters/adapter.model";
import {CatalogService} from "../../../services/catalog.service";
import {ViewInformation} from "../data-view.component";
import {ToastDuration, ToasterService} from "../../toast-exposer/toaster.service";
import {NamespaceType} from "../../../models/ui-request.model";
import {Result} from "../models/result-set.model";

@Component({
    selector: 'poly-create-view',
    templateUrl: './view.component.html',
    styleUrls: ['./view.component.scss'],
    encapsulation: ViewEncapsulation.None, // new elements in sortable should have margin as well

})
export class ViewComponent {

    @Output()
    viewQueryConsumer = new EventEmitter<ViewInformation>();

    private readonly _catalog = inject(CatalogService);
    private readonly _toast = inject(ToasterService);

    public readonly $query: WritableSignal<string> = signal('');
    public readonly $showView: WritableSignal<boolean> = signal(false);
    public readonly $result: WritableSignal<Result<any, any>> = signal(null)
    public readonly $viewName: WritableSignal<string> = signal('');
    public readonly $type: WritableSignal<ViewType> = signal(ViewType.VIEW);
    public readonly $store: WritableSignal<AdapterModel> = signal(null);

    public readonly $updates: WritableSignal<number> = signal(1);

    public readonly $freshness: WritableSignal<Freshness> = signal(Freshness.UPDATE);
    public readonly $unit: WritableSignal<TimeUnits> = signal(TimeUnits.MILLISECONDS);
    public readonly $time: WritableSignal<number> = signal(1000);

    public readonly $stores: Signal<AdapterModel[]>;
    public readonly $freshnessMerged: Signal<string>;


    constructor() {
        this.$stores = computed(() => {
            const listener = this._catalog.listener();
            return this._catalog.getStores();
        })

        this.$freshnessMerged = computed(() => {
            if (this.$freshness() === Freshness.INTERVAL) {
                return this.$time() + ' ' + this.$unit();
            }
            return '' + this.$updates();
        })
    }


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
                if (this.$result().namespaceType === NamespaceType.DOCUMENT) {
                    this._toast.error('Materialized views are not yet supported for document queries.');
                    return;
                }

                fullQuery = this.getMaterializedViewQuery(info);
                info.tableType = 'MATERIALIZED';
            }

            info.fullQuery = fullQuery;
            console.log(fullQuery);

            this.viewQueryConsumer.emit(info);

            this.$showView.set(false);
        }
    }

    private getViewQuery() {
        if (this.$result().namespaceType === NamespaceType.DOCUMENT) {
            let source;
            let pipeline;

            const temp = this.$query().trim().split('.');
            if (temp[0] === 'db') {
                temp.shift(); // remove db
            }
            source = temp[0];
            if (temp[0].includes('getCollection(')) {
                source = source
                    .replace('getCollection(', '')
                    .replace(')', '');
            }
            temp.shift(); // remove collection
            temp[0] = temp[0].replace('aggregate(', '').replace('find(', '');
            temp[temp.length - 1] = temp[temp.length - 1].slice(0, -1); // remove last bracket

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

            return `db.createView(\n\t"${this.$viewName()}",\n\t"${source.replace('"', '')}",\n\t${pipeline}\n)`;
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
        let query = `CREATE MATERIALIZED VIEW ${this.$viewName()} AS\n${this.$query()}\nON STORE ${this.$stores}\nFRESHNESS ${this.$freshness()}`;


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

    }

    protected readonly ViewType = ViewType;
    protected readonly Freshness = Freshness;
    protected readonly TimeUnits = TimeUnits;


}