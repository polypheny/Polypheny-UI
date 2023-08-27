import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {TableConfig} from '../../components/data-view/data-table/table-config';
import {CrudService} from '../../services/crud.service';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {RelationalResult} from '../../components/data-view/models/result-set.model';
import {NamespaceType, TableRequest} from '../../models/ui-request.model';
import {Subscription} from 'rxjs';
import {WebuiSettingsService} from '../../services/webui-settings.service';
import {WebSocket} from '../../services/webSocket';

@Component({
  selector: 'app-table-view',
  templateUrl: './table-view.component.html',
  styleUrls: ['./table-view.component.scss']
})
export class TableViewComponent implements OnInit, OnDestroy {

  @Input()
  tableId = -1;
  currentPage = 1;
  resultSet: RelationalResult;
  tableConfig: TableConfig = {
    create: true,
    search: true,
    sort: true,
    update: true,
    delete: true,
    exploring: false
  };
  loading: boolean;
  private subscriptions = new Subscription();
  webSocket: WebSocket;

  constructor(
      private _route: ActivatedRoute,
      private _router: Router,
      private _crud: CrudService,
      private _sidebar: LeftSidebarService,
      private _settings: WebuiSettingsService
  ) {
    this.webSocket = new WebSocket(_settings);
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
    if (this.resultSet) {
      this.resultSet.currentPage = this.currentPage;
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
      this.tableId = params['id'];
      if (this._route.snapshot.paramMap.get('page')) {
        this.currentPage = +this._route.snapshot.paramMap.get('page');
      } else {
        this.currentPage = 1;
      }
      if (this.resultSet) {
        this.resultSet.currentPage = this.currentPage;
      }
      this.getTable();
    });
  }

  initWebsocket() {
    const sub = this.webSocket.onMessage().subscribe({
      next: res => {
        this.resultSet = <RelationalResult>res;
        //go to highest page if you are "lost" (if you are on a page that is higher than the highest possible page)
        if (+this._route.snapshot.paramMap.get('page') > this.resultSet.highestPage) {
          this._router.navigate(['/views/data-table/' + this.tableId + '/' + this.resultSet.highestPage]);
        }
        if (this.resultSet.type === 'TABLE' || this.resultSet.namespaceType === NamespaceType.DOCUMENT) {
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
        this.resultSet = new RelationalResult('Server is not available');
      }
    });
    this.subscriptions.add(sub);
  }

  getTable() {
    if (this.tableId) {
      this.loading = true;
      const req = new TableRequest(this.tableId, this.currentPage);
      if (!this._crud.getTable(this.webSocket, req)) {
        this.resultSet = new RelationalResult('Could not establish a connection with the server.');
        this.loading = false;
      }
    } else {
      this.resultSet = null;
      this._sidebar.reset();
    }

  }

  ngOnDestroy() {
    this._sidebar.close();
    this.subscriptions.unsubscribe();
    this.webSocket.close();
  }
}
