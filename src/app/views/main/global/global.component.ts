import {Component, OnDestroy, OnInit, ViewEncapsulation} from '@angular/core';
import { LogicService } from '../../../services/logic.service';
import {ActivatedRoute, Router} from '@angular/router';
import { RenderObj } from '../models';
import {BreadcrumbService} from '../../../components/breadcrumb/breadcrumb.service';

@Component({
  selector: 'app-global',
  templateUrl: './global.component.html',
  styleUrls: ['./global.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class GlobalComponent implements OnInit, OnDestroy {

  mode;
  routerId;

  data: RenderObj = {
    mansonry: false,
    items: [
      {
        // color: 'blue',
        list: [
          {type: 'header', label: 'DB1', button: [
              {icon: 'icon-layers btn btn-light btn-sm', routerLink: ['/graphical-querying/1']},
              {icon: 'icon-vector btn btn-light btn-sm', routerLink: ['/uml/1']}
              ]},
          {type: 'collapsible', label: 'tables:', badge: '2', isCollapsed: false, items: [
              {label: 'table1'}, {label: 'table2'}
              ]
          },
          {type: 'progress', color: 'danger', label: 'cpu', value: 50},
          {type: 'progress', color: 'danger', label: 'todo minmax', value: 30, min: 10, max: 200},
        ]
      },
      {
        // color: 'yellow',
        list: [
          {type: 'header', label: 'table 2', button: [
              {icon: 'fa fa-table btn btn-light btn-sm', routerLink: ['/data-table/2']},
              {icon: 'icon-list btn btn-light btn-sm', routerLink: ['/edit-columns/2']}
              ]
                },
          {type: 'collapsible', label: 'cols:', badge: '1', isCollapsed: true, items: [
              {label: 'column 1'}
            ]
          },
          {type: 'progress', color: 'danger', label: 'cpu', value: 20},
          {type: 'progress', color: 'danger', label: 'todo minmax', value: 180, min: 10, max: 200},
        ]
      },
      {
        // color: 'default',
        list: [
          {type: 'header', label: 'progress bars'},
          {type: 'progress', color: 'success', label: 'success', value: 20},
          {type: 'progress', color: 'info', label: 'info', value: 30},
          {type: 'progress', color: 'warning', label: 'warning', value: 40},
          {type: 'progress', color: 'danger', label: 'danger', value: 50}
        ]
      },
      {
        // color: 'default',
        list: [
          {type: 'header', label: 'dynamic color'},
          {type: 'progress', color: 'dynamic', label: 'dynamic', value: 20},
          {type: 'progress', color: 'dynamic', label: 'dynamic', value: 40},
          {type: 'progress', color: 'dynamic', label: 'dynamic', value: 55},
          {type: 'progress', color: 'dynamic', label: 'dynamic', value: 80},
          {type: 'progress', color: 'dynamic', label: 'dynamic', value: 749, min:0, max:1000},
          {type: 'progress', label: 'no-color', value: 49},
          {type: 'progress', color: 'black', label: 'black', value: 49},
        ]
      },
      {
        color: 'yellow',
        list: [
          {type: 'header', label: 'test yelllow'},
          {label: 'test yelllow'},
          {label: 'some information'},
          {label: 'more information'}
        ]
      }
    ]
  };
  dataAsString = JSON.stringify(this.data, null, 2);

  constructor(
    private _logic:LogicService,
    private _route: ActivatedRoute,
    private _router: Router,
    public _breadcrumb: BreadcrumbService
  ) { }

  ngOnInit() {
    // $('.collapse').collapse();
    this.mode = this._route.snapshot.paramMap.get('mode');
    this.routerId = this._route.snapshot.paramMap.get('id');
    this.getServiceData();

    this._route.params.subscribe(params => {
      this.mode = params['mode'];
      this.routerId = params['id'];
      this.getServiceData();
      this._breadcrumb.setActivatedRoute(this._route);
    });

  }

  ngOnDestroy() {
    this._breadcrumb.hide();
  }

  getServiceData() {
    if(this.mode === 'global'){
      this.data.items = this._logic.getGlobalData();
    } else if(this.mode === 'logic'){
      this.data.items = this._logic.getDatabases();
    } else if(this.mode === 'db'){
      this.data.items = this._logic.getSchemas(this.routerId);
    } else if(this.mode === 'schema'){
      this.data.items = this._logic.getTables(this.routerId);
    } else if(this.mode === 'table'){
      this.data.items = this._logic.getColumns(this.routerId);
    }
  }

  getCardClass(color) {
    let card = '';
    switch (color) {
      case 'blue':
          card = 'bg-primary';
          break;
      case 'light-blue':
        card = 'bg-info';
        break;
      case 'yellow':
        card = 'bg-warning';
        break;
      case 'red':
        card = 'bg-danger';
    }
    card = card + ' card';
    return card;
  }

}

