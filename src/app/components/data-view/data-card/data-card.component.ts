import {Component, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {CrudService} from '../../../services/crud.service';
import {ToastService} from '../../toast/toast.service';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {BsModalService} from 'ngx-bootstrap/modal';
import {DataViewComponent} from '../data-view.component';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {LeftSidebarService} from '../../left-sidebar/left-sidebar.service';

@Component({
  selector: 'app-data-card',
  templateUrl: './data-card.component.html',
  styleUrls: ['./data-card.component.scss']
})
export class DataCardComponent extends DataViewComponent implements OnInit {

  showInsertCard = false;
  jsonValid = false;

  constructor(
    public _crud: CrudService,
    public _toast: ToastService,
    public _route: ActivatedRoute,
    public _router: Router,
    public _types: DbmsTypesService,
    public _settings: WebuiSettingsService,
    public _sidebar: LeftSidebarService,
    public modalService: BsModalService
  ) {
    super( _crud, _toast, _route, _router, _types, _settings, _sidebar, modalService );
  }

  ngOnInit(): void {
    if (this.config && this.config.create) {
      this.buildInsertObject();
    }
    this.setPagination();
  }

  setJsonValid($event: any) {
    this.jsonValid = $event;
  }
}
