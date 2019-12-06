import {Component, OnDestroy, OnInit} from '@angular/core';
import {BreadcrumbService} from '../../components/breadcrumb/breadcrumb.service';
import {BreadcrumbItem} from '../../components/breadcrumb/breadcrumb-item';
import {CrudService} from '../../services/crud.service';
import {Store} from '../hub/hub.model';
import {ResultSet} from '../../components/data-table/models/result-set.model';

@Component({
  selector: 'app-stores',
  templateUrl: './stores.component.html',
  styleUrls: ['./stores.component.scss']
})
export class StoresComponent implements OnInit, OnDestroy {

  stores: Store[];

  constructor( public _breadcrumb: BreadcrumbService, private _crud: CrudService) { }

  ngOnInit() {
    this._breadcrumb.setBreadcrumbs([new BreadcrumbItem('Stores')]);
    this.getStores();
  }

  ngOnDestroy() {
    this._breadcrumb.hide();
  }

  getStores(){
    this._crud.getStores().subscribe(
      res => {
        const result = <ResultSet> res;
        const stores = [];
        for( const s of result.data ){
          stores.push( { id: s[0], uniqueName: s[1], adapterName: s[2] } );
        }
        this.stores = stores;
      }, err => {
        console.log(err);
      }
    );
  }

}
