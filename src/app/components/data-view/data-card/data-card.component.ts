import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {CrudService} from '../../../services/crud.service';
import {ToastService} from '../../toast/toast.service';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {BsModalService} from 'ngx-bootstrap/modal';
import {DataViewComponent} from '../data-view.component';
import {WebuiSettingsService} from '../../../services/webui-settings.service';

@Component({
  selector: 'app-data-card',
  templateUrl: './data-card.component.html',
  styleUrls: ['./data-card.component.scss']
})
export class DataCardComponent extends DataViewComponent implements OnInit {

  showInsertCard = false;

  constructor(
    public _crud: CrudService,
    public _toast: ToastService,
    public _route: ActivatedRoute,
    public _router: Router,
    public _types: DbmsTypesService,
    public _settings: WebuiSettingsService,
    public modalService: BsModalService
  ) {
    super( _crud, _toast, _route, _router, _types, _settings, modalService );
  }

  ngOnInit(): void {
    if (this.config && this.config.create) {
      this.buildInsertObject();
    }
    this.setPagination();
  }

}
