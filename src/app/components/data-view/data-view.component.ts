import {
  Component,
  computed,
  effect,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  Signal,
  signal,
  untracked,
  ViewChild,
  WritableSignal
} from '@angular/core';
import {DataPresentationType, QueryLanguage, Result} from './models/result-set.model';
import {EntityConfig} from './data-table/entity-config';
import {CrudService} from '../../services/crud.service';
import {ToasterService} from '../toast-exposer/toaster.service';
import {ActivatedRoute, Router} from '@angular/router';
import {DbmsTypesService} from '../../services/dbms-types.service';
import {BsModalService} from 'ngx-bootstrap/modal';
import {NamespaceType} from '../../models/ui-request.model';
import * as Plyr from 'plyr';
import {Subscription} from 'rxjs';
import {WebuiSettingsService} from '../../services/webui-settings.service';
import {WebSocket} from '../../services/webSocket';

import {Table} from '../../views/schema-editing/edit-tables/edit-tables.component';
import {LeftSidebarService} from '../left-sidebar/left-sidebar.service';
import {CatalogService} from '../../services/catalog.service';
import {EntityModel, TableModel} from '../../models/catalog.model';
import {CombinedResult} from "./data-view.model";
import {ViewComponent} from "./view/view.component";

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

    this.$tables = computed(() => {
      const catalog = this._catalog.listener();
      const entities = this._catalog.getEntities(null);
      return entities.filter(e => e.namespaceType === NamespaceType.RELATIONAL)
      .map(n => Table.fromModel(<TableModel>n))
      .sort((a, b) => a.name.localeCompare(b.name));
    });

    effect(() => {
      if (!this.$result || !this.$result()) {
        return;
      }

      untracked(() => {
        switch (this.$result().namespaceType) {
          case NamespaceType.DOCUMENT:
            this.$presentationType.set(DataPresentationType.CARD);
            break;
          case NamespaceType.RELATIONAL:
            this.$presentationType.set(DataPresentationType.TABLE);
            break;
          case NamespaceType.GRAPH:
            this.$presentationType.set(DataPresentationType.GRAPH);
            break;
          default:
            this.$presentationType.set(DataPresentationType.TABLE);
        }
      });

    });
  }

  @ViewChild(ViewComponent, {static: false})
  public readonly view: ViewComponent;
  public readonly $result: WritableSignal<CombinedResult> = signal(null);

  @Input()
  set result(result: Result<any, any>) {
    console.log(result);
    if (!result) {
      return;
    }
    this.$result.set(CombinedResult.from(result));
    console.log(this.$result());
  }


  @Input()
  $entity?: Signal<EntityModel>;

  @Input()
  config: EntityConfig;

  @Output()
  readonly viewQueryConsumer = new EventEmitter<ViewInformation>();

  readonly $loading: WritableSignal<boolean> = signal(false);

  @Input() set loading(loading: boolean) {
    this.$loading.set(loading);
  }

  $modalVisible: WritableSignal<boolean> = signal(false);

  $presentationType: WritableSignal<DataPresentationType> = signal(DataPresentationType.TABLE);
  presentationTypes: typeof DataPresentationType = DataPresentationType;

  player: Plyr;
  webSocket: WebSocket;
  subscriptions = new Subscription();
  resultEvent = new EventEmitter<Result<any, any>>();

  query: string;
  exploringShowView = false;

  readonly $tables: Signal<Table[]>;
  gotTables = false;
  $namespaceType: Signal<NamespaceType> = computed(() => this.$result()?.namespaceType);

  protected readonly NamespaceType = NamespaceType;

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.webSocket.close();
  }






  isDMLResult() {
    return this.$result()
        && this.$result().affectedTuples === 1
        && this.$result().header[0].dataType === 'BIGINT'
        && this.$result().header[0].name === 'ROWCOUNT';
  }

  checkModelAndLanguage() {
    return (this.$result().namespaceType === NamespaceType.DOCUMENT && this.$result().language === QueryLanguage.MQL) ||
        (this.$result().namespaceType === NamespaceType.RELATIONAL && this.$result().language === QueryLanguage.SQL);
  }

  showCreateView() {
    return !this.config.hideCreateView
        && this.$result().data
        && !(this._router.url.startsWith('/views/data-table/'))
        && !this.isDMLResult()
        && this.$result().language !== QueryLanguage.CQL
        && this.checkModelAndLanguage();
  }

  showAny():boolean {
    if (this.$namespaceType() === NamespaceType.RELATIONAL || this.$namespaceType() === NamespaceType.DOCUMENT) {
      return false;
    }
    return true;
  }

  handleModalChange($event: boolean) {
    
  }
}

