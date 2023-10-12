import {Component, computed, effect, EventEmitter, Input, OnDestroy, Signal, signal, untracked, WritableSignal} from '@angular/core';
import {DataPresentationType, DocumentResult, FieldDefinition, GraphResult, QueryLanguage, RelationalResult, Result, ResultException, UiColumnDefinition} from './models/result-set.model';
import {EntityConfig} from './data-table/entity-config';
import {CrudService} from '../../services/crud.service';
import {ToastDuration, ToasterService} from '../toast-exposer/toaster.service';
import {ActivatedRoute, Router} from '@angular/router';
import {DbmsTypesService} from '../../services/dbms-types.service';
import {BsModalRef, BsModalService} from 'ngx-bootstrap/modal';
import {NamespaceType, QueryRequest} from '../../models/ui-request.model';
import * as Plyr from 'plyr';
import {Subscription} from 'rxjs';
import {WebuiSettingsService} from '../../services/webui-settings.service';
import {WebSocket} from '../../services/webSocket';

import {Table} from '../../views/schema-editing/edit-tables/edit-tables.component';
import {LeftSidebarService} from '../left-sidebar/left-sidebar.service';
import {CatalogService} from '../../services/catalog.service';
import {EntityModel, EntityType, TableModel} from '../../models/catalog.model';
import {UntypedFormGroup} from '@angular/forms';
import {AdapterModel} from '../../views/adapters/adapter.model';

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

  constructor(
      public _crud: CrudService,
      public _toast: ToasterService,
      public _route: ActivatedRoute,
      public _router: Router,
      public _types: DbmsTypesService,
      public _settings: WebuiSettingsService,
      public _sidebar: LeftSidebarService,
      public _catalog: CatalogService,
      public modalService: BsModalService
  ) {
    this.webSocket = new WebSocket(_settings);

    this.tables = computed(() => {
      const catalog = this._catalog.listener();
      const entities = this._catalog.getEntities(null);
      return entities.filter(e => e.namespaceType === NamespaceType.RELATIONAL)
      .map(n => Table.fromModel(<TableModel>n))
      .sort((a, b) => a.name.localeCompare(b.name));
    });

    effect(() => {
      if (!this.result || !this.result()) {
        return;
      }

      untracked(() => {
        switch (this.result().namespaceType) {
          case NamespaceType.DOCUMENT:
            this.presentationType.set(DataPresentationType.CARD);
            break;
          case NamespaceType.RELATIONAL:
            this.presentationType.set(DataPresentationType.TABLE);
            break;
          case NamespaceType.GRAPH:
            this.presentationType.set(DataPresentationType.GRAPH);
            break;
        }
      });

    });
  }

  readonly result: WritableSignal<CombinedResult> = signal(null);

  @Input()
  set inputResult(result: Result<any, any>) {
    if (!result) {
      return;
    }
    this.result.set(CombinedResult.from(result));
  }



  @Input() entity?: Signal<EntityModel>;
  @Input() config: EntityConfig;
  @Input() loading: WritableSignal<boolean>;

  //combinedResult: WritableSignal<CombinedResult> = signal(null);

  presentationType: WritableSignal<DataPresentationType> = signal(DataPresentationType.TABLE);
  presentationTypes: typeof DataPresentationType = DataPresentationType;

  player: Plyr;
  webSocket: WebSocket;
  subscriptions = new Subscription();
  resultEvent = new EventEmitter<Result<any, any>>();

  query: string;
  exploringShowView = false;

  readonly tables: Signal<Table[]>;
  gotTables = false;
  namespaceType: Signal<NamespaceType> = computed(() => this.result()?.namespaceType);


  viewOptions = 'view';
  freshnessSelected = Freshness.INTERVAL;
  timeUniteSelected = TimeUnits.MINUTES;
  intervalSelected = 10;

  creatingView = false;
  newViewName = '';
  modalRefCreateView: BsModalRef;
  viewName = 'viewname';

  chooseNameForView: UntypedFormGroup;
  stores: AdapterModel[];
  storeOptions: Array<String>;
  storeSelected: string;
  viewType: ViewType;
  showView: WritableSignal<boolean> = signal(false);

  protected readonly NamespaceType = NamespaceType;
  protected readonly Freshness = Freshness;
  protected readonly TimeUnits = TimeUnits;

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.webSocket.close();
  }

  deactivateGraphButton(result: Result<any, any>) {
    return result.namespaceType === NamespaceType.GRAPH || !this.containsGraphObject(result);
  }

  containsGraphObject(result: Result<any, any>) {
    const includes = result.header.map(d => d.dataType.toLowerCase().includes('graphtype') || d.dataType.toLowerCase().includes('node'));
    return includes.includes(true);
  }


  openCreateView() {
    this.getStores();
    this.viewType = null;
    this.viewOptions = 'view';
    //this.getAllTables();
    this.query = this.result().query;
    this.showView.set(true);
  }

  getStores() {
    const stores = this._catalog.getStores();
    this.stores = stores;
    this.storeOptions = this.stores.map(s => s.name);
    this.storeSelected = this.stores[0]['uniqueName'];
  }


  createViewCode(isView: boolean, doExecute: boolean) {
    if (this.checkIfPossible()) {
      const info = new ViewInformation(isView ? 'MATERIALIZED' : 'VIEW', this.newViewName);
      info.initialQuery = this.query;
      let fullQuery;

      if (!isView) {
        if (this.result().namespaceType === NamespaceType.DOCUMENT) {
          this._toast.error('Materialized views are not jet supported for document queries.');
          return;
        }

        fullQuery = this.getMaterializedViewQuery(info);
        info.tableType = 'MATERIALIZED';

      } else {
        fullQuery = this.getViewQuery();
        info.tableType = 'VIEW';

      }

      info.fullQuery = fullQuery;

      if (doExecute) {
        //this.executeView.emit(info);
      } else {
        //this.viewEditorCode.emit(info);
      }

      this.showView.set(false);

    }
  }


  private getViewQuery() {
    if (this.result().namespaceType === NamespaceType.DOCUMENT) {
      let source;
      let pipeline;

      const temp = this.query.trim().split('.');
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

      if (this.query.includes('.aggregate(')) {

        pipeline = temp.join('.');
      } else if (this.query.includes('.find(')) {
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

      return `db.createView(\n\t"${this.newViewName}",\n\t"${source.replace('"', '')}",\n\t${pipeline}\n)`;
    } else {
      if (this.query.startsWith('\n')) {
        this.query = this.query.replace('\n', '');
      }
      return `CREATE VIEW ${this.newViewName} AS\n${this.query} `;
    }
  }

  private getMaterializedViewQuery(info: ViewInformation) {
    if (this.query.startsWith('\n')) {
      this.query = this.query.replace('\n', '');
    }
    let query = `CREATE MATERIALIZED VIEW ${this.newViewName} AS\n${this.query}\nON STORE ${this.storeSelected}\nFRESHNESS ${this.freshnessSelected}`;


    info.stores = this.storeSelected;
    info.freshness = this.freshnessSelected;

    if (this.freshnessSelected === 'UPDATE') {
      query += ` ${this.intervalSelected}`;
      info.interval = this.intervalSelected;

    } else if (this.freshnessSelected === 'INTERVAL') {
      query += ` ${this.intervalSelected} ${this.timeUniteSelected}`;
      info.interval = this.intervalSelected;
      info.timeUnit = this.timeUniteSelected;

    }
    return query;
  }

  checkIfPossible() {
    if (this.newViewName === '') {
      this._toast.warn('Please provide a name for the new view. The new view was not created.', 'missing view name', ToastDuration.INFINITE);
      return false;
    }
    if (!this._crud.nameIsValid(this.newViewName)) {
      this._toast.warn('Please provide a valid name for the new view. The new view was not created.', 'invalid view name', ToastDuration.INFINITE);
      return false;
    }
    if (this._catalog.getEntityFromIdName(this.entity().namespaceId, this.newViewName)) {
      this._toast.warn('A table or view with this name already exists. Please choose another name.', 'invalid table name', ToastDuration.INFINITE);
      return false;
    }
    return true;
  }

  createTableValidation(name: string) {
    const regex = this._crud.getValidationRegex();
    if (name === '') {
      return '';
    } else if (regex.test(name) && name.length <= 100 && !this._catalog.getEntityFromIdName(this.entity().namespaceId, name)) {
      this.creatingView = true;
      return 'is-valid';
    } else {
      this.creatingView = false;
      return 'is-invalid';
    }
  }


  executeCreateView(code: string) {
    this.loading.set(true);
    if (!this._crud.anyQuery(this.webSocket, new QueryRequest(code, false, true, 'sql', null))) {
      this.loading.set(false);
      this.result.set(CombinedResult.fromRelational(new RelationalResult('Could not establish a connection with the server.')));
    }
  }


  isDMLResult() {
    return this.result()
        && this.result().affectedTuples === 1
        && this.result().header[0].dataType === 'BIGINT'
        && this.result().header[0].name === 'ROWCOUNT';
  }

  checkModelAndLanguage() {
    return (this.result().namespaceType === NamespaceType.DOCUMENT && this.result().language === QueryLanguage.MQL) ||
        (this.result().namespaceType === NamespaceType.RELATIONAL && this.result().language === QueryLanguage.SQL);
  }

  showCreateView() {
    return !this.config.hideCreateView
        && this.result().data
        && !(this._router.url.startsWith('/views/data-table/'))
        && !this.isDMLResult()
        && this.result().language !== QueryLanguage.CQL
        && this.checkModelAndLanguage();
  }

  /*documentListener() {
    const self = this;
    $(document).on('click', e => {
      if ($(e.target).parents('.editing').length === 0) {
        //don't close editing row during upload
        if (self.uploadProgress < 0) {
          self.editing = -1;
        }
      }
    });
  }*/

  /*initWebsocket() {
    const sub = this.webSocket.onMessage().subscribe({
      next: (res: Result<any, any>) => {
        console.log('init');
        this.result.set(CombinedResult.from(res));
        //go to the highest page if you are "lost" (if you are on a page that is higher than the highest possible page)
        if (+this._route.snapshot.paramMap.get('page') > this.result().highestPage) {
          this._router.navigate(['/views/data-table/' + this.entity()?.name + '/' + this.result().highestPage]).then(r => null);
        }
        this.setPagination();
        this.editing = -1;
        if (this.result().namespaceType === NamespaceType.RELATIONAL || this.result().namespaceType === NamespaceType.DOCUMENT) {
          this.config.create = true;
          this.config.update = true;
          this.config.delete = true;
        } else {
          this.config.create = false;
          this.config.update = false;
          this.config.delete = false;
        }
        this.resultEvent.emit(this.result());
        // if we had a focus set we render it in the next DOM update
        if (this.focusId != null) {
          setTimeout(_ => {
            const focus = document.getElementById(this.focusId);
            if (focus != null) {
              focus.focus();
            }
            this.focusId = null;
          });
        }

      }, error: err => {
        this._toast.error('Could not load the data.');
        console.log(err);
      }
    });
    this.subscriptions.add(sub);
  }*/


  submitView() {

  }
}

