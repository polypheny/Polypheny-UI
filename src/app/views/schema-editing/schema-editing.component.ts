import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {CrudService} from '../../services/crud.service';
import {ToastService} from '../../components/toast/toast.service';
import {SchemaRequest} from '../../models/ui-request.model';

@Component({
  selector: 'app-schema-editing',
  templateUrl: './schema-editing.component.html',
  styleUrls: ['./schema-editing.component.scss']
})
export class SchemaEditingComponent implements OnInit, OnDestroy {

  routeParam: string;//either the name of a table (schemaName.tableName) or of a schema (schemaName)

  constructor(
    private _route: ActivatedRoute,
    private _leftSidebar: LeftSidebarService,
    private _crud: CrudService,
    private _toast: ToastService
  ) { }

  ngOnInit() {

    this.getRouteParam();
    this.getSchema();

  }

  ngOnDestroy() {
    this._leftSidebar.close();
  }

  getRouteParam () {
    this.routeParam = this._route.snapshot.paramMap.get('id');
    this._route.params.subscribe((params) => {
      this.routeParam = params['id'];
    });
  }

  public getSchema () {
    this._leftSidebar.setSchema( new SchemaRequest('/views/schema-editing/', false) );
  }

  /**
   * checks whether the routeParam is a table (schemaName.tableName) or not (else it is a schemaName)
   */
  paramIsTable () {
    if( this.routeParam === undefined ){
      return false;
    }else{
      return this.routeParam.includes('.');
    }
  }


}
