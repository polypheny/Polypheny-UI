import {Component, OnDestroy, OnInit, ViewEncapsulation} from '@angular/core';
import { LogicService } from '../../../services/logic.service';
import {ActivatedRoute, Router} from '@angular/router';
import {RenderGroup, RenderItem, RenderObj} from '../models';
import {BreadcrumbService} from '../../../components/breadcrumb/breadcrumb.service';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {InformationService} from '../../../services/information.service';

@Component({
  selector: 'app-global',
  templateUrl: './global.component.html',
  styleUrls: ['./global.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class GlobalComponent implements OnInit, OnDestroy {

  mode;
  routerId;

  data: RenderObj;
  //dataAsString = JSON.stringify(this.data, null, 2);

  constructor(
    private _logic:LogicService,
    private _information:InformationService,
    private _route: ActivatedRoute,
    private _router: Router,
    public _breadcrumb: BreadcrumbService,
    private _sidebar: LeftSidebarService
  ) {
    _sidebar.listInformationManagerPages();
  }

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
    
    this._information.onSocketEvent().subscribe(
      update => {
        const info:RenderItem = <RenderItem> update;
        if(this.data && this.data.groups[update.informationGroup]){
          this.data.groups[update.informationGroup].list[update.id] = info;
        }
      }
    );

  }

  ngOnDestroy() {
    this._breadcrumb.hide();
  }

  getServiceData() {
    if(this.mode === 'global'){
      //this.data.groups = this._logic.getGlobalData();
      this._information.getPage(this.routerId).subscribe(
        res => {
          this.data = <RenderObj>res;
        }
      );
    } else if(this.mode === 'logic'){
      //this.data.groups = this._logic.getDatabases();
      this.data.groups = new Map<string, RenderGroup>();
    } else if(this.mode === 'db'){
      //this.data.groups = this._logic.getSchemas(this.routerId);
      this.data.groups = new Map<string, RenderGroup>();
    } else if(this.mode === 'schema'){
      //this.data.groups = this._logic.getTables(this.routerId);
      this.data.groups = new Map<string, RenderGroup>();
    } else if(this.mode === 'table'){
      //this.data.groups = this._logic.getColumns(this.routerId);
      this.data.groups = new Map<string, RenderGroup>();
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
interface InformationPage{
  id: string;
  mansonry: boolean;
  name: string;
  groups: Map<String, RenderGroup>;
}