export enum Freshness {
  UPDATE = 'UPDATE',
  INTERVAL = 'INTERVAL',
  MANUAL = 'MANUAL'
}

export enum TimeUnits {
  MILLISECONDS = 'milliseconds',
  SECONDS = 'seconds',
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days'
}

export enum ViewType {
  VIEW = 'VIEW',
  MATERIALIZED = 'MATERIALIZED'
}

export class CombinedResult {
  namespaceType: NamespaceType;
  namespace: string;
  query: string;
  data: string[][];
  header: FieldDefinition[] | UiColumnDefinition[];
  exception: ResultException;
  error: string;
  language: QueryLanguage;
  hasMore: boolean;
  currentPage: number;
  highestPage: number;
  entityName: string;
  entityId: number;
  entites: string[];
  affectedTuples: number;
  type: EntityType;//"table" or "view"

  static fromRelational(relational: RelationalResult): CombinedResult {
    const res = new CombinedResult();
    res.header = relational.header;
    res.data = relational.data;
    res.namespace = relational.namespace;
    res.namespaceType = relational.namespaceType;
    res.currentPage = relational.currentPage;
    res.highestPage = relational.highestPage;
    res.type = relational.type;
    res.error = relational.error;
    res.hasMore = relational.hasMore;
    res.entityId = relational.tableId;
    res.entityName = relational.table;
    res.affectedTuples = relational.affectedTuples;
    res.language = relational.language;

    return res;
  }

