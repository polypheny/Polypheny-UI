import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {CrudService} from '../../../services/crud.service';
import {ToastService} from '../../toast/toast.service';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {BsModalService} from 'ngx-bootstrap/modal';
import {DataViewComponent} from '../data-view.component';

@Component({
  selector: 'app-data-card',
  templateUrl: './data-card.component.html',
  styleUrls: ['./data-card.component.scss']
})
export class DataCardComponent extends DataViewComponent implements OnInit {

  constructor(
    public _crud: CrudService,
    public _toast: ToastService,
    public _route: ActivatedRoute,
    public _router: Router,
    public _types: DbmsTypesService,
    public modalService: BsModalService
  ) {
    super( _crud, _toast, _route, _router, _types, modalService );
  }

  ngOnInit(): void { }

  listClass( dataType: string ) {
    switch (dataType) {
      case 'IMAGE':
      case 'SOUND':
      case 'VIDEO':
        return 'multimedia';
    }
  }

}
