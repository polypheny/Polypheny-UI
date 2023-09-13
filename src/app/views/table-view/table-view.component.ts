import {Component, computed, Input, OnDestroy, OnInit, Signal, signal, WritableSignal} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {TableConfig} from '../../components/data-view/data-table/table-config';
import {CrudService} from '../../services/crud.service';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {DocumentResult, GraphResult, RelationalResult, Result} from '../../components/data-view/models/result-set.model';
import {NamespaceType, TableRequest} from '../../models/ui-request.model';
import {Subscription} from 'rxjs';
import {WebuiSettingsService} from '../../services/webui-settings.service';
import {WebSocket} from '../../services/webSocket';
import {EntityType} from '../../models/catalog.model';
import {CatalogService} from '../../services/catalog.service';
import {toSignal} from '@angular/core/rxjs-interop';
import {map} from 'rxjs/operators';

@Component({
  selector: 'app-table-view',
  templateUrl: './table-view.component.html',
  styleUrls: ['./table-view.component.scss']
})
export class TableViewComponent implements OnInit, OnDestroy {

  @Input()
  entityId = -1;
  currentPage = 1;
  result: Result<any, any>;
  tableConfig: TableConfig = {
    create: true,
    search: true,
    sort: true,
    update: true,
    delete: true,
    exploring: false
  };
  fullName: WritableSignal<string> = signal('');
  currentRoute: Signal<string> = signal('');
  loading: boolean;
  private subscriptions = new Subscription();
  webSocket: WebSocket;

  constructor(
      private _route: ActivatedRoute,
      private _router: Router,
      private _crud: CrudService,
      private _sidebar: LeftSidebarService,
      private _settings: WebuiSettingsService,
      private _catalog: CatalogService
  ) {
    this.webSocket = new WebSocket(_settings);

    this.currentRoute = toSignal(this._route.params.pipe(map(p => <string>p['id'])));
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
            this.getTable();
          }
        }
    );
    this.subscriptions.add(sub);


    //listen to parameter changes
    this._route.params.subscribe((params) => {
      this.fullName.set(params['id']);
      console.log(params['id']);
      const namespaceEntityName = this.fullName().split('\\.');
      this.entityId = this._catalog.getEntityFromName(namespaceEntityName[0], namespaceEntityName[1])?.value?.id;

      if (!this.entityId) {
        return;
      }

      if (this._route.snapshot.paramMap.get('page')) {
        this.currentPage = +this._route.snapshot.paramMap.get('page');
      } else {
        this.currentPage = 1;
      }
      if (this.result) {
        this.result.currentPage = this.currentPage;
      }
      this.getTable();


    });
  }

  initWebsocket() {
    const sub = this.webSocket.onMessage().subscribe({
      next: (result: Result<any, any>) => {
        //go to highest page if you are "lost" (if you are on a page that is higher than the highest possible page)
        if (+this._route.snapshot.paramMap.get('page') > this.result.highestPage) {
          this._router.navigate(['/views/data-table/' + this.entityId + '/' + this.result.highestPage]);
        }
        if (this._catalog.getEntity(this.entityId).value.entityType === EntityType.ENTITY) {
          this.tableConfig.create = true;
          this.tableConfig.update = true;
          this.tableConfig.delete = true;
        } else {
          this.tableConfig.create = false;
          this.tableConfig.update = false;
          this.tableConfig.delete = false;
        }
        this.loading = false;
      }, error: err => {
        console.log(err);
        this.loading = false;
        this.result = new RelationalResult('Server is not available');
      }
    });
    this.subscriptions.add(sub);
  }

  getTable() {
    if (this.entityId) {
      this.loading = true;
      const req = new TableRequest(this.entityId, this.currentPage);
      if (!this._crud.getTable(this.webSocket, req)) {
        this.result = new RelationalResult('Could not establish a connection with the server.');
        this.loading = false;
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
