import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {DataPresentationType, ResultSet} from './models/result-set.model';
import {TableConfig} from './data-table/table-config';
import {CrudService} from '../../services/crud.service';
import {ToastService} from '../toast/toast.service';
import {ActivatedRoute, Router} from '@angular/router';
import {DbmsTypesService} from '../../services/dbms-types.service';
import {BsModalService} from 'ngx-bootstrap/modal';
import {DeleteRequest, TableRequest} from '../../models/ui-request.model';
import {PaginationElement} from './models/pagination-element.model';
import {SortState} from './models/sort-state.model';
import * as Plyr from 'plyr';
import {Subscription} from 'rxjs';
import {WebuiSettingsService} from '../../services/webui-settings.service';
import {WebSocket} from '../../services/webSocket';
import {HttpEventType} from '@angular/common/http';

@Component({
  selector: 'app-data-view',
  templateUrl: './data-view.component.html',
  styleUrls: ['./data-view.component.scss']
})
export class DataViewComponent implements OnInit, OnDestroy {

  @Input() resultSet: ResultSet;
  @Input() config: TableConfig;
  @Input() tableId?: string;
  @Input() loading?: boolean;

  presentationType: DataPresentationType = DataPresentationType.TABLE;
  //see https://stackoverflow.com/questions/35835984/how-to-use-a-typescript-enum-value-in-an-angular2-ngswitch-statement
  presentationTypes: typeof DataPresentationType = DataPresentationType;

  pagination: PaginationElement[] = [];
  insertValues = new Map<string, any>();
  insertDirty = new Map<string, boolean>();//check if field has been edited (if yes, it is "dirty")
  updateValues = new Map<string, any>();
  sortStates = new Map<string, SortState>();
  filter = new Map<string, string>();
  /** -1 if not uploading, 0 or 100: striped, else: showing progress */
  uploadProgress = -1;
  downloadProgress = -1;
  downloadingIthRow = -1;
  confirm = -1;
  editing = -1;//-1 if not editing any row, else the index of that row
  player: Plyr;
  webSocket: WebSocket;
  subscriptions = new Subscription();

  constructor(
    public _crud: CrudService,
    public _toast: ToastService,
    public _route: ActivatedRoute,
    public _router: Router,
    public _types: DbmsTypesService,
    public _settings: WebuiSettingsService,
    public modalService: BsModalService
  ) {
    this.webSocket = new WebSocket(_settings);
    this.initWebsocket();
  }

  ngOnInit(): void {
    //ngOnInit is overwritten by subclasses
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.webSocket.close();
  }

  initWebsocket () {
    const sub = this.webSocket.onMessage().subscribe(
      res => {
        //this.resultSet = <ResultSet> res;
        const result = <ResultSet>res;
        this.resultSet.data = result.data;
        this.resultSet.highestPage = result.highestPage;
        this.resultSet.error = result.error;
        //go to highest page if you are "lost" (if you are on a page that is higher than the highest possible page)
        if (+this._route.snapshot.paramMap.get('page') > this.resultSet.highestPage) {
          this._router.navigate(['/views/data-table/' + this.tableId + '/' + this.resultSet.highestPage]);
        }
        this.setPagination();
        this.editing = -1;
        if (this.resultSet.type === 'TABLE') {
          this.config.create = true;
          this.config.update = true;
          this.config.delete = true;
        } else {
          this.config.create = false;
          this.config.update = false;
          this.config.delete = false;
        }
      }, err => {
        this._toast.error('Could not load the data.');
        console.log(err);
      }
    );
    this.subscriptions.add(sub);
  }

  mapToObject(map: Map<any, any>) {
    const obj = {};
    map.forEach((v, k) => {
      obj[k] = v;
    });
    return obj;
  }

  getTable() {
    const filterObj = this.mapToObject(this.filter);
    const sortState = {};
    this.resultSet.header.forEach((h) => {
      this.sortStates.set(h.name, h.sort);
      sortState[h.name] = h.sort;
    });
    const request = new TableRequest(this.tableId, this.resultSet.currentPage, filterObj, sortState);
    if(!this._crud.getTable( this.webSocket, request )) {
      this.resultSet = new ResultSet('Could not establish a connection with the server.');
    }
  }

  deleteRow(values: string[], i) {
    if (this.confirm !== i) {
      this.confirm = i;
      return;
    }
    const rowMap = new Map<string, string>();
    values.forEach((val, key) => {
      rowMap.set(this.resultSet.header[key].name, val);
    });
    const row = this.mapToObject(rowMap);
    const request = new DeleteRequest(this.resultSet.table, row);
    this._crud.deleteRow(request).subscribe(
      res => {
        const result = <ResultSet>res;
        if ( result.error ) {
          const result2 = <ResultSet>res;
          this._toast.exception(result2, 'Could not delete this row:');
        } else {
          this.getTable();
        }
      }, err => {
        this._toast.error('Could not delete this row.');
        console.log(err);
      }
    );
  }

  setPagination() {
    const activePage = this.resultSet.currentPage;
    const highestPage = this.resultSet.highestPage;
    this.pagination = [];
    if (highestPage < 2) {
      return;
    }
    const neighbors = 1;//from active page, show n neighbors to the left and n neighbors to the right.
    this.pagination.push(new PaginationElement().withPage(this.tableId, Math.max(1, activePage - 1)).withLabel('<'));
    if (activePage === 1) {
      this.pagination.push(new PaginationElement().withPage(this.tableId, 1).setActive());
    } else {
      this.pagination.push(new PaginationElement().withPage(this.tableId, 1));
    }
    if (activePage - neighbors > 2) {
      this.pagination.push(new PaginationElement().withLabel('..').setDisabled());

    }
    let counter = Math.max(2, activePage - neighbors);
    while (counter <= activePage + neighbors && counter <= highestPage) {
      if (counter === activePage) {
        this.pagination.push(new PaginationElement().withPage(this.tableId, counter).setActive());
      } else {
        this.pagination.push(new PaginationElement().withPage(this.tableId, counter));
      }
      counter++;
    }
    counter--;
    if (counter < highestPage) {
      if (counter + neighbors < highestPage) {
        this.pagination.push(new PaginationElement().withLabel('..').setDisabled());
      }
      this.pagination.push(new PaginationElement().withPage(this.tableId, highestPage));
    }
    this.pagination.push(new PaginationElement().withPage(this.tableId, Math.min(highestPage, activePage + 1)).withLabel('>'));

    return this.pagination;
  }

  getFileLink ( data: string ) {
    return this._crud.getFileUrl(data);
  }

  getFile(data: string, index: number){
    this.downloadingIthRow = index;
    this.downloadProgress = 0;
    this._crud.getFile( data ).subscribe(
      res => {
        if( res.type && res.type === HttpEventType.DownloadProgress ){
          this.downloadProgress = Math.round(100 * res.loaded / res.total);
        } else if( res.type === HttpEventType.Response ) {
          //see https://stackoverflow.com/questions/51960172/
          const url= window.URL.createObjectURL(res.body);
          window.open(url);
        }
      }, err => {
        console.log(err);
      }
    ).add(() => {
      this.downloadingIthRow = -1;
      this.downloadProgress = -1;
    });

  }

}
