import { Component, OnInit } from '@angular/core';
import {BreadcrumbService} from '../../components/breadcrumb/breadcrumb.service';
import {BreadcrumbItem} from '../../components/breadcrumb/breadcrumb-item';

@Component({
  selector: 'app-stores',
  templateUrl: './stores.component.html',
  styleUrls: ['./stores.component.scss']
})
export class StoresComponent implements OnInit {

  constructor( public _breadcrumb: BreadcrumbService ) { }

  ngOnInit() {
    this._breadcrumb.setBreadcrumbs([new BreadcrumbItem('Stores')]);
  }

}