  static fromDocument(doc: DocumentResult): CombinedResult {
    const res = new CombinedResult();
    res.header = doc.header;
    res.data = doc.data.map(t => new Array(t));
    res.namespace = doc.namespace;
    res.namespaceType = doc.namespaceType;
    res.currentPage = doc.currentPage;
    res.highestPage = doc.highestPage;
    res.error = doc.error;
    res.hasMore = doc.hasMore;
    res.language = doc.language;
    return res;
  }

  static fromGraph(graph: GraphResult): CombinedResult {
    const res = new CombinedResult();
    res.header = graph.header;
    res.data = graph.data;
    res.namespace = graph.namespace;
    res.namespaceType = graph.namespaceType;
    res.currentPage = graph.currentPage;
    res.highestPage = graph.highestPage;
    res.error = graph.error;
    res.hasMore = graph.hasMore;
    res.language = graph.language;
    return res;
  }

  static from(result: Result<any, any>) {
    if (result instanceof CombinedResult) {
      return result;
    }

    switch (result.namespaceType) {
      case NamespaceType.DOCUMENT:
        return CombinedResult.fromDocument(result);
      case NamespaceType.RELATIONAL:
        return CombinedResult.fromRelational(result as RelationalResult);
      case NamespaceType.GRAPH:
        return CombinedResult.fromGraph(result);
    }
  }
}
